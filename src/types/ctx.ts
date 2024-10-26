import {D1Database, R2Bucket} from "@cloudflare/workers-types";

export interface WorkerEnv extends Record<string, unknown> {
    BUCKET_BASE: string,
    TOKEN: string,
    BUCKET_IMAGE_PATH: string,
    BUCKET_CACHE_PATH: string,
    BUCKET_PROC_CACHE: string,
    BUCKET: R2Bucket,
    DB: D1Database,
}

export type RequestParams = Record<string, string>