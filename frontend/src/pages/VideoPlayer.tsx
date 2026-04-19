import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import { useAuth } from "@/context/AuthContext"
import UserAvatar from "@/components/UserAvatar"
import SharePopup from "@/components/SharePopup"

interface VideoDetail {
    id: string
    title: string
    aiTitle?: string
    aiDescription?: string
    signedUrl: string
    thumbnailKey?: string
    channel: {
        name: string
        username: string
    }
    uploaderAvatarKey?: string
    uploaderAvatarUrl?: string
    uploaderName?: string
    createdAt: string
    orientation?: "PORTRAIT" | "LANDSCAPE" | "SQUARE" | null
}

interface RelatedVideo {
    publicId: string
    title?: string
    aiTitle?: string
    aiDescription?: string
    thumbnailKey?: string
    channel?: {
        name?: string
    }
    uploaderName?: string
}

interface Comment {
    id: string
    commentText: string
    username: string
    channelName?: string
    createdAt: string
}

interface Playlist {
    id: string
    name: string
}

const VideoPlayer = () => {
    const { publicId } = useParams()
    const navigate = useNavigate()

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const commentsRef = useRef<HTMLDivElement | null>(null)

    const { user } = useAuth()
    const currentUsername = user?.username

    const [video, setVideo] = useState<VideoDetail | null>(null)
    const [related, setRelated] = useState<RelatedVideo[]>([])
    const [likes, setLikes] = useState(0)
    const [dislikes, setDislikes] = useState(0)
    const [views, setViews] = useState(0)
    const [shares, setShares] = useState(0)
    const [subscribers, setSubscribers] = useState(0)
    const [subscribed, setSubscribed] = useState(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentInput, setCommentInput] = useState("")
    const [liked, setLiked] = useState(false)
    const [disliked, setDisliked] = useState(false)

    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [showPlaylist, setShowPlaylist] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")
    const [showSharePopup, setShowSharePopup] = useState(false)

    const [shouldScroll, setShouldScroll] = useState(false)
    const watchedBufferRef = useRef(0)
    const watchIntervalRef = useRef<number | null>(null)

    const loadVideo = async () => {
        try {
            const res = await api.get(`/video/${publicId}`)

            if (!res.data?.success) return

            const videoData = res.data.data
            if (videoData?.orientation === "PORTRAIT") {
                navigate(`/portrait/${publicId}`, { replace: true })
                return
            }

            setVideo(videoData)

            const relatedRes = await api.get("/video")
            const allVideos = (relatedRes.data?.data || []) as RelatedVideo[]
            setRelated(allVideos.filter((v) => v.publicId !== publicId))
        } catch (error) {
            console.error("Video load error", error)
        }
    }

    const loadActions = async () => {
        const res = await api.get(`/video-actions/video/${publicId}`)

        setLikes(res.data.likes)
        setDislikes(res.data.dislikes)
        setViews(res.data.views || 0)
        setShares(res.data.shares || 0)
        setSubscribers(res.data.subscribers || 0)
        setSubscribed(Boolean(res.data.subscribed))
        setComments(res.data.comments)

        setLiked(res.data.userReaction === "LIKE")
        setDisliked(res.data.userReaction === "DISLIKE")
    }

    const loadPlaylists = async () => {
        const res = await api.get("/video-actions/playlists")
        setPlaylists(res.data)
    }

    const likeVideo = async () => {
        await api.post("/video-actions/react", {
            publicId,
            type: "LIKE"
        })
        loadActions()
    }

    const dislikeVideo = async () => {
        await api.post("/video-actions/react", {
            publicId,
            type: "DISLIKE"
        })
        loadActions()
    }

    const addVideoToPlaylist = async (playlistId: string) => {
        await api.post("/video-actions/playlist", {
            publicId,
            playlistId
        })
        setShowPlaylist(false)
    }

    const createPlaylist = async () => {
        if (!newPlaylistName.trim()) return

        const res = await api.post("/video-actions/playlists", {
            name: newPlaylistName
        })

        setPlaylists([res.data, ...playlists])
        setNewPlaylistName("")
    }

    const submitComment = async () => {
        if (!commentInput.trim()) return

        await api.post("/video-actions/comment", {
            publicId,
            text: commentInput
        })

        setCommentInput("")
        setShouldScroll(true)

        loadActions()
    }

    const shareVideo = async (method = "COPY_LINK", targetUrl?: string) => {
        if (!publicId || !video) return

        const videoLink = `${window.location.origin}/video/${publicId}`

        if (method === "COPY_LINK") {
            try {
                await navigator.clipboard.writeText(videoLink)
            } catch (error) {
                console.error("Copy link failed", error)
            }
        } else if (method === "NATIVE" && "share" in navigator) {
            try {
                await navigator.share({
                    title: video.aiTitle || video.title,
                    url: videoLink
                })
            } catch (error) {
                console.error("Native share cancelled/failed", error)
            }
        } else if (targetUrl) {
            window.open(targetUrl, "_blank", "noopener,noreferrer")
        }

        await api.post("/video-actions/share", { publicId, method })
        loadActions()
        setShowSharePopup(false)
    }

    const toggleSubscribe = async () => {
        if (!publicId) return

        await api.post("/video-actions/subscribe", { publicId })
        loadActions()
    }

    const handleEnded = () => {
        if (related.length > 0) {
            navigate(`/video/${related[0].publicId}`)
        }
    }

    const timeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)

        const days = Math.floor(seconds / 86400)
        if (days > 0) return `${days} days ago`

        const hours = Math.floor(seconds / 3600)
        if (hours > 0) return `${hours} hours ago`

        const minutes = Math.floor(seconds / 60)
        if (minutes > 0) return `${minutes} minutes ago`

        return "just now"
    }

    useEffect(() => {
        if (!publicId) return
        loadVideo()
        loadActions()
        loadPlaylists()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicId])

    useEffect(() => {
        if (shouldScroll && commentsRef.current) {
            commentsRef.current.scrollTop = commentsRef.current.scrollHeight
            setShouldScroll(false)
        }
    }, [comments, shouldScroll])

    useEffect(() => {
        if (!publicId) return
        api.post("/video-actions/view", { publicId }).then((res) => {
            if (typeof res.data?.views === "number") setViews(res.data.views)
        }).catch(() => undefined)
    }, [publicId])

    useEffect(() => {
        if (!publicId) return

        const flushWatch = async (forceSeconds?: number) => {
            const watchedSeconds = Math.floor(forceSeconds ?? watchedBufferRef.current)
            if (!watchedSeconds) return
            watchedBufferRef.current = 0

            await api.post("/video-actions/watch-progress", {
                publicId,
                watchedSeconds,
                currentPositionSeconds: Math.floor(videoRef.current?.currentTime || 0)
            }).catch(() => undefined)
        }

        const startWatchTicker = () => {
            if (watchIntervalRef.current !== null) return
            watchIntervalRef.current = window.setInterval(() => {
                if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return
                watchedBufferRef.current += 1
                if (watchedBufferRef.current >= 5) {
                    void flushWatch()
                }
            }, 1000)
        }

        const stopWatchTicker = () => {
            if (watchIntervalRef.current !== null) {
                window.clearInterval(watchIntervalRef.current)
                watchIntervalRef.current = null
            }
            void flushWatch()
        }

        const el = videoRef.current
        if (!el) return

        el.addEventListener("play", startWatchTicker)
        el.addEventListener("pause", stopWatchTicker)
        el.addEventListener("ended", stopWatchTicker)

        return () => {
            el.removeEventListener("play", startWatchTicker)
            el.removeEventListener("pause", stopWatchTicker)
            el.removeEventListener("ended", stopWatchTicker)
            stopWatchTicker()
        }
    }, [publicId])

    if (!video) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        )
    }

    const description = video.aiDescription?.trim() || "No description available."
    const upNext = related.slice(0, 8)
    const recommended = related.slice(8, 16)

    return (
        <AppLayout>
            <div className="max-w-[1380px] mx-auto grid lg:grid-cols-[minmax(0,1fr)_390px] gap-6">
                <div className="space-y-5">
                    <div className="bg-black rounded-2xl overflow-hidden border border-white/10 shadow-xl max-w-[920px]">
                        <div className="w-full aspect-video max-h-[520px]">
                            <video
                                ref={videoRef}
                                src={video.signedUrl}
                                controls
                                autoPlay
                                controlsList="nodownload"
                                onEnded={handleEnded}
                                className="w-full h-full object-contain bg-black"
                            />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 max-w-[920px]">
                        <h1 className="text-xl md:text-2xl font-semibold leading-tight">
                            {video.aiTitle || video.title}
                        </h1>

                        <p className="text-sm text-gray-300 leading-6 line-clamp-4">
                            {description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    name={video.uploaderName || video.channel.name}
                                    avatarUrl={video.uploaderAvatarUrl}
                                    avatarKey={video.uploaderAvatarKey}
                                    alt={video.channel.name}
                                />

                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold">{video.channel.name}</p>
                                        <button
                                            onClick={toggleSubscribe}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                                                subscribed
                                                    ? "bg-white text-black border-white"
                                                    : "bg-purple-600 border-purple-500 text-white"
                                            }`}
                                        >
                                            {subscribed ? "Subscribed" : "Subscribe"} {subscribers > 0 ? subscribers : ""}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {timeAgo(video.createdAt)} • {views.toLocaleString()} views
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={likeVideo}
                                    className={`px-4 py-2 rounded-xl text-sm border transition ${
                                        liked
                                            ? "bg-green-600 border-green-500 text-white"
                                            : "bg-white/10 border-white/10 hover:bg-white/15"
                                    }`}
                                >
                                    👍 {likes}
                                </button>

                                <button
                                    onClick={dislikeVideo}
                                    className={`px-4 py-2 rounded-xl text-sm border transition ${
                                        disliked
                                            ? "bg-red-600 border-red-500 text-white"
                                            : "bg-white/10 border-white/10 hover:bg-white/15"
                                    }`}
                                >
                                    👎 {dislikes}
                                </button>

                                <button
                                    onClick={() => setShowSharePopup(true)}
                                    className="px-4 py-2 rounded-xl text-sm border bg-white/10 border-white/10 hover:bg-white/15 transition"
                                >
                                    ↗ Share {shares > 0 ? shares : ""}
                                </button>

                                <button
                                    onClick={() => setShowPlaylist(!showPlaylist)}
                                    className="px-4 py-2 rounded-xl text-sm bg-purple-600 hover:bg-purple-700 transition"
                                >
                                    Save to Playlist
                                </button>
                            </div>
                        </div>

                        {showPlaylist && (
                            <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Select Playlist</p>
                                    <span className="text-xs text-gray-400">{playlists.length} total</span>
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {playlists.length === 0 && (
                                        <p className="text-xs text-gray-400">No playlist yet. Create one below.</p>
                                    )}

                                    {playlists.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => addVideoToPlaylist(p.id)}
                                            className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm"
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <input
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        placeholder="Create new playlist"
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                                    />

                                    <button
                                        onClick={createPlaylist}
                                        className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg text-sm"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-[920px]">
                        <h2 className="text-lg font-semibold mb-4">Comments</h2>

                        <div
                            ref={commentsRef}
                            className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1"
                        >
                            {comments.map((c) => {
                                const isMine = c.username === currentUsername
                                const commenterLabel = c.channelName || c.username || "Unknown channel"

                                return (
                                    <div
                                        key={c.id}
                                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[82%] px-3 py-2.5 rounded-xl text-sm shadow-sm ${
                                                isMine ? "bg-purple-600 text-white" : "bg-black/40"
                                            }`}
                                        >
                                            <div className="text-xs text-gray-300 mb-1 flex gap-2 items-center">
                                                <span className="font-medium">{commenterLabel}</span>
                                                <span>•</span>
                                                <span>{timeAgo(c.createdAt)}</span>
                                            </div>
                                            {c.commentText}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex gap-2 mt-4">
                            <input
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        submitComment()
                                    }
                                }}
                                placeholder="Write a comment..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                            />

                            <button
                                onClick={submitComment}
                                className="bg-purple-600 hover:bg-purple-700 px-4 rounded-xl text-sm"
                            >
                                Comment
                            </button>
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
                    <RightRailSection
                        title="Up Next"
                        videos={upNext}
                        onOpen={(id) => navigate(`/video/${id}`)}
                    />

                    <RightRailSection
                        title="Recommended"
                        videos={recommended}
                        onOpen={(id) => navigate(`/video/${id}`)}
                    />
                </aside>
            </div>
            <SharePopup
                open={showSharePopup}
                onClose={() => setShowSharePopup(false)}
                onShare={shareVideo}
                videoUrl={`${window.location.origin}/video/${publicId}`}
            />
        </AppLayout>
    )
}

const RightRailSection = ({
    title,
    videos,
    onOpen
}: {
    title: string
    videos: RelatedVideo[]
    onOpen: (id: string) => void
}) => {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h2 className="text-base font-semibold mb-3">{title}</h2>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {videos.map((item) => {
                    const thumb = item.thumbnailKey
                        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${item.thumbnailKey}`
                        : "/placeholder-thumbnail.png"
                    const name = item.channel?.name || item.uploaderName || "Unknown channel"

                    return (
                        <button
                            key={item.publicId}
                            onClick={() => onOpen(item.publicId)}
                            className="w-full text-left flex gap-3 rounded-xl p-2.5 hover:bg-black/35 transition"
                        >
                            <img
                                src={thumb}
                                alt={item.aiTitle || item.title || "Video thumbnail"}
                                className="w-[136px] h-[76px] rounded-lg object-cover shrink-0 border border-white/10"
                                onError={(e) => {
                                    ;(e.currentTarget as HTMLImageElement).src = "/placeholder-thumbnail.png"
                                }}
                            />

                            <div className="min-w-0 pt-0.5">
                                <p className="text-sm font-medium leading-5 line-clamp-2">
                                    {item.aiTitle || item.title || "Untitled"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 truncate">{name}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default VideoPlayer
