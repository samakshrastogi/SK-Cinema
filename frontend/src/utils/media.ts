const prefetchedMediaUrls = new Set<string>()

export const prefetchMedia = (url?: string | null) => {
    if (!url || prefetchedMediaUrls.has(url) || typeof document === "undefined") return
    if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(hover: none), (pointer: coarse)").matches
    ) {
        return
    }

    const mediaUrl = new URL(url, window.location.href)
    if (mediaUrl.origin !== window.location.origin) return

    const link = document.createElement("link")
    link.rel = "prefetch"
    link.href = mediaUrl.href

    document.head.appendChild(link)
    prefetchedMediaUrls.add(mediaUrl.href)
}
