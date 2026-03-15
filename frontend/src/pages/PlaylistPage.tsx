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

interface Playlist {
    id: number
    name: string
    videos: Video[]
}

const PlaylistPage = () => {

    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {

        const fetchPlaylists = async () => {

            try {

                const res = await api.get("/video-actions/playlists-with-videos")

                setPlaylists(res.data)

            } catch (error) {

                console.error("Playlist fetch error:", error)

            } finally {

                setLoading(false)

            }

        }

        fetchPlaylists()

    }, [])

    return (

        <AppLayout>

            <div className="space-y-10">

                <h1 className="text-3xl font-bold">
                    📁 My Playlists
                </h1>

                {loading && (
                    <p className="text-gray-400">Loading playlists...</p>
                )}

                {!loading && playlists.length === 0 && (
                    <p className="text-gray-400">
                        You haven't created any playlists yet.
                    </p>
                )}

                {playlists.map((playlist) => (

                    <div key={playlist.id} className="space-y-4">

                        <h2 className="text-xl font-semibold">
                            {playlist.name}
                        </h2>

                        {playlist.videos.length === 0 ? (

                            <p className="text-gray-500 text-sm">
                                No videos in this playlist
                            </p>

                        ) : (

                            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                                {playlist.videos.map((video) => (
                                    <VideoCard key={video.id} video={video} />
                                ))}

                            </div>

                        )}

                    </div>

                ))}

            </div>

        </AppLayout>

    )
}

export default PlaylistPage