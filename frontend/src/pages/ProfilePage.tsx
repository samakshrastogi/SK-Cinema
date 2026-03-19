import { useEffect, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import VideoCard from "@/components/VideoCard"
import { useAuth } from "@/context/AuthContext"

interface User {
    id: number
    email: string
    username: string
    name?: string
    avatarUrl?: string
    avatarKey?: string
    createdAt?: string
}

interface Stats {
    videos: number
    playlists: number
    favorites: number
    comments: number
}

interface Video {
    id: number
    title: string
    aiTitle?: string
    thumbnailKey?: string
}

interface Activity {
    type: string
    title: string
    createdAt: string
}

const ProfilePage = () => {

    const { updateUser } = useAuth()

    const [user, setUser] = useState<User | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [videos, setVideos] = useState<Video[]>([])
    const [history, setHistory] = useState<Video[]>([])
    const [activity, setActivity] = useState<Activity[]>([])
    const [aiInsights, setAiInsights] = useState<string[]>([])

    const [loading, setLoading] = useState(true)

    const [editOpen, setEditOpen] = useState(false)

    const [name, setName] = useState("")
    const [channelName, setChannelName] = useState("")
    const [description, setDescription] = useState("")

    /* ---------------- FETCH PROFILE ---------------- */
    const fetchProfile = async () => {

        try {

            const res = await api.get("/user/me")
            const data = res.data.data

            setUser(data.user)
            updateUser(data.user)
            setStats(data.stats)
            setVideos(data.uploadedVideos)
            setHistory(data.history)
            setActivity(data.activity || [])
            setAiInsights(data.aiInsights || [])

            setName(data.user?.name || "")
            setChannelName(data.channel?.name || "")
            setDescription(data.channel?.description || "")

        } catch (error) {

            console.error("Profile fetch error:", error)

        } finally {

            setLoading(false)

        }

    }
    useEffect(() => {
        fetchProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* ---------------- SAVE PROFILE ---------------- */

    const saveProfile = async () => {

        try {

            await api.patch("/user/profile", {
                name,
                channelName,
                description
            })

            await fetchProfile()

            setEditOpen(false)

        } catch (error) {

            console.error("Profile update failed", error)

        }

    }

    /* ---------------- AVATAR UPLOAD ---------------- */

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

    /* ---------------- LOADING ---------------- */

    if (loading) {
        return (
            <AppLayout>
                <p className="text-gray-400">Loading profile...</p>
            </AppLayout>
        )
    }

    /* ---------------- AVATAR URL ---------------- */

    const avatarSrc =
        user?.avatarUrl ||
        (user?.avatarKey?.startsWith("http")
            ? user.avatarKey
            : user?.avatarKey
                ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${user.avatarKey}`
                : null)

    /* ---------------- UI ---------------- */

    return (

        <AppLayout>

            <div className="space-y-10">

                {/* PROFILE HEADER */}

                <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex items-center justify-between">

                    <div className="flex items-center gap-6">

                        <label className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer">

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
                                    loading="lazy"
                                    alt="User avatar"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                />

                            ) : (

                                user?.name?.[0]?.toLowerCase()

                            )}

                        </label>

                        <div>

                            <h1 className="text-3xl font-bold">
                                {user?.name}
                            </h1>

                            <p className="text-gray-400">
                                Joined {user?.createdAt && new Date(user.createdAt).toLocaleDateString()}
                            </p>

                        </div>

                    </div>

                    <button
                        onClick={() => setEditOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"
                    >
                        Edit Profile
                    </button>

                </div>

                {/* STATS */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

                    <StatCard label="Videos" value={stats?.videos || 0} />
                    <StatCard label="Playlists" value={stats?.playlists || 0} />
                    <StatCard label="Favorites" value={stats?.favorites || 0} />
                    <StatCard label="Comments" value={stats?.comments || 0} />

                </div>

                {/* AI INSIGHTS */}

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">

                    <h2 className="text-xl font-semibold mb-4">
                        🤖 AI Insights
                    </h2>

                    {aiInsights.length === 0 ? (
                        <p className="text-gray-400">No AI insights yet</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {aiInsights.map((tag, i) => (
                                <span
                                    key={i}
                                    className="bg-purple-600 px-3 py-1 rounded-full text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                </div>

                {/* UPLOADED VIDEOS */}

                <Section title="🎥 Uploaded Videos">
                    {videos.length === 0
                        ? <p className="text-gray-400">No uploaded videos</p>
                        : <VideoGrid videos={videos} />
                    }
                </Section>

                {/* WATCH HISTORY */}

                <Section title="🕘 Watch History">
                    {history.length === 0
                        ? <p className="text-gray-400">No watch history</p>
                        : <VideoGrid videos={history} />
                    }
                </Section>

                {/* ACTIVITY */}

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">

                    <h2 className="text-xl font-semibold mb-4">
                        📜 Recent Activity
                    </h2>

                    <div className="space-y-3">

                        {activity.map((a, i) => (

                            <div key={i} className="text-sm text-gray-300">

                                {a.type} — {a.title}

                                <span className="text-gray-500 ml-2">
                                    {new Date(a.createdAt).toLocaleDateString()}
                                </span>

                            </div>

                        ))}

                    </div>

                </div>

                {/* EDIT PROFILE MODAL */}

                {editOpen && (

                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

                        <div className="bg-gray-900 p-6 rounded-xl w-[400px] space-y-4">

                            <h2 className="text-xl font-semibold">
                                Edit Profile
                            </h2>

                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-800 p-2 rounded"
                                placeholder="Name"
                            />

                            <input
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                className="w-full bg-gray-800 p-2 rounded"
                                placeholder="Channel Name"
                            />

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-gray-800 p-2 rounded"
                                placeholder="Description"
                            />

                            <div className="flex justify-end gap-3">

                                <button
                                    onClick={() => setEditOpen(false)}
                                    className="px-4 py-2 bg-gray-700 rounded"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={saveProfile}
                                    className="px-4 py-2 bg-purple-600 rounded"
                                >
                                    Save
                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </AppLayout>

    )

}

/* ---------------- VIDEO GRID ---------------- */

const VideoGrid = ({ videos }: { videos: Video[] }) => (

    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
        ))}
    </div>

)

/* ---------------- SECTION ---------------- */

type SectionProps = {
    title: string
    children: React.ReactNode
}

const Section = ({ title, children }: SectionProps) => (

    <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {children}
    </div>

)

/* ---------------- STAT CARD ---------------- */

const StatCard = ({ label, value }: { label: string, value: number }) => (

    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
    </div>

)

export default ProfilePage