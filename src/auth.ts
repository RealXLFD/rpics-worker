import {WorkerEnv} from "./types/ctx";
import {HonoRequest} from "hono";

const auth = (env: WorkerEnv, req: HonoRequest): boolean => {
    const query = (new URL(req.url)).searchParams
    return env.TOKEN === req.header().token || env.TOKEN === query.get('key')
}

export {auth}