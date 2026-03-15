import { useEffect, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import VideoCard from "@/components/VideoCard"

interface Video {
    id: number
    title: string
    aiTitle?: string
    thumbnailKey?: string
}

const FavouritesPage = () => {

    const [videos, setVideos] = useState<Video[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {

        const fetchFavorites = async () => {
            try {

                const res = await api.get("/video-actions/favorites")

                setVideos(res.data)

            } catch (err) {

                console.error(err)

            } finally {

                setLoading(false)

            }
        }

        fetchFavorites()

    }, [])

    return (

        <AppLayout>

            <div className="space-y-6">

                <h1 className="text-3xl font-bold">
                    ❤️ Favourite Videos
                </h1>

                {loading ? (

                    <div className="text-gray-400">
                        Loading favourite videos...
                    </div>

                ) : videos.length === 0 ? (

                    <div className="text-gray-400">
                        You haven't liked any videos yet.
                    </div>

                ) : (

                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}

                    </div>

                )}

            </div>

        </AppLayout>
    )
}

export default FavouritesPage