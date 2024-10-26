import {RequestParams, WorkerEnv} from "./types/ctx";
import {Context} from "hono";
import utils from "./utils";
// @ts-ignore
import path from 'node:path'
import {CfImageWorker} from "./image_worker";
import {DB} from "./d1/driver";
import fixed from "./fixed"
import {RpicsOptions} from "./types/image"


export default {
    async add(env: WorkerEnv, c: Context) {
        try {
            // pre
            const req = c.req
            const r2 = env.BUCKET
            const db = new DB(env.DB)
            // url info
            const {album} = req.param() as RequestParams
            if (album && album.includes(' ')) {
                throw new Error(`invalid album name: ${album}`)
            }
            // put image to bucket temp dir
            const rawBuffer = await req.arrayBuffer()
            const rawHash = await utils.hash_from_buffer(rawBuffer)
            let albums: string[] = []
            try {
                albums = await db.in_album(rawHash)
            } catch {
            }
            if (albums.length !== 0) {
                let contains = false
                albums.forEach((value) => {
                    if (value === album) {
                        contains = true
                    }
                })
                if (contains) {
                    return c.json({
                                      code: 2,
                                      msg: `the image already exists in albums: ${albums.join(' ')}`,
                                      hash: rawHash
                                  })
                }
                await db.add_album(rawHash, album)
                return c.json({
                                  code: 0,
                                  msg: `successfully add image to album: ${album}`,
                                  hash: rawHash
                              })
            }
            const rawR2Path = utils.trim_slash(path.join(env.BUCKET_PROC_CACHE, rawHash))
            await r2.put(rawR2Path, rawBuffer)
            // get image details
            const worker = new CfImageWorker(env)
            try {
                const metadata = await worker.meta(rawR2Path)
                const scale = (metadata.original.width / metadata.original.height) > 1 ? 'pc' : 'mobile'
                const imageType = metadata.original.format
                const basename = `${rawHash}.${utils.trim_mime(imageType)}`
                const imagePath = utils.trim_slash(path.join(env.BUCKET_IMAGE_PATH, basename))
                // put raw image
                await r2.put(imagePath, rawBuffer)
                await db.put({
                                 hash: rawHash,
                                 path: imagePath,
                                 album: album,
                                 size: 'raw',
                                 scale
                             })
                // put 2k webp
                const convResponse = await worker.transform(imagePath, {
                    ...utils.scale_to_pixel(scale, '2k'),
                    format: 'webp'
                })
                const mimeType = convResponse.headers.get('content-type') as string
                const ext = mimeType.replace('image/', '')
                const webpBase = `${rawHash}.${ext}`
                const webpPath = utils.trim_slash(path.join(env.BUCKET_CACHE_PATH, '2k', webpBase))
                await r2.put(webpPath, convResponse.body)
                await db.put({
                                 hash: rawHash,
                                 path: webpPath,
                                 album: album,
                                 size: '2k',
                                 scale,
                             })
                // async operation
                await r2.delete(rawR2Path)
                return c.json({
                                  code: 0,
                                  msg: 'success',
                                  hash: rawHash,
                                  image: metadata.original
                              })
            } catch (err: any) {
                return c.json({code: 1, msg: err.message})
            }
        } catch (err: any) {
            return c.json({code: 1, msg: `internal error: ${err.message}`})
        }
    },

    async rpics(env: WorkerEnv, c: Context) {
        // pre
        const db = new DB(env.DB)
        const r2 = env.BUCKET
        // get URL params
        const hash = c.req.param('hash')
        const album = c.req.param('album')
        const searchParams = utils.to_search_params(c.req.url)
        const rpicsOpts: RpicsOptions = {size: '2k'}
        searchParams.forEach((val, key) => {
            rpicsOpts[key] = val
        })
        try {
            utils.check_params(rpicsOpts)
            const rpicHash = hash ? hash : (await db.get_hash(album, rpicsOpts.scale, rpicsOpts.rid ? parseInt(rpicsOpts.rid) : null))
            if (!rpicHash) {
                throw new Error(`no matching images found in album: ${album}`)
            }
            const targetPath = await db.get_path(rpicHash, rpicsOpts.size)
            if (!targetPath) {
                const rawPath = await db.get_raw_path(rpicHash)
                if (!rawPath) {
                    throw new Error('internal server error: can get matched image path in database')
                }
                const targetSize = utils.scale_to_pixel(await db.get_scale(rpicHash), rpicsOpts.size as string)
                const worker = new CfImageWorker(env)
                const respImage = await worker.transform(rawPath, {
                    ...targetSize,
                    format: 'webp'
                })
                const realType = respImage.headers.get('content-type') as string
                const basename = `${rpicHash}.${realType.replace('image/', '')}`
                const clonedRespImage = respImage.clone()
                const r2Path = utils.trim_slash(path.join(env.BUCKET_CACHE_PATH, rpicsOpts.size, basename))
                // async operation
                await r2.put(r2Path, respImage.body)
                await db.put({
                                 hash: rpicHash,
                                 path: r2Path,
                                 album,
                                 size: rpicsOpts.size,
                             })
                // as resp
                return clonedRespImage
            }
            const r2Img = await r2.get(targetPath)
            if (!r2Img) {
                throw new Error('can not get image from bucket')
            }
            return c.body(r2Img.body, {
                headers: {
                    'content-type': fixed.consts.format[path.extname(targetPath).slice(1)]
                }
            })
        } catch (err: any) {
            return c.json({code: 1, msg: err.message})
        }
    },
    async delete(env: WorkerEnv, c: Context) {
        // pre
        const r2 = env.BUCKET
        const db = new DB(env.DB)
        // params
        const hash = c.req.param('hash')
        const album = c.req.param('album')
        try {
            if (album) {
                await db.delete(hash, album)
                const remained_albums = await db.in_album(hash)
                if (remained_albums.length !== 0) {
                    return c.json({
                                      code: 0,
                                      msg: 'delete successfully, but other albums still contain the image',
                                      remains: remained_albums
                                  },)
                }
            }
            const paths = await db.get_all_paths(hash)
            await db.delete(hash)
            for (let path of paths) {
                await r2.delete(path as string)
            }
            return c.json({
                              code: 0,
                              msg: `delete successfully, affected ${paths.length} files`
                          })
        } catch (err: any) {
            return c.json({
                              code: 1, msg: err.message
                          })
        }
    },
}

