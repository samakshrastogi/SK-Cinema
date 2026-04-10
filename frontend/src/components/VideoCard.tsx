import { useNavigate } from "react-router-dom"
import { Play } from "lucide-react"

/* ---------------- TYPES ---------------- */

export interface Video {
    publicId: string
    title?: string
    aiTitle?: string
    thumbnailKey?: string
    progress?: number
}

interface Props {
    video: Video
}

/* ---------------- COMPONENT ---------------- */

const VideoCard = ({ video }: Props) => {

    const navigate = useNavigate()

    /* ---------------- DATA ---------------- */

    const thumbnail = video.thumbnailKey
        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
        : "/placeholder.jpg"

    const title =
        video.aiTitle ||
        video.title ||
        "Untitled"

    /* ---------------- UI ---------------- */

    return (
        <div
            onClick={() => navigate(`/video/${video.publicId}`)}
            className="
                group relative
                rounded-xl overflow-hidden
                cursor-pointer
                bg-white/5

                transition-all duration-300
                hover:scale-[1.06]
                hover:-translate-y-1
                hover:shadow-2xl
            "
        >

            {/* 🎬 THUMBNAIL */}
            <div className="relative overflow-hidden">

                <img
                    src={thumbnail}
                    alt={title}
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg"
                    }}
                    className="
                        w-full h-32 object-cover
                        transition-transform duration-500
                        group-hover:scale-110
                    "
                />

                {/* 🌑 GRADIENT OVERLAY */}
                <div className="
                    absolute inset-0
                    bg-gradient-to-t from-black/60 via-black/20 to-transparent
                    opacity-0 group-hover:opacity-100
                    transition
                " />

                {/* ▶ PLAY BUTTON */}
                <div className="
                    absolute inset-0
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition
                ">
                    <div className="
                        bg-white/90 text-black
                        p-2 rounded-full
                        shadow-lg
                        scale-90 group-hover:scale-100
                        transition
                    ">
                        <Play size={18} />
                    </div>
                </div>

                {/* 📊 PROGRESS BAR */}
                {typeof video.progress === "number" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div
                            className="h-full bg-red-500 transition-all duration-500"
                            style={{ width: `${video.progress}%` }}
                        />
                    </div>
                )}

            </div>

            {/* 📄 CONTENT */}
            <div className="p-3">

                <p className="
                    text-sm font-medium
                    text-gray-200 group-hover:text-white
                    transition
                    line-clamp-2
                ">
                    {title}
                </p>

            </div>

        </div>
    )
}

export default VideoCard