import { useEffect, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import VideoCard, { Video } from "@/components/VideoCard"

const PortraitPage = () => {
    const [videos, setVideos] = useState<Video[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPortraitVideos = async () => {
            try {
                const res = await api.get("/video/portrait")
                const data = Array.isArray(res.data?.data) ? res.data.data : []
                setVideos(data)
            } catch (error) {
                console.error("Failed to load portrait videos", error)
                setVideos([])
            } finally {
                setLoading(false)
            }
        }

        fetchPortraitVideos()
    }, [])

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Portrait Videos</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Watch vertical content in portrait mode player.
                    </p>
                </div>

                {loading ? (
                    <div className="text-gray-300">Loading...</div>
                ) : videos.length === 0 ? (
                    <div className="text-gray-400">No portrait videos found.</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {videos.map((video, index) => (
                            <div key={video.publicId || `portrait-${index}`}>
                                <VideoCard video={video} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

export default PortraitPage
