import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import VideoCard from "@/components/VideoCard"
import { useAuth } from "@/context/AuthContext"
import UserAvatar from "@/components/UserAvatar"
import SpritesheetPicker from "@/components/SpritesheetPicker"

interface User {
    id: number
    name?: string
    avatarUrl?: string
    avatarKey?: string
    coverUrl?: string
    coverKey?: string
    email?: string
    platformAdmin?: boolean
    createdAt?: string
}

interface Stats {
    videos: number
    playlists: number
    favorites: number
}

interface Video {
    id?: number
    publicId: string
    title?: string
    aiTitle?: string
    aiDescription?: string
    thumbnailKey?: string
    uploaderAvatarKey?: string
    uploaderAvatarUrl?: string
    uploaderName?: string
    createdAt?: string
    channel?: {
        name?: string
    }
}

interface RawVideo {
    id?: number
    publicId: string
    title?: string
    aiTitle?: string
    aiDescription?: string
    thumbnailKey?: string
    uploaderAvatarKey?: string
    uploaderAvatarUrl?: string
    uploaderName?: string
    createdAt?: string
    channel?: {
        name?: string
    }
}

interface SpritesheetData {
    spritesheetUrl: string
    frameWidth: number
    frameHeight: number
    cols: number
    rows: number
    totalFrames: number
    intervalSec: number
}

interface EditModalProps {
    userName?: string
    avatarUrl?: string
    avatarKey?: string
    coverUrl?: string
    name: string
    setName: (v: string) => void
    channelName: string
    setChannelName: (v: string) => void
    description: string
    setDescription: (v: string) => void
    onAvatarChange: (file: File) => void
    onCoverChange: (file: File) => void
    onClose: () => void
    onSave: () => void
}

