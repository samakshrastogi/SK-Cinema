import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { api } from "@/api/axios"
import Topbar from "@/components/Topbar"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/context/AuthContext"
import UserAvatar from "@/components/UserAvatar"
import SharePopup from "@/components/SharePopup"

interface VideoDetail {
    id: number
    publicId: string
    title?: string
    aiTitle?: string
    aiDescription?: string
    signedUrl: string
    orientation?: "PORTRAIT" | "LANDSCAPE" | "SQUARE" | null
    thumbnailKey?: string
    channel?: {
        name?: string
        username?: string
    }
    uploaderName?: string
    uploaderAvatarUrl?: string
    uploaderAvatarKey?: string
    createdAt?: string
}

interface Comment {
    id: number
    commentText: string
    username: string
    channelName?: string
    createdAt: string
}

interface Playlist {
    id: number
    name: string
}

const PortraitPlayer = () => {
    const { publicId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [videos, setVideos] = useState<VideoDetail[]>([])
    const [loading, setLoading] = useState(true)
    const [activeIndex, setActiveIndex] = useState(0)

    const [likes, setLikes] = useState(0)
    const [dislikes, setDislikes] = useState(0)
    const [views, setViews] = useState(0)
    const [shares, setShares] = useState(0)
    const [subscribers, setSubscribers] = useState(0)
    const [subscribed, setSubscribed] = useState(false)
    const [liked, setLiked] = useState(false)
    const [disliked, setDisliked] = useState(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentInput, setCommentInput] = useState("")
    const [shouldScroll, setShouldScroll] = useState(false)

    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [showPlaylist, setShowPlaylist] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")
    const [showSharePopup, setShowSharePopup] = useState(false)

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const commentsRef = useRef<HTMLDivElement | null>(null)
    const wheelLockRef = useRef(false)
    const touchStartYRef = useRef<number | null>(null)
    const watchedBufferRef = useRef(0)
    const watchIntervalRef = useRef<number | null>(null)

    const activeVideo = videos[activeIndex]

    useEffect(() => {
        const loadFeed = async () => {
            try {
                const res = await api.get("/video/portrait")
                const data = Array.isArray(res.data?.data) ? (res.data.data as VideoDetail[]) : []
                setVideos(data)
            } catch (error) {
                console.error("Failed to load portrait feed", error)
                setVideos([])
            } finally {
                setLoading(false)
            }
        }

        loadFeed()
    }, [])

    useEffect(() => {
        if (!videos.length) return

        if (!publicId) {
            setActiveIndex(0)
            return
        }

        const index = videos.findIndex((v) => v.publicId === publicId)
        if (index >= 0) setActiveIndex(index)
    }, [videos, publicId])

    useEffect(() => {
        const active = videos[activeIndex]
        if (!active?.publicId) return
        navigate(`/portrait/${active.publicId}`, { replace: true })
    }, [activeIndex, videos, navigate])

    useEffect(() => {
        const el = videoRef.current
        if (!el) return

        el.currentTime = 0
        el.play().catch(() => undefined)
    }, [activeIndex])

    useEffect(() => {
        if (!activeVideo?.publicId) return
        void loadActions(activeVideo.publicId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVideo?.publicId])

    useEffect(() => {
        const loadPlaylists = async () => {
            try {
                const res = await api.get("/video-actions/playlists")
                setPlaylists(res.data || [])
            } catch (err) {
                console.error("Failed to load playlists", err)
            }
        }

        loadPlaylists()
    }, [])

    useEffect(() => {
        if (shouldScroll && commentsRef.current) {
            commentsRef.current.scrollTop = commentsRef.current.scrollHeight
            setShouldScroll(false)
        }
    }, [comments, shouldScroll])

    const loadActions = async (pid: string) => {
        try {
            const res = await api.get(`/video-actions/video/${pid}`)
            setLikes(res.data.likes || 0)
            setDislikes(res.data.dislikes || 0)
            setViews(res.data.views || 0)
            setShares(res.data.shares || 0)
            setSubscribers(res.data.subscribers || 0)
            setSubscribed(Boolean(res.data.subscribed))
            setComments(res.data.comments || [])
            setLiked(res.data.userReaction === "LIKE")
            setDisliked(res.data.userReaction === "DISLIKE")
        } catch (err) {
            console.error("Failed to load actions", err)
        }
    }

    const goNext = () => {
        setActiveIndex((prev) => Math.min(prev + 1, videos.length - 1))
    }

    const goPrev = () => {
        setActiveIndex((prev) => Math.max(prev - 1, 0))
    }

    const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (wheelLockRef.current) return
        if (Math.abs(e.deltaY) < 10) return

        wheelLockRef.current = true
        if (e.deltaY > 0) goNext()
        else goPrev()

        window.setTimeout(() => {
            wheelLockRef.current = false
        }, 300)
    }

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        touchStartYRef.current = e.changedTouches[0]?.clientY ?? null
    }

    const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartYRef.current === null) return

        const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current
        const deltaY = touchStartYRef.current - endY
        touchStartYRef.current = null

        if (Math.abs(deltaY) < 40) return
        if (deltaY > 0) goNext()
        else goPrev()
    }

    const timeAgo = (date?: string) => {
        if (!date) return "just now"

        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        const days = Math.floor(seconds / 86400)
        if (days > 0) return `${days} days ago`

        const hours = Math.floor(seconds / 3600)
        if (hours > 0) return `${hours} hours ago`

        const minutes = Math.floor(seconds / 60)
        if (minutes > 0) return `${minutes} minutes ago`

        return "just now"
    }

    const likeVideo = async () => {
        if (!activeVideo?.publicId) return

        await api.post("/video-actions/react", {
            publicId: activeVideo.publicId,
            type: "LIKE"
        })

        await loadActions(activeVideo.publicId)
    }

    const dislikeVideo = async () => {
        if (!activeVideo?.publicId) return

        await api.post("/video-actions/react", {
            publicId: activeVideo.publicId,
            type: "DISLIKE"
        })

        await loadActions(activeVideo.publicId)
    }

    const addVideoToPlaylist = async (playlistId: number) => {
        if (!activeVideo?.publicId) return

        await api.post("/video-actions/playlist", {
            publicId: activeVideo.publicId,
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
        if (!activeVideo?.publicId || !commentInput.trim()) return

        await api.post("/video-actions/comment", {
            publicId: activeVideo.publicId,
            text: commentInput
        })

        setCommentInput("")
        setShouldScroll(true)

        await loadActions(activeVideo.publicId)
    }

    const shareVideo = async (method = "COPY_LINK", targetUrl?: string) => {
        if (!activeVideo?.publicId) return
        const videoLink = `${window.location.origin}/portrait/${activeVideo.publicId}`

        if (method === "COPY_LINK") {
            try {
                await navigator.clipboard.writeText(videoLink)
            } catch (error) {
                console.error("Copy link failed", error)
            }
        } else if (method === "NATIVE" && "share" in navigator) {
            try {
                await navigator.share({
                    title: activeVideo.aiTitle || activeVideo.title,
                    url: videoLink
                })
            } catch (error) {
                console.error("Native share cancelled/failed", error)
            }
        } else if (targetUrl) {
            window.open(targetUrl, "_blank", "noopener,noreferrer")
        }

        await api.post("/video-actions/share", {
            publicId: activeVideo.publicId,
            method
        })
        await loadActions(activeVideo.publicId)
        setShowSharePopup(false)
    }

    const toggleSubscribe = async () => {
        if (!activeVideo?.publicId) return
        await api.post("/video-actions/subscribe", { publicId: activeVideo.publicId })
        await loadActions(activeVideo.publicId)
    }

    useEffect(() => {
        if (!activeVideo?.publicId) return
        api.post("/video-actions/view", { publicId: activeVideo.publicId }).then((res) => {
            if (typeof res.data?.views === "number") setViews(res.data.views)
        }).catch(() => undefined)
    }, [activeVideo?.publicId])

    useEffect(() => {
        if (!activeVideo?.publicId) return

        const flushWatch = async (forceSeconds?: number) => {
            const watchedSeconds = Math.floor(forceSeconds ?? watchedBufferRef.current)
            if (!watchedSeconds) return
            watchedBufferRef.current = 0

            await api.post("/video-actions/watch-progress", {
                publicId: activeVideo.publicId,
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
    }, [activeVideo?.publicId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                Loading...
            </div>
        )
    }

    if (!activeVideo) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                No portrait videos found.
            </div>
        )
    }

    const title = activeVideo.aiTitle || activeVideo.title || "Untitled"
    const description = activeVideo.aiDescription?.trim() || "No description available."

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">
            <Topbar />
            <Sidebar />

            <main className="pt-[80px] pb-24 px-3">
                <div className="max-w-[1380px] mx-auto grid lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)_120px] gap-6 items-start">
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
                        <h1 className="text-xl font-semibold leading-tight">{title}</h1>

                        <p className="text-sm text-gray-300 leading-6 whitespace-pre-wrap">
                            {description}
                        </p>

                        <div className="pt-2 flex items-center gap-3">
                            <UserAvatar
                                name={activeVideo.uploaderName || activeVideo.channel?.name}
                                avatarUrl={activeVideo.uploaderAvatarUrl}
                                avatarKey={activeVideo.uploaderAvatarKey}
                                alt={activeVideo.channel?.name || "Uploader"}
                            />

                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold">
                                        {activeVideo.channel?.name || "Unknown channel"}
                                    </p>
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
                                    {timeAgo(activeVideo.createdAt)} • {views.toLocaleString()} views
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={() => setShowSharePopup(true)}
                                className="px-3 py-2 rounded-lg text-sm border bg-white/10 border-white/10 hover:bg-white/15 transition"
                            >
                                ↗ Share {shares > 0 ? shares : ""}
                            </button>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <div
                            className="w-full max-w-[460px] mx-auto"
                            onWheel={onWheel}
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                        >
                            <div className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-black">
                                <video
                                    key={activeVideo.publicId}
                                    ref={videoRef}
                                    src={activeVideo.signedUrl}
                                    controls
                                    autoPlay
                                    playsInline
                                    controlsList="nodownload"
                                    onEnded={goNext}
                                    className="w-full h-[78vh] object-contain bg-black"
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-[920px]">
                            <h2 className="text-lg font-semibold mb-4">Comments</h2>

                            <div
                                ref={commentsRef}
                                className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1"
                            >
                                {comments.map((c) => {
                                    const isMine = c.username === user?.username
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
                    </section>

                    <aside className="bg-white/5 border border-white/10 rounded-2xl p-3 flex lg:flex-col gap-2 h-fit lg:sticky lg:top-24">
                        <button
                            onClick={likeVideo}
                            className={`px-4 py-3 rounded-xl text-sm border transition ${
                                liked
                                    ? "bg-green-600 border-green-500 text-white"
                                    : "bg-white/10 border-white/10 hover:bg-white/15"
                            }`}
                        >
                            👍 {likes}
                        </button>

                        <button
                            onClick={dislikeVideo}
                            className={`px-4 py-3 rounded-xl text-sm border transition ${
                                disliked
                                    ? "bg-red-600 border-red-500 text-white"
                                    : "bg-white/10 border-white/10 hover:bg-white/15"
                            }`}
                        >
                            👎 {dislikes}
                        </button>

                        <button
                            onClick={() => {
                                commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }}
                            className="px-4 py-3 rounded-xl text-sm border bg-white/10 border-white/10 hover:bg-white/15 transition"
                        >
                            💬 Comment
                        </button>

                        <button
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className="px-4 py-3 rounded-xl text-sm bg-purple-600 hover:bg-purple-700 transition"
                        >
                            ➕ Playlist
                        </button>

                        {showPlaylist && (
                            <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-3 min-w-[240px]">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Playlists</p>
                                    <span className="text-xs text-gray-400">{playlists.length}</span>
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {playlists.length === 0 && (
                                        <p className="text-xs text-gray-400">
                                            No playlist yet.
                                        </p>
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
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                createPlaylist()
                                            }
                                        }}
                                        placeholder="New playlist"
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
                    </aside>
                </div>
            </main>
            <SharePopup
                open={showSharePopup}
                onClose={() => setShowSharePopup(false)}
                onShare={shareVideo}
                videoUrl={`${window.location.origin}/portrait/${activeVideo.publicId}`}
            />
        </div>
    )
}

export default PortraitPlayer
