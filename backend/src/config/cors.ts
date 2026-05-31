import "./env"

const defaultAllowedOrigins = [
    "https://mediaflow.sk-hub.in",
    "https://mediaflow12.vercel.app"
]

const parseOrigins = (value?: string) =>
    (value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)

export const CLIENT_URL = process.env.CLIENT_URL || defaultAllowedOrigins[0]

export const allowedCorsOrigins = Array.from(
    new Set([
        CLIENT_URL,
        ...defaultAllowedOrigins,
        ...parseOrigins(process.env.CLIENT_URLS),
        ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS)
    ].filter(Boolean))
)

export const corsOrigin = (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
) => {
    if (!origin || allowedCorsOrigins.includes(origin)) {
        callback(null, true)
        return
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`))
}
