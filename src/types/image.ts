export type ImageOptions = {
    width?: number
    height?: number
    format?: string,
    quality?: number,
}


export class CfImageOpts {
    data: ImageOptions

    constructor(data: ImageOptions) {
        this.data = data
    }

    join(data: ImageOptions) {
        Object.assign(this.data, data)
    }

    raw() {
        return this.data
    }

    toString(): string {
        const operations = new Array<string>
        Object.entries(this.data).map(([method, value]) => {
            if (value) operations.push(`${method}=${value.toString()}`)
        })
        return operations.join(',')
    }
}

export interface RpicsOptions extends Record<string, string | undefined> {
    scale?: string,
    size: string,
    rid?: string,
}

export interface ImageMeta {
    width: number;
    height: number;
    original: OriginalMeta;
}

export interface OriginalMeta {
    file_size: number;
    width: number;
    height: number;
    format: string;
}

export interface ImageSize {
    width?: number,
    height?: number
}