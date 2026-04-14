import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"

interface Video {
    id: number
    publicId?: string
    title?: string
    aiTitle?: string
    aiDescription?: string
    thumbnailKey?: string
    uploaderName?: string
    channel?: {
        name?: string
    }
}

interface Playlist {
    id: number
    name: string
    videos: Video[]
}

const PlaylistPage = () => {
    const navigate = useNavigate()

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
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
                    <h1 className="text-2xl md:text-3xl font-bold">My Playlists</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Organize saved videos and jump back quickly.
                    </p>
                </div>

                {loading && <p className="text-gray-400">Loading playlists...</p>}

                {!loading && playlists.length === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-gray-400">
                        You have not created any playlist yet.
                    </div>
                )}

                {playlists.map((playlist) => (
                    <section
                        key={playlist.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg md:text-xl font-semibold">{playlist.name}</h2>
                            <span className="text-xs text-gray-400">
                                {playlist.videos.length} videos
                            </span>
                        </div>

                        {playlist.videos.length === 0 ? (
                            <p className="text-sm text-gray-500">No videos in this playlist.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {playlist.videos.map((video) => {
                                    const id = video.publicId ?? String(video.id)
                                    const thumbnail = video.thumbnailKey
                                        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
                                        : "/placeholder-thumbnail.png"
                                    const title = video.aiTitle || video.title || "Untitled"
                                    const channelName =
                                        video.channel?.name || video.uploaderName || "Unknown channel"

                                    return (
                                        <button
                                            key={`${playlist.id}-${id}`}
                                            onClick={() => navigate(`/video/${id}`)}
                                            className="w-full text-left flex items-center gap-3 bg-black/25 hover:bg-black/35 transition rounded-xl p-2.5"
                                        >
                                            <img
                                                src={thumbnail}
                                                alt={title}
                                                className="w-[152px] h-[88px] rounded-lg object-cover shrink-0 border border-white/10"
                                                onError={(e) => {
                                                    ;(e.currentTarget as HTMLImageElement).src =
                                                        "/placeholder-thumbnail.png"
                                                }}
                                            />

                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-medium leading-5 line-clamp-2">
                                                    {title}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1 truncate">
                                                    {channelName}
                                                </p>
                                                {video.aiDescription && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                        {video.aiDescription}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </AppLayout>
    )
}

export default PlaylistPage
