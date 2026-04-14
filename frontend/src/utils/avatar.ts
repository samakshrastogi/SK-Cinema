export const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

interface AvatarSourceInput {
    avatarUrl?: string | null
    avatarKey?: string | null
}

export const getAvatarSrc = ({ avatarUrl, avatarKey }: AvatarSourceInput) => {
    if (avatarUrl) return avatarUrl
    if (!avatarKey) return null
    if (avatarKey.startsWith("http")) return avatarKey
    return `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${encodeURI(avatarKey)}`
}
