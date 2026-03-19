import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import { useAuth } from "@/context/AuthContext"

interface VideoDetail {
    id: number
    title: string
    aiTitle?: string
    aiDescription?: string
    signedUrl: string
    thumbnailKey?: string
    channel: {
        name: string
        username: string
    }
    createdAt: string
}

interface RelatedVideo {
    id: number
    title: string
    aiTitle?: string
    thumbnailKey: string
}

interface Comment {
    id: number
    commentText: string
    username: string
    createdAt: string
}

interface Playlist {
    id: number
    name: string
}

const VideoPlayer = () => {

    const { id } = useParams()
    const navigate = useNavigate()

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const commentsRef = useRef<HTMLDivElement | null>(null)

    const { user } = useAuth()
    const currentUsername = user?.username

    const [video, setVideo] = useState<VideoDetail | null>(null)
    const [related, setRelated] = useState<RelatedVideo[]>([])
    const [likes, setLikes] = useState(0)
    const [dislikes, setDislikes] = useState(0)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentInput, setCommentInput] = useState("")
    const [liked, setLiked] = useState(false)
    const [disliked, setDisliked] = useState(false)

    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [showPlaylist, setShowPlaylist] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")

    const [shouldScroll, setShouldScroll] = useState(false)

    useEffect(() => {
        if (!id) return
        loadVideo()
        loadActions()
        loadPlaylists()
    }, [id])

    useEffect(() => {
        if (shouldScroll && commentsRef.current) {
            commentsRef.current.scrollTop = commentsRef.current.scrollHeight
            setShouldScroll(false)
        }
    }, [comments])

    const loadVideo = async () => {

        try {

            const res = await api.get(`/video/${id}`)

            if (!res.data?.success) {
                console.error("Video not found")
                return
            }

            const videoData = res.data.data

            setVideo(videoData)

            const relatedRes = await api.get("/video")

            const allVideos = relatedRes.data?.data || []

            setRelated(
                allVideos.filter((v: any) => v.id !== Number(id))
            )

        } catch (error) {

            console.error("Video load error", error)

        }

    }
    
    const loadActions = async () => {

        const res = await api.get(`/video-actions/video/${id}`)

        setLikes(res.data.likes)
        setDislikes(res.data.dislikes)
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
            videoId: id,
            type: "LIKE"
        })
        loadActions()
    }

    const dislikeVideo = async () => {
        await api.post("/video-actions/react", {
            videoId: id,
            type: "DISLIKE"
        })
        loadActions()
    }

    const addVideoToPlaylist = async (playlistId: number) => {
        await api.post("/video-actions/playlist", {
            videoId: id,
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
            videoId: id,
            text: commentInput
        })

        setCommentInput("")
        setShouldScroll(true)

        loadActions()
    }

    const handleEnded = () => {
        if (related.length > 0) {
            navigate(`/video/${related[0].id}`)
        }
    }

    const timeAgo = (date: string) => {

        const seconds = Math.floor(
            (Date.now() - new Date(date).getTime()) / 1000
        )

        const days = Math.floor(seconds / 86400)
        if (days > 0) return `${days} days ago`

        const hours = Math.floor(seconds / 3600)
        if (hours > 0) return `${hours} hours ago`

        const minutes = Math.floor(seconds / 60)
        return `${minutes} minutes ago`
    }

    if (!video) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        )
    }

    return (

        <AppLayout>

            <div className="grid lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto">

                {/* LEFT SIDE */}

                <div className="lg:col-span-3 flex flex-col gap-6">

                    {/* VIDEO */}

                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video">

                        <video
                            ref={videoRef}
                            src={video.signedUrl}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            onEnded={handleEnded}
                            className="w-full h-full object-contain"
                        />

                    </div>

                    {/* VIDEO INFO */}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">

                        <h1 className="text-xl font-semibold">
                            {video.aiTitle || video.title}
                        </h1>

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                                    {video.channel.name[0]}
                                </div>

                                <div>
                                    <p className="text-sm font-medium">
                                        {video.channel.name}
                                    </p>

                                    <p className="text-xs text-gray-400">
                                        {timeAgo(video.createdAt)}
                                    </p>
                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                <button
                                    onClick={likeVideo}
                                    className={`px-4 py-1 rounded-lg text-sm ${liked ? "bg-green-600 text-white" : "bg-white/10"
                                        }`}
                                >
                                    👍 {likes}
                                </button>

                                <button
                                    onClick={dislikeVideo}
                                    className={`px-4 py-1 rounded-lg text-sm ${disliked ? "bg-red-600 text-white" : "bg-white/10"
                                        }`}
                                >
                                    👎 {dislikes}
                                </button>

                                <button
                                    onClick={() => setShowPlaylist(!showPlaylist)}
                                    className="px-4 py-1 rounded-lg text-sm bg-purple-600"
                                >
                                    ➕ Playlist
                                </button>

                            </div>

                        </div>

                        {showPlaylist && (

                            <div className="bg-black/60 p-3 rounded-lg space-y-2">

                                {playlists.map((p) => (

                                    <div
                                        key={p.id}
                                        onClick={() => addVideoToPlaylist(p.id)}
                                        className="cursor-pointer hover:bg-white/10 p-2 rounded"
                                    >
                                        {p.name}
                                    </div>

                                ))}

                                <div className="flex gap-2 pt-2">

                                    <input
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        placeholder="New playlist"
                                        className="flex-1 bg-black/40 px-2 py-1 rounded"
                                    />

                                    <button
                                        onClick={createPlaylist}
                                        className="bg-purple-600 px-3 rounded"
                                    >
                                        Create
                                    </button>

                                </div>

                            </div>

                        )}

                    </div>

                    {/* COMMENTS */}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

                        <h2 className="text-lg font-semibold mb-4">
                            Comments
                        </h2>

                        <div
                            ref={commentsRef}
                            className="flex flex-col gap-3 max-h-[320px] overflow-y-auto"
                        >

                            {comments.map((c) => {

                                const isMine = c.username === currentUsername

                                return (

                                    <div
                                        key={c.id}
                                        className={`flex ${isMine ? "justify-end" : "justify-start"
                                            }`}
                                    >

                                        <div
                                            className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${isMine
                                                ? "bg-purple-600 text-white"
                                                : "bg-black/40"
                                                }`}
                                        >

                                            <div className="text-xs text-gray-300 mb-1 flex gap-2">
                                                <span>{c.username}</span>
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
                                placeholder="Write a comment..."
                                className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-sm outline-none"
                            />

                            <button
                                onClick={submitComment}
                                className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg text-sm"
                            >
                                Comment
                            </button>

                        </div>

                    </div>

                </div>

                {/* RIGHT SIDE */}

                <div className="flex flex-col gap-6 sticky top-24 h-fit">

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">

                        <h2 className="text-lg font-semibold mb-3">
                            Up Next
                        </h2>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto">

                            {related.slice(0, 8).map((item) => (

                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/video/${item.id}`)}
                                    className="flex gap-2 cursor-pointer hover:bg-black/40 p-2 rounded-lg"
                                >

                                    <img
                                        src={
                                            item.thumbnailKey
                                                ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${item.thumbnailKey}`
                                                : "/placeholder-thumbnail.png"
                                        }
                                    />

                                    <p className="text-sm font-medium line-clamp-2">
                                        {item.aiTitle || item.title}
                                    </p>

                                </div>

                            ))}

                        </div>

                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">

                        <h2 className="text-lg font-semibold mb-3">
                            Recommended
                        </h2>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto">

                            {related.slice(8, 16).map((item) => (

                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/video/${item.id}`)}
                                    className="flex gap-2 cursor-pointer hover:bg-black/40 p-2 rounded-lg"
                                >

                                    <img
                                        src={
                                            item.thumbnailKey
                                                ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${item.thumbnailKey}`
                                                : "/placeholder-thumbnail.png"
                                        }
                                    />

                                    <p className="text-sm font-medium line-clamp-2">
                                        {item.aiTitle || item.title}
                                    </p>

                                </div>

                            ))}

                        </div>

                    </div>

                </div>

            </div>

        </AppLayout>

    )

}

export default VideoPlayer