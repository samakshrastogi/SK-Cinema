import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { io } from "socket.io-client"

import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"

interface Channel {
    id: number
    name: string
    username: string
}

type UploadStatus =
    | "waiting"
    | "uploading"
    | "processing"
    | "completed"
    | "error"

interface UploadItem {
    file: File
    preview: string
    duration: number

    uploadProgress: number
    aiProgress: number

    speed: number
    status: UploadStatus

    title: string
    description: string
    tags: string

    videoId?: number
}

const socket = io("http://localhost:5000", {
    path: "/socket.io",
    transports: ["websocket"]
})

const Upload = () => {

    const navigate = useNavigate()

    const [channel, setChannel] = useState<Channel | null>(null)
    const [loadingChannel, setLoadingChannel] = useState(true)

    const [queue, setQueue] = useState<UploadItem[]>([])
    const [uploading, setUploading] = useState(false)

    /* ---------------- SOCKET EVENTS ---------------- */

    useEffect(() => {

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id)
        })

        socket.on("connect_error", (err) => {
            console.log("Socket error:", err)
        })

        socket.on("ai-progress", ({ videoId, progress }) => {

            setQueue(prev =>
                prev.map(item =>
                    item.videoId === videoId
                        ? { ...item, aiProgress: progress }
                        : item
                )
            )

        })

        socket.on("ai-completed", async ({ videoId }) => {

            if (!videoId) return

            try {
                const res = await api.get(`/video/${videoId}`)
                const video = res.data

                setQueue(prev =>
                    prev.map(item =>
                        item.videoId === videoId
                            ? {
                                ...item,
                                status: "completed",
                                aiProgress: 100,

                                // AI fields from backend
                                title: video.aiTitle ?? item.title,
                                description: video.aiDescription ?? "",

                                // optional (if backend later returns them)
                                tags: video.tags?.join(", ") ?? ""
                            }
                            : item
                    )
                )

            } catch (err) {
                console.error("Failed fetching AI data", err)
            }

        })
        socket.on("ai-failed", ({ videoId }) => {

            setQueue(prev =>
                prev.map(item =>
                    item.videoId === videoId
                        ? { ...item, status: "error" }
                        : item
                )
            )

        })

        return () => {
            socket.off("connect")
            socket.off("connect_error")
            socket.off("ai-progress")
            socket.off("ai-completed")
            socket.off("ai-failed")
        }

    }, [])

    /* ---------------- FETCH CHANNEL ---------------- */

    useEffect(() => {

        const fetchChannel = async () => {

            try {

                const res = await api.get("/channel/me")
                setChannel(res.data.data)

            } finally {

                setLoadingChannel(false)

            }

        }

        fetchChannel()

    }, [])

    /* ---------------- HANDLE FILES ---------------- */

    const handleFiles = (files: FileList | null) => {

        if (!files) return

        Array.from(files).forEach(file => {

            const preview = URL.createObjectURL(file)
            const video = document.createElement("video")

            video.preload = "metadata"
            video.src = preview

            video.onloadedmetadata = () => {

                const newItem: UploadItem = {

                    file,
                    preview,
                    duration: video.duration,

                    uploadProgress: 0,
                    aiProgress: 0,

                    speed: 0,
                    status: "waiting",

                    title: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                    tags: ""

                }

                setQueue(prev => [...prev, newItem])

            }

        })

    }

    /* ---------------- UPDATE ITEM ---------------- */

    const updateItem = (index: number, updates: Partial<UploadItem>) => {

        setQueue(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, ...updates } : item
            )
        )

    }

    const removeItem = (index: number) => {

        setQueue(prev => prev.filter((_, i) => i !== index))

    }

    /* ---------------- START QUEUE ---------------- */

    const startUploadQueue = async () => {

        if (!channel) return

        setUploading(true)

        for (let i = 0; i < queue.length; i++) {

            if (queue[i].status !== "waiting") continue

            await uploadSingle(i)

        }

        setUploading(false)

    }

    /* ---------------- SINGLE UPLOAD ---------------- */

    const uploadSingle = async (index: number) => {

        const item = queue[index]

        try {

            updateItem(index, { status: "uploading" })

            const presignRes = await api.post("/video/presign", {
                fileName: item.file.name,
                fileType: item.file.type
            })

            const { uploadUrl, key } = presignRes.data

            const startTime = Date.now()

            await axios.put(uploadUrl, item.file, {

                headers: { "Content-Type": item.file.type },

                onUploadProgress: event => {

                    if (!event.total) return

                    const percent = Math.round(
                        (event.loaded * 100) / event.total
                    )

                    const elapsed = Math.max(
                        (Date.now() - startTime) / 1000,
                        1
                    )

                    const speed =
                        event.loaded / 1024 / 1024 / elapsed

                    updateItem(index, {
                        uploadProgress: percent,
                        speed
                    })

                }

            })

            const completeRes = await api.post("/video/complete", {

                key,
                title: item.title,
                description: item.description,
                tags: item.tags
                    .split(",")
                    .map(t => t.trim())
                    .filter(Boolean),

                duration: item.duration,
                size: item.file.size

            })

            const videoId = completeRes.data.id

            updateItem(index, {
                status: "processing",
                uploadProgress: 100,
                videoId
            })

        } catch {

            updateItem(index, { status: "error" })

        }

    }

    /* ---------------- LOADING ---------------- */

    if (loadingChannel) {

        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        )

    }

    /* ---------------- UI ---------------- */

    return (

        <AppLayout>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

                {/* HEADER */}

                <div className="flex justify-between items-center">

                    <div>
                        <h1 className="text-3xl font-bold">
                            {channel?.name}
                        </h1>

                        <p className="text-gray-400 text-sm">
                            @{channel?.username}
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/s3-import")}
                        className="bg-purple-600 hover:bg-purple-700 transition px-6 py-2 rounded-lg text-sm font-medium"
                    >
                        S3 Import
                    </button>

                </div>

                {/* DROPZONE */}

                <div
                    onClick={() => document.getElementById("fileInput")?.click()}
                    className="
                    border-2 border-dashed border-white/20
                    hover:border-purple-500
                    transition
                    rounded-2xl
                    p-16
                    text-center
                    cursor-pointer
                    bg-white/5
                    backdrop-blur-xl
                    "
                >
                    <p className="text-gray-300">
                        Drag & drop videos here or click to upload
                    </p>
                </div>

                <input
                    id="fileInput"
                    type="file"
                    accept="video/*"
                    multiple
                    hidden
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {/* START BUTTON */}

                {queue.length > 0 && (

                    <button
                        onClick={startUploadQueue}
                        disabled={uploading}
                        className="bg-purple-600 hover:bg-purple-700 transition px-6 py-3 rounded-lg text-sm font-medium"
                    >
                        {uploading ? "Uploading..." : "Start Uploading"}
                    </button>

                )}

                {/* QUEUE */}

                <div className="space-y-10">

                    {queue.map((item, index) => (

                        <div
                            key={index}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-xl space-y-6"
                        >

                            {/* VIDEO + PROGRESS */}

                            <div className="flex gap-6 items-start">

                                <video
                                    src={item.preview}
                                    className="w-56 h-32 object-cover rounded-xl"
                                />

                                <div className="flex-1">

                                    <p className="text-sm text-gray-400 mb-2">
                                        Upload {item.uploadProgress}% • {item.speed.toFixed(2)} MB/s
                                    </p>

                                    <div className="w-full bg-gray-700/40 h-2 rounded-full overflow-hidden">

                                        <div
                                            className="bg-green-500 h-2 transition-all"
                                            style={{ width: `${item.uploadProgress}%` }}
                                        />

                                    </div>

                                    {item.status === "processing" && (

                                        <div className="mt-4">

                                            <p className="text-sm text-gray-400 mb-1">
                                                AI Processing {item.aiProgress}%
                                            </p>

                                            <div className="w-full bg-gray-700/40 h-2 rounded-full overflow-hidden">

                                                <div
                                                    className="bg-purple-500 h-2 transition-all"
                                                    style={{ width: `${item.aiProgress}%` }}
                                                />

                                            </div>

                                        </div>

                                    )}

                                </div>

                            </div>

                            {/* ✅ AI RESULT (moved inside card) */}

                            {item.status === "completed" && (

                                <div className="space-y-6">

                                    {/* TITLE */}

                                    <div className="space-y-1">

                                        <label className="text-sm text-gray-400">
                                            Title
                                        </label>

                                        <input
                                            value={item.title}
                                            onChange={(e) =>
                                                updateItem(index, { title: e.target.value })
                                            }
                                            className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                                        />

                                    </div>

                                    {/* DESCRIPTION */}

                                    <div className="space-y-1">

                                        <label className="text-sm text-gray-400">
                                            Description
                                        </label>

                                        <textarea
                                            rows={4}
                                            value={item.description}
                                            onChange={(e) =>
                                                updateItem(index, { description: e.target.value })
                                            }
                                            className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                                        />

                                    </div>

                                    {/* KEYWORDS */}

                                    <div className="space-y-2">

                                        <label className="text-sm text-gray-400">
                                            Keywords
                                        </label>

                                        <div className="flex flex-wrap gap-2">

                                            {item.tags
                                                .split(",")
                                                .filter(tag => tag.trim())
                                                .map((tag, i) => (

                                                    <span
                                                        key={i}
                                                        className="bg-purple-600/20 text-purple-300 text-xs px-3 py-1 rounded-full"
                                                    >
                                                        {tag.trim()}
                                                    </span>

                                                ))}

                                        </div>

                                    </div>

                                </div>

                            )}

                        </div>

                    ))}

                </div>

            </div>

        </AppLayout>

    )

}

export default Upload