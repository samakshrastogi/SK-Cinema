const pageCache = new Map<string, { value: unknown; expiresAt: number }>()
const STORAGE_PREFIX = "mediaflow:page-cache:"

const getUserScope = () => {
    if (typeof window === "undefined") return "anonymous"
    try {
        const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user")
        const user = rawUser ? JSON.parse(rawUser) as { id?: string } : null
        return user?.id || "anonymous"
    } catch {
        return "anonymous"
    }
}

const getStorageKey = (key: string) => STORAGE_PREFIX + getUserScope() + ":" + key

export const getCachedPageData = <T>(key: string) => {
    const storageKey = getStorageKey(key)
    const memoryEntry = pageCache.get(storageKey)
    if (memoryEntry && Date.now() <= memoryEntry.expiresAt) {
        return memoryEntry.value as T
    }

    pageCache.delete(storageKey)
    if (typeof window === "undefined") return null

    try {
        const rawEntry = localStorage.getItem(storageKey)
        if (!rawEntry) return null
        const entry = JSON.parse(rawEntry) as { value: T; expiresAt: number }
        if (!entry?.expiresAt || Date.now() > entry.expiresAt) {
            localStorage.removeItem(storageKey)
            return null
        }
        pageCache.set(storageKey, entry)
        return entry.value
    } catch {
        localStorage.removeItem(storageKey)
        return null
    }
}

export const setCachedPageData = <T>(key: string, value: T, ttlMs = 60000) => {
    const storageKey = getStorageKey(key)
    const entry = {
        value,
        expiresAt: Date.now() + ttlMs
    }
    pageCache.set(storageKey, entry)
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch {
        // Memory caching remains available when browser storage is full or disabled.
    }
}