const size: Record<string, number> = {
    '4k': 3840,
    '2k': 2560,
    '1080p': 1080,
    '720p': 720,
    '480p': 480
}

const format: Record<string, string> = {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    avif: 'image/avif',
}

const scale: Record<string, boolean> = {
    pc: true,
    mobile: false,
}

const allowed_param_signs: string[] = ['?', '#', '!', '@']

export default {
    consts: {
        cf_image_cgi: '/cdn-cgi/image/',
        param_signs: allowed_param_signs,
        format
    },
    resp: {
        auth_failed: {code: 1, msg: "auth failed: please provide a valid token"}
    },
    image: {
        size,
        scale
    }
}