/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_SOCKET_URL: string
    readonly VITE_CLOUDFRONT_DOMAIN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}