const ProfilePage = () => {
    const navigate = useNavigate()
    const { updateUser, user: authUser } = useAuth()

    const [user, setUser] = useState<User | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)

    const [publicVideos, setPublicVideos] = useState<Video[]>([])
    const [privateVideos, setPrivateVideos] = useState<Video[]>([])
    const [organizationVideos, setOrganizationVideos] = useState<Video[]>([])
    const [history, setHistory] = useState<Video[]>([])

    const [loading, setLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)

    const [activeTab, setActiveTab] = useState<"history" | "uploads">("history")
    const [uploadVisibility, setUploadVisibility] = useState<"public" | "private" | "organization">("public")

    const [name, setName] = useState("")
    const [channelName, setChannelName] = useState("")
    const [description, setDescription] = useState("")

    const [message, setMessage] = useState("")

    const [editingVideo, setEditingVideo] = useState<Video | null>(null)
    const [videoTitle, setVideoTitle] = useState("")
    const [videoDescription, setVideoDescription] = useState("")
    const [videoThumbnailKey, setVideoThumbnailKey] = useState<string | undefined>(undefined)
    const [videoThumbnailPreview, setVideoThumbnailPreview] = useState<string | undefined>(undefined)
    const [videoSpritesheet, setVideoSpritesheet] = useState<SpritesheetData | null>(null)
    const [selectedSpriteFrameIndex, setSelectedSpriteFrameIndex] = useState<number | null>(null)
    const [savingVideo, setSavingVideo] = useState(false)
    const [savingSprite, setSavingSprite] = useState(false)

    const normalizeVideos = (arr: RawVideo[]): Video[] => {
        if (!Array.isArray(arr)) return []

        return arr.map(v => ({
            id: v.id,
            publicId: v.publicId,
            title: v.title || v.aiTitle || "Untitled",
            aiTitle: v.aiTitle ?? undefined,
            aiDescription: v.aiDescription ?? undefined,
            thumbnailKey: v.thumbnailKey,
            uploaderAvatarKey: v.uploaderAvatarKey ?? undefined,
            uploaderAvatarUrl: v.uploaderAvatarUrl ?? undefined,
            uploaderName: v.uploaderName ?? undefined,
            createdAt: v.createdAt ?? undefined,
            channel: v.channel ?? undefined
        }))
    }

    const fetchProfile = async () => {
        try {
            const res = await api.get("/user/me")
            const data = res.data?.data || {}

            setUser(data.user || null)
            updateUser(data.user || null)

            setStats(data.stats || null)
            setHistory(normalizeVideos(data.history))

            if (data.channel?.id) {
                const [publicRes, privateRes, orgRes] = await Promise.all([
                    api.get(`/video/channel/${data.channel.id}/public`),
                    api.get(`/video/channel/${data.channel.id}/private`),
                    api.get(`/video/channel/${data.channel.id}/organization`)
                ])

                setPublicVideos(normalizeVideos(publicRes.data.data))
                setPrivateVideos(normalizeVideos(privateRes.data.data))
                setOrganizationVideos(normalizeVideos(orgRes.data.data))
            }

            setName(data.user?.name || "")
            setChannelName(data.channel?.name || "")
            setDescription(data.channel?.description || "")

        } catch (err) {
            console.error("Profile fetch error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    const saveProfile = async () => {
        try {
            await api.patch("/user/profile", {
                name,
                channelName,
                channelTitle: channelName,
                description,
                channelDescription: description
            })

            await fetchProfile()
            setEditOpen(false)
            setMessage("Profile updated.")
        } catch (err) {
            console.error("Profile update failed", err)
            setMessage("Failed to update profile.")
        }
    }

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
            setMessage("Avatar updated.")
        } catch (err) {
            console.error("Avatar upload failed", err)
            setMessage("Failed to update avatar.")
        }
    }

    const uploadCover = async (file: File) => {
        try {
            const uploadRes = await api.post("/user/cover-upload-url", {
                fileType: file.type
            })

            const { uploadUrl, key } = uploadRes.data

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            })

            await api.post("/user/cover", { key })
            await fetchProfile()
            setMessage("Cover photo updated.")
        } catch (err) {
            console.error("Cover upload failed", err)
            setMessage("Failed to update cover photo.")
        }
    }

    const openVideoEditor = async (video: Video) => {
        setEditingVideo(video)
        setVideoTitle(video.title || "")
        setVideoDescription(video.aiDescription || "")
        setVideoThumbnailKey(video.thumbnailKey)
        setVideoThumbnailPreview(
            video.thumbnailKey
                ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
                : undefined
        )
        setVideoSpritesheet(null)
        setSelectedSpriteFrameIndex(null)

        if (video.id) {
            try {
                const res = await api.get(`/video/upload/${video.id}/spritesheet`)
                setVideoSpritesheet(res.data?.data || null)
            } catch (err) {
                console.error("Spritesheet load failed", err)
            }
        }
    }

    const handleUploadVideoThumbnail = async (file?: File) => {
        if (!file) return

        try {
            const thumbPresignRes = await api.post("/video/upload/thumbnail-presign", {
                fileName: file.name,
                fileType: file.type
            })

            const { uploadUrl, key } = thumbPresignRes.data.data

            await axios.put(uploadUrl, file, {
                headers: { "Content-Type": file.type }
            })

            setVideoThumbnailKey(key)
            setVideoThumbnailPreview(URL.createObjectURL(file))
        } catch (err) {
            console.error("Thumbnail upload failed", err)
            setMessage("Failed to upload thumbnail.")
        }
    }

    const saveSpriteSelectionAsThumbnail = async () => {
        if (!editingVideo?.id || selectedSpriteFrameIndex === null) return

        try {
            setSavingSprite(true)
            const res = await api.post(
                `/video/upload/${editingVideo.id}/spritesheet/select-thumbnail`,
                { frameIndex: selectedSpriteFrameIndex }
            )

            const data = res.data?.data
            setVideoThumbnailKey(data?.thumbnailKey)
            if (data?.thumbnailUrl) {
                setVideoThumbnailPreview(data.thumbnailUrl)
            }
        } catch (err) {
            console.error("Save sprite thumbnail failed", err)
            setMessage("Failed to save spritesheet thumbnail.")
        } finally {
            setSavingSprite(false)
        }
    }

    const saveVideoEdit = async () => {
        if (!editingVideo?.publicId) return

        try {
            setSavingVideo(true)
            await api.patch(`/video/${editingVideo.publicId}`, {
                title: videoTitle,
                description: videoDescription,
                thumbnailKey: videoThumbnailKey
            })

            await fetchProfile()
            setEditingVideo(null)
            setMessage("Video updated.")
        } catch (err) {
            console.error("Failed to update video", err)
            setMessage("Failed to update video.")
        } finally {
            setSavingVideo(false)
        }
    }

    const uploadVideos = useMemo(() => {
        if (uploadVisibility === "private") return privateVideos
        if (uploadVisibility === "organization") return organizationVideos
        return publicVideos
    }, [uploadVisibility, publicVideos, privateVideos, organizationVideos])

    const availableUploadTabs = useMemo(() => {
        const tabs: { key: "public" | "private" | "organization"; label: string }[] = []
        if (publicVideos.length > 0) tabs.push({ key: "public", label: "Public" })
        if (privateVideos.length > 0) tabs.push({ key: "private", label: "Private" })
        if (organizationVideos.length > 0) tabs.push({ key: "organization", label: "Organization" })
        if (tabs.length === 0) tabs.push({ key: "public", label: "Public" })
        return tabs
    }, [publicVideos.length, privateVideos.length, organizationVideos.length])

    useEffect(() => {
        if (!availableUploadTabs.find((t) => t.key === uploadVisibility)) {
            setUploadVisibility(availableUploadTabs[0].key)
        }
    }, [availableUploadTabs, uploadVisibility])

    if (loading) {
        return (
            <AppLayout>
                <div className="animate-pulse h-40 bg-gray-800 rounded-xl" />
            </AppLayout>
        )
    }

    const joinedYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : "—"

    return (
        <AppLayout>
            <div className="space-y-5 pb-6">
                <div className="relative h-37.5 sm:h-50 md:h-65 rounded-xl overflow-hidden">
                    <img
                        src={user?.coverUrl || "https://i.pinimg.com/originals/4f/de/0e/4fde0ed05a14d7f6c1a0b19daec5a731.jpg"}
                        alt="Profile banner"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="-mt-12 sm:-mt-16 px-4 sm:px-6 flex flex-col gap-4 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <label className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 border-black/80 overflow-hidden cursor-pointer shrink-0 bg-black/20">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) uploadAvatar(file)
                                    }}
                                />

                                <UserAvatar
                                    name={user?.name}
                                    avatarUrl={user?.avatarUrl}
                                    avatarKey={user?.avatarKey}
                                    alt={user?.name || "User avatar"}
                                    className="w-full h-full sm:w-full sm:h-full text-lg sm:text-2xl"
                                />
                            </label>

                            <div>
                                <h1 className="text-lg sm:text-2xl font-bold">{user?.name || "User"}</h1>
                                <p className="text-gray-400 text-xs sm:text-sm">Member since {joinedYear}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setEditOpen(true)}
                            className="bg-white text-black px-4 py-2 rounded-full text-sm"
                        >
                            Edit
                        </button>
                    </div>

                    <div className="flex justify-between sm:justify-start sm:gap-6 text-sm text-gray-300">
                        <Stat label="Uploads" value={stats?.videos || 0} />
                        <Stat label="Favorites" value={stats?.favorites || 0} />
                        <Stat label="Playlists" value={stats?.playlists || 0} />
                    </div>
                </div>

                {message && (
                    <div className="px-4 sm:px-6">
                        <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-sm text-gray-100">
                            {message}
                        </div>
                    </div>
                )}

                <div className="px-4 sm:px-6 flex flex-wrap gap-2">
                    <Pill label="Continue Watching" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
                    <Pill label="Upload" active={activeTab === "uploads"} onClick={() => setActiveTab("uploads")} />
                    <button
                        onClick={() => navigate("/organization")}
                        className="px-3 py-1.5 rounded-full text-xs bg-gray-800 text-gray-300"
                    >
                        Organization
                    </button>
                    {(authUser?.email === "samakshrastogi885@gmail.com" || authUser?.platformAdmin) && (
                        <button
                            onClick={() => navigate("/admin")}
                            className="px-3 py-1.5 rounded-full text-xs bg-gray-800 text-gray-300"
                        >
                            Admin Dashboard
                        </button>
                    )}
                </div>

                <div className="px-4 sm:px-6">
                    {activeTab === "uploads" && (
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold">Upload</h2>
                                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                                    {availableUploadTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setUploadVisibility(tab.key)}
                                            className={`px-3 py-1.5 rounded-md text-xs ${uploadVisibility === tab.key ? "bg-white text-black" : "text-gray-300"}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate("/upload")}
                                className="bg-purple-600 px-4 py-2 rounded-lg text-sm"
                            >
                                + Upload
                            </button>
                        </div>
                    )}

                    {activeTab === "history" ? (
                        <VideoGrid videos={history} />
                    ) : (
                        <EditableVideoGrid videos={uploadVideos} onEdit={openVideoEditor} />
                    )}
                </div>
            </div>

            {editOpen && (
                <EditModal
                    userName={user?.name}
                    avatarUrl={user?.avatarUrl}
                    avatarKey={user?.avatarKey}
                    coverUrl={user?.coverUrl}
                    name={name}
                    setName={setName}
                    channelName={channelName}
                    setChannelName={setChannelName}
                    description={description}
                    setDescription={setDescription}
                    onAvatarChange={uploadAvatar}
                    onCoverChange={uploadCover}
                    onClose={() => setEditOpen(false)}
                    onSave={saveProfile}
                />
            )}

            {editingVideo && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setEditingVideo(null)}>
                    <div className="bg-[#111] p-6 rounded-xl w-full max-w-3xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold">Edit Video</h2>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Title</label>
                            <input
                                value={videoTitle}
                                onChange={(e) => setVideoTitle(e.target.value)}
                                className="w-full bg-gray-800 p-2 rounded text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Description</label>
                            <textarea
                                value={videoDescription}
                                onChange={(e) => setVideoDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-800 p-2 rounded text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Thumbnail</label>
                            <div className="flex items-center gap-3">
                                <label className="px-3 py-2 bg-gray-700 rounded-lg text-xs cursor-pointer">
                                    Upload Thumbnail
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleUploadVideoThumbnail(e.target.files?.[0])}
                                    />
                                </label>
                                <span className="text-xs text-gray-400">Upload manually or select from spritesheet below.</span>
                            </div>

                            {videoThumbnailPreview && (
                                <img
                                    src={videoThumbnailPreview}
                                    alt="Thumbnail preview"
                                    className="w-64 h-36 object-cover rounded-lg border border-white/10"
                                />
                            )}
                        </div>

                        {videoSpritesheet && (
                            <div className="space-y-3">
                                <label className="text-sm text-gray-400">Spritesheet</label>
                                <SpritesheetPicker
                                    spritesheet={videoSpritesheet}
                                    selectedFrameIndex={selectedSpriteFrameIndex}
                                    onSelectFrame={(frameIndex) => setSelectedSpriteFrameIndex(frameIndex)}
                                    onReset={() => setSelectedSpriteFrameIndex(null)}
                                    onSave={saveSpriteSelectionAsThumbnail}
                                    saving={savingSprite}
                                    saveLabel="Use Selected Frame As Thumbnail"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setEditingVideo(null)}
                                className="px-4 py-2 bg-gray-700 rounded text-sm"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveVideoEdit}
                                disabled={savingVideo}
                                className="px-4 py-2 bg-purple-600 rounded text-sm disabled:opacity-60"
                            >
                                {savingVideo ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}

const Stat = ({ label, value }: { label: string, value: number }) => (
    <div>
        <p className="font-bold">{value}</p>
        <p className="text-gray-400 text-xs">{label}</p>
    </div>
)

const VideoGrid = ({ videos }: { videos: Video[] }) => {
    if (!videos.length) return <p className="text-gray-500">No content</p>

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {videos.map(v => (
                <VideoCard key={v.publicId} video={v} />
            ))}
        </div>
    )
}

const EditableVideoGrid = ({
    videos,
    onEdit
}: {
    videos: Video[]
    onEdit: (video: Video) => void
}) => {
    if (!videos.length) return <p className="text-gray-500">No content</p>

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {videos.map(v => (
                <div key={v.publicId} className="relative">
                    <VideoCard video={v} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(v)
                        }}
                        className="absolute top-2 right-2 bg-black/70 border border-white/15 rounded-md px-2 py-1 text-[11px]"
                    >
                        Edit
                    </button>
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
    userName,
    avatarUrl,
    avatarKey,
    coverUrl,
    name,
    setName,
    channelName,
    setChannelName,
    description,
    setDescription,
    onAvatarChange,
    onCoverChange,
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
            <h2 className="text-xl font-semibold">Edit Profile</h2>

            <div className="space-y-2">
                <label className="text-sm text-gray-400">Profile Icon</label>
                <div className="flex items-center gap-3">
                    <UserAvatar
                        name={userName || name}
                        avatarUrl={avatarUrl}
                        avatarKey={avatarKey}
                        className="w-14 h-14 text-lg"
                    />
                    <label className="px-3 py-2 bg-gray-700 rounded text-sm cursor-pointer">
                        Change Icon
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onAvatarChange(file)
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-gray-400">Cover Photo (Landscape)</label>
                <div className="flex items-center gap-3">
                    <img
                        src={coverUrl || "https://i.pinimg.com/originals/4f/de/0e/4fde0ed05a14d7f6c1a0b19daec5a731.jpg"}
                        alt="Cover preview"
                        className="h-16 w-32 rounded-lg object-cover border border-white/10"
                    />
                    <label className="px-3 py-2 bg-gray-700 rounded text-sm cursor-pointer">
                        Change Cover
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onCoverChange(file)
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm text-gray-400">Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm text-gray-400">Channel Title</label>
                <input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel title"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm text-gray-400">Channel Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell something about your channel"
                    className="w-full bg-gray-800 p-2 rounded text-sm"
                />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded text-sm">
                    Cancel
                </button>

                <button onClick={onSave} className="px-4 py-2 bg-purple-600 rounded text-sm">
                    Save
                </button>
            </div>
        </div>
    </div>
)

export default ProfilePage
