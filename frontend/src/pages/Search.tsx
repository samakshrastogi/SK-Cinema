import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import VideoCard, { Video } from "@/components/VideoCard"

const SearchPage = () => {
    const [params] = useSearchParams()
    const q = (params.get("q") || "").trim()

    const [results, setResults] = useState<Video[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const run = async () => {
            if (!q) {
                setResults([])
                return
            }

            try {
                setLoading(true)
                const res = await api.get("/video/search", { params: { q } })
                const data = Array.isArray(res.data?.data) ? res.data.data : []
                setResults(data)
            } catch (error) {
                console.error("Search failed", error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }

        run()
    }, [q])

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Search</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {q ? `Results for "${q}"` : "Type in the top search bar to find videos"}
                    </p>
                </div>

                {loading && (
                    <div className="text-gray-300">Searching...</div>
                )}

                {!loading && q && results.length === 0 && (
                    <div className="text-gray-400">No videos matched your search.</div>
                )}

                {!loading && results.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {results.map((video, index) => (
                            <div key={video.publicId || `search-${index}`}>
                                <VideoCard video={video} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

export default SearchPage
