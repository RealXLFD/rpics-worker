import {ImageSize, RpicsOptions} from "./types/image";
import fixed from "./fixed"

export default {
    async hash_from_buffer(data: ArrayBuffer) {
        const rawHash = await crypto.subtle.digest({
                                                       name: 'MD5'
                                                   }, data)
        const hashArray = Array.from(new Uint8Array(rawHash))
        return hashArray
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
    },
    trim_slash(path: string) {
        return path.startsWith('/') ? path.slice(1) : path
    },
    trim_mime(mime: string) {
        return mime.replace('image/', '')
    },
    scale_to_pixel(scale: string, size: string): ImageSize {
        const pixels = fixed.image.size[size]
        if (!pixels) {
            throw new Error(`invalid size: ${size}`)
        }
        const isPc = fixed.image.scale[scale]
        return isPc ? {width: pixels} : {height: pixels}
    },
    to_search_params(url: string) {
        for (let sign of fixed.consts.param_signs) {
            const index = url.lastIndexOf(sign)
            if (index != -1) {
                return new URLSearchParams(url.slice(index + 1))
            }
        }
        return new URLSearchParams()
    },
    check_params(opts: RpicsOptions) {
        if (opts.format && !fixed.image.format[String(opts.format)]) {
            throw new Error(`invalid format value: ${opts.format}`)
        }
        if (opts.size && !fixed.image.size[String(opts.size)]) {
            throw new Error(`invalid size value: ${opts.size}`)
        }
        if (opts.scale && !fixed.image.scale[String(opts.scale)]) {
            throw new Error(`invalid scale value: ${opts.scale}`)
        }
        if (opts.rid && isNaN(parseInt(opts.rid))) {
            throw new Error(`invalid rid value: ${opts.rid}`)
        }
    },
}