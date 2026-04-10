import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import VideoCard from "@/components/VideoCard"
import { useAuth } from "@/context/AuthContext"

/* ---------------- TYPES ---------------- */

interface User {
    id: number
    name?: string
    avatarUrl?: string
    avatarKey?: string
    createdAt?: string
}

interface Stats {
    videos: number
    playlists: number
    favorites: number
}

interface Video {
    publicId: string
    title?: string
    aiTitle?: string
    thumbnailKey?: string
}

interface Playlist {
    id: number
    name: string
    videos: Video[]
}

interface RawVideo {
    publicId: string
    title?: string
    aiTitle?: string
    thumbnailKey?: string
}

interface RawPlaylist {
    id: number
    name: string
    videos: RawVideo[]
}
interface EditModalProps {
    name: string
    setName: (v: string) => void
    channelName: string
    setChannelName: (v: string) => void
    description: string
    setDescription: (v: string) => void
    onClose: () => void
    onSave: () => void
}

/* ---------------- COMPONENT ---------------- */

const ProfilePage = () => {
    const navigate = useNavigate()
    const { updateUser } = useAuth()

    const [user, setUser] = useState<User | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)

    const [publicVideos, setPublicVideos] = useState<Video[]>([])
    const [privateVideos, setPrivateVideos] = useState<Video[]>([])
    const [history, setHistory] = useState<Video[]>([])
    const [favorites, setFavorites] = useState<Video[]>([])
    const [playlists, setPlaylists] = useState<Playlist[]>([])

    const [loading, setLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)

    const [activeTab, setActiveTab] = useState<
        "history" | "publicVideos" | "privateVideos" | "favorites" | "playlists"
    >("history")

    const [name, setName] = useState("")
    const [channelName, setChannelName] = useState("")
    const [description, setDescription] = useState("")

    /* ---------------- HELPERS ---------------- */

    const normalizeVideos = (arr: RawVideo[]): Video[] => {
        if (!Array.isArray(arr)) return []

        return arr.map(v => ({
            publicId: v.publicId,   // ✅ FIX
            title: v.title || v.aiTitle || "Untitled",
            aiTitle: v.aiTitle ?? undefined,
            thumbnailKey: v.thumbnailKey
        }))
    }

    /* ---------------- FETCH ---------------- */

    const fetchProfile = async () => {
        try {
            const res = await api.get("/user/me")
            const data = res.data?.data || {}

            setUser(data.user || null)
            updateUser(data.user || null)

            setStats(data.stats || null)

            setHistory(normalizeVideos(data.history))
            setFavorites(normalizeVideos(data.favorites))

            // 🔥 parallel API calls (faster)
            if (data.channel?.id) {
                const [publicRes, privateRes] = await Promise.all([
                    api.get(`/video/channel/${data.channel.id}/public`),
                    api.get(`/video/channel/${data.channel.id}/private`)
                ])

                setPublicVideos(normalizeVideos(publicRes.data.data))
                setPrivateVideos(normalizeVideos(privateRes.data.data))
            }

            const playlistData: Playlist[] = Array.isArray(data.playlists)
                ? data.playlists.map((p: RawPlaylist) => ({
                    id: p.id,
                    name: p.name,
                    videos: normalizeVideos(p.videos)
                }))
                : []

            setPlaylists(playlistData)

            setName(data.user?.name || "")
            setChannelName(data.channel?.name || "")
            setDescription(data.channel?.description || "")

        } catch (err) {
            console.error("Profile fetch error:", err)
        } finally {
            setLoading(false)
        }
    }

    /* ✅ RUN ONLY ONCE */
    useEffect(() => {
        fetchProfile()
    }, [])

    /* ---------------- SAVE ---------------- */

    const saveProfile = async () => {
        try {
            await api.patch("/user/profile", {
                name,
                channelName,
                description
            })

            await fetchProfile()
            setEditOpen(false)

        } catch (err) {
            console.error("Profile update failed", err)
        }
    }

    /* ---------------- AVATAR ---------------- */

    const uploadAvatar = async (file: File) => {
        try {
            const uploadRes = await api.post("/user/avatar-upload-url", {
                fileType: file.type
            })

            const { uploadUrl, key } = uploadRes.data

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            })

            await api.post("/user/avatar", { key })
            await fetchProfile()

        } catch (err) {
            console.error("Avatar upload failed", err)
        }
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="animate-pulse h-40 bg-gray-800 rounded-xl" />
            </AppLayout>
        )
    }

    const avatarSrc =
        user?.avatarUrl ||
        (user?.avatarKey
            ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${user.avatarKey}`
            : null)

    const joinedYear = user?.createdAt
        ? new Date(user.createdAt).getFullYear()
        : "—"

    /* ---------------- UI ---------------- */

    return (
        <AppLayout>

            <div className="space-y-5 pb-6">

                {/* BANNER */}
                <div className="relative h-37.5 sm:h-50 md:h-65 rounded-xl overflow-hidden">
                    <img
                        src="https://i.pinimg.com/originals/4f/de/0e/4fde0ed05a14d7f6c1a0b19daec5a731.jpg"
                        alt="Profile banner"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* PROFILE */}
                <div className="-mt-12 sm:-mt-16 px-4 sm:px-6 flex flex-col gap-4 relative z-10">

                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-4">

                            <label className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-black overflow-hidden cursor-pointer shrink-0">

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) uploadAvatar(file)
                                    }}
                                />

                                {avatarSrc ? (
                                    <img
                                        src={avatarSrc}
                                        alt={user?.name || "User avatar"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="flex items-center justify-center h-full">
                                        {user?.name?.[0] || "U"}
                                    </span>
                                )}

                            </label>

                            <div>
                                <h1 className="text-lg sm:text-2xl font-bold">
                                    {user?.name || "User"}
                                </h1>

                                <p className="text-gray-400 text-xs sm:text-sm">
                                    Member since {joinedYear}
                                </p>
                            </div>

                        </div>

                        <button
                            onClick={() => setEditOpen(true)}
                            className="bg-white text-black px-4 py-2 rounded-full text-sm"
                        >
                            Edit
                        </button>

                    </div>

                    {/* STATS */}
                    <div className="flex justify-between sm:justify-start sm:gap-6 text-sm text-gray-300">

                        <Stat label="Uploads" value={stats?.videos || 0} />
                        <Stat label="Favorites" value={stats?.favorites || 0} />
                        <Stat label="Playlists" value={stats?.playlists || 0} />

                    </div>

                </div>

                {/* TABS */}
                <div className="px-4 sm:px-6 flex gap-2 overflow-x-auto">
                    <Pill label="Continue Watching" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
                    <Pill label="Public" active={activeTab === "publicVideos"} onClick={() => setActiveTab("publicVideos")} />
                    <Pill label="Private" active={activeTab === "privateVideos"} onClick={() => setActiveTab("privateVideos")} />                    <Pill label="Favorites" active={activeTab === "favorites"} onClick={() => setActiveTab("favorites")} />
                    <Pill label="Playlists" active={activeTab === "playlists"} onClick={() => setActiveTab("playlists")} />
                </div>

                {/* CONTENT */}
                <div className="px-4 sm:px-6">

                    {(activeTab === "publicVideos" || activeTab === "privateVideos") && (
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-semibold">Your Uploads</h2>

                            <button
                                onClick={() => navigate("/upload")}
                                className="bg-purple-600 px-4 py-2 rounded-lg text-sm"
                            >
                                + Upload
                            </button>
                        </div>
                    )}

                    {activeTab === "playlists"
                        ? <PlaylistSection playlists={playlists} />
                        : <VideoRow videos={
                            activeTab === "history" ? history :
                                activeTab === "publicVideos" ? publicVideos :
                                    activeTab === "privateVideos" ? privateVideos :
                                        favorites
                        } />
                    }

                </div>

            </div>

            {editOpen && (
                <EditModal
                    name={name}
                    setName={setName}
                    channelName={channelName}
                    setChannelName={setChannelName}
                    description={description}
                    setDescription={setDescription}
                    onClose={() => setEditOpen(false)}
                    onSave={saveProfile}
                />
            )}

        </AppLayout>
    )
}

/* ---------------- SMALL COMPONENTS ---------------- */

const Stat = ({ label, value }: { label: string, value: number }) => (
    <div>
        <p className="font-bold">{value}</p>
        <p className="text-gray-400 text-xs">{label}</p>
    </div>
)

const VideoRow = ({ videos }: { videos: Video[] }) => {
    if (!videos.length) return <p className="text-gray-500">No content</p>

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {videos.map(v => (
                <VideoCard key={v.publicId} video={v} />
            ))}
        </div>
    )
}

const PlaylistSection = ({ playlists }: { playlists: Playlist[] }) => {
    if (!playlists.length) return <p>No playlists</p>

    return (
        <div className="space-y-6">
            {playlists.map(p => (
                <div key={p.id}>
                    <h2 className="font-semibold mb-2">{p.name}</h2>
                    <VideoRow videos={p.videos} />
                </div>
            ))}
        </div>
    )
}

const Pill = ({ label, active, onClick }: {
    label: string
    active: boolean
    onClick: () => void
}) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs ${active ? "bg-white text-black" : "bg-gray-800 text-gray-300"}`}
    >
        {label}
    </button>
)

const EditModal = ({
    name,
    setName,
    channelName,
    setChannelName,
    description,
    setDescription,
    onClose,
    onSave
}: EditModalProps) => (
    <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
        onClick={onClose}
    >
        <div
            className="bg-[#111] p-6 rounded-xl w-full max-w-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
        >
            <h2 className="text-xl font-semibold">
                Edit Profile
            </h2>

            {/* NAME */}
            <div className="space-y-1">
                <label className="text-sm text-gray-400">Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    aria-label="Name"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            {/* CHANNEL NAME */}
            <div className="space-y-1">
                <label className="text-sm text-gray-400">Channel Name</label>
                <input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    aria-label="Channel Name"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-1">
                <label className="text-sm text-gray-400">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell something about your channel"
                    aria-label="Description"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 rounded text-sm"
                >
                    Cancel
                </button>

                <button
                    onClick={onSave}
                    className="px-4 py-2 bg-purple-600 rounded text-sm"
                >
                    Save
                </button>
            </div>

        </div>
    </div>
)
export default ProfilePage