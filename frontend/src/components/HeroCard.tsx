import { Play } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useRef } from "react"

interface Video {
    id: number
    title?: string
    aiTitle?: string
    aiDescription?: string
    thumbnailKey?: string
    videoKey?: string
    duration?: string
    year?: string
}

interface Props {
    video?: Video
    onPrev?: () => void
    onNext?: () => void
}

const HeroCard = ({ video, onPrev, onNext }: Props) => {
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement | null>(null)

    const thumbnail = video?.thumbnailKey
        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
        : "/placeholder.jpg"

    const videoUrl = video?.videoKey
        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.videoKey}`
        : null

    const title =
        video?.aiTitle ||
        video?.title ||
        (video ? `Video #${video.id}` : "")

    const description =
        video?.aiDescription ||
        "Watch this trending content now on SK Cinema."

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load()
        }
    }, [video?.id])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && onPrev) onPrev()
            if (e.key === "ArrowRight" && onNext) onNext()
        }

        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [onPrev, onNext])

    if (!video) return null

    return (
        <div
            data-hero-id={video.id}
            className="
                relative w-full
                h-50 sm:h-65 lg:h-80
                rounded-2xl overflow-hidden
                group bg-black
                border border-white/10
                shadow-lg
            "
        >
            {videoUrl ? (
                <video
                    ref={videoRef}
                    key={video.id}
                    src={videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="
                        absolute inset-0 w-full h-full object-cover
                        rounded-2xl
                        transition-transform duration-1200
                        group-hover:scale-105
                    "
                />
            ) : (
                <img
                    key={video.id}
                    src={thumbnail}
                    alt={title}
                    className="
                        absolute inset-0 w-full h-full object-cover
                        rounded-2xl
                        transition-transform duration-1200
                        group-hover:scale-105
                    "
                />
            )}

            <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-36 rounded-b-2xl bg-linear-to-t from-black/80 to-transparent" />

            <div
                className="
                    absolute bottom-6 sm:bottom-12
                    left-4 sm:left-10 right-4
                    space-y-3 sm:space-y-5
                    max-w-2xl text-white
                "
            >
                <span className="bg-orange-500 px-3 py-1 rounded-full text-xs font-semibold shadow">
                    🔥 Trending
                </span>

                <h1 className="
                    text-2xl sm:text-4xl lg:text-5xl
                    font-extrabold leading-tight
                    drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]
                ">
                    {title}
                </h1>

                <p className="
                    text-sm sm:text-base italic
                    opacity-90 max-w-lg
                    drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]
                ">
                    {description}
                </p>

                <button
                    onClick={() => navigate(`/video/${video.id}`)}
                    className="
                        flex items-center gap-2
                        bg-white text-black
                        px-5 py-2.5 rounded-lg
                        font-semibold
                        hover:bg-gray-200
                        active:scale-95 transition
                    "
                >
                    <Play size={18} />
                    Play
                </button>
            </div>
        </div>
    )
}

export default HeroCard