import {D1Database} from '@cloudflare/workers-types'
import {SQL} from './SQL'

import {ImageData} from "../types/sql";

export class DB {
    db: D1Database

    constructor(db: D1Database) {
        this.db = db
    }

    async init() {
        try {
            await this.db.prepare(SQL.create.img).run()
            await this.db.prepare(SQL.create.album).run()
            await this.db.prepare(SQL.create.img_data).run()
            await this.db.prepare(SQL.create.img_date_index).run()
            await this.db.prepare(SQL.create.album_index).run()
            return true
        } catch {
            return false
        }
    }

    async put({
                  hash,
                  path,
                  album,
                  size,
                  scale,
              }: ImageData) {
        const db = this.db
        for (let i = 0; i < 2; i++) {
            try {
                const date = getCurrentTimeStamp()
                if (scale)
                    await db.prepare(SQL.fixed.put_img).bind(hash, scale, date).run()
                if (album)
                    await db.prepare(SQL.fixed.bind_img_album).bind(hash, album).run()
                await db.prepare(SQL.fixed.put_img_data).bind(hash, path, size).run()
                return true
            } catch {
                await this.init()
            }
        }
        return false
    }

    async add_album(hash: string, album: string) {
        const db = this.db
        await db.prepare(SQL.fixed.bind_img_album).bind(hash, album).run()
    }

    async get_scale(hash: string): Promise<string> {
        const scale = await this.db.prepare(SQL.fixed.get_img_scale).bind(hash).first('Scale')
        if (!scale) {
            throw new Error("database error: can not get the scale of the image")
        }
        return scale as string
    }

    async get_hash(album: string | null, scale: string | undefined, rid: number | null): Promise<string | null> {
        const db = this.db
        if (rid) {
            return getByRid(db, rid, album, scale)
        }
        let query: string
        if (album && scale) {
            query = SQL.i_a_hash + SQL.by_album_scale + SQL.o_by_rand
        } else if (album) {
            query = SQL.a_hash + SQL.by_album + SQL.o_by_rand
        } else if (scale) {
            query = SQL.i_hash + SQL.by_scale + SQL.o_by_rand
        } else {
            query = SQL.i_hash + SQL.o_by_rand
        }
        return getHash(db, query, album, scale)
    }

    async get_path(hash: string, size: string): Promise<string | null> {
        return await this.db.prepare(SQL.fixed.get_img_path).bind(hash, size).first('Path')
    }

    async get_raw_path(hash: string): Promise<string | null> {
        return await this.db.prepare(SQL.fixed.get_raw_img_path).bind(hash, 'raw').first('Path')
    }

    async get_all_paths(hash: string): Promise<unknown[]> {
        const paths = (await this.db.prepare(SQL.fixed.get_all_paths).bind(hash).all()).results
        const result = new Array<unknown>
        paths.forEach((val) => {
            result.push(val['Path'])
        })

        return result
    }

    async delete(hash: string, album?: string) {
        if (album) {
            await this.db.prepare(SQL.fixed.del_album).bind(hash, album).run()
            return
        }
        await this.db.prepare(SQL.fixed.del_files[0]).bind(hash).run()
        await this.db.prepare(SQL.fixed.del_files[1]).bind(hash).run()
        await this.db.prepare(SQL.fixed.del_files[2]).bind(hash).run()
    }

    async in_album(hash: string): Promise<string[]> {
        const results = (await this.db.prepare(SQL.fixed.a_contains).bind(hash).all()).results
        const albums = new Array<string>
        results.forEach((value) => {
            albums.push(value['Album'] as string)
        })
        return albums
    }
}

const getCurrentTimeStamp = (): number => {
    const now = new Date()
    const year = String(now.getFullYear()).slice(-2)
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
    return parseInt(`${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`)
}

const getByRid = async (db: D1Database, rid: number, album: string | null, scale: string | null | undefined) => {
    let countQuery: string, hashQuery: string
    if (album && scale) {
        countQuery = SQL.i_a_count + SQL.by_album_scale
        hashQuery = SQL.i_a_hash + SQL.by_album_scale + SQL.o_by_date
    } else if (album) {
        countQuery = SQL.i_a_count + SQL.by_album
        hashQuery = SQL.i_a_hash + SQL.by_album + SQL.o_by_date
    } else if (scale) {
        countQuery = SQL.i_a_count + SQL.by_scale
        hashQuery = SQL.i_hash + SQL.by_scale + SQL.o_by_date
    } else {
        countQuery = SQL.i_a_count
        hashQuery = SQL.i_hash + SQL.o_by_date
    }
    const count = await getCount(db, countQuery, album, scale)
    return getHash(db, hashQuery, album, scale, rid % count);
}

const getHash = async (db: D1Database, query: string, ...bindings: unknown[]): Promise<string | null> => {
    const args = new Array<unknown>
    for (let b of bindings) {
        if (b)
            args.push(b)
    }
    return await db.prepare(query).bind(...args).first('Hash')
}

const getCount = async (db: D1Database, query: string, ...bindings: unknown[]): Promise<number> => {
    const args = new Array<unknown>
    for (let b of bindings) {
        if (b)
            args.push(b)
    }
    const count = await db.prepare(query).bind(...args).first('count')
    if (!count) {
        throw new Error("database error")
    }
    return count as number
}

