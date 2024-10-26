import {CfImageOpts, ImageMeta, ImageOptions} from "./types/image";
import {WorkerEnv} from "./types/ctx";
import urlJoin from "url-join";
import fixed from "./fixed"


export class CfImageWorker {
    env: WorkerEnv

    constructor(env: WorkerEnv) {
        this.env = env
    }

    async meta(path: string) {
        const target = get_query_path(this.env.BUCKET_BASE, path, new CfImageOpts({format: 'json'}))
        const resp = await fetch(target)
        if (resp.status !== 200)
            throw new Error(`invalid image`)
        return await resp.json() as ImageMeta
    }

    async transform(path: string, opts: ImageOptions) {
        const target = get_query_path(this.env.BUCKET_BASE, path, new CfImageOpts(opts))
        // @ts-ignore
        const resp = await fetch(target)
        if (resp.status !== 200) throw new Error(`invalid image`)
        return resp
    }
}

const get_query_path = (base: string, url: string, opts: CfImageOpts) => {
    return urlJoin(base, fixed.consts.cf_image_cgi, opts.toString(), url)
}
