import { useNavigate } from "react-router-dom"

// ✅ EXPORT THIS (important for VideoRow)
export interface Video {
    id: number
    title: string
    aiTitle?: string
    thumbnailKey?: string
    progress?: number
}

interface Props {
    video: Video
}

const VideoCard = ({ video }: Props) => {
    const navigate = useNavigate()

    const thumbnail = video.thumbnailKey
        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
        : "/placeholder.jpg"

    const rawTitle = video.aiTitle || video.title

    // 🎯 FORMAT TITLE → max 2 lines, 3 words per line
    const formatTitle = (text: string) => {
        const words = text.split(" ")

        const firstLine = words.slice(0, 3).join(" ")
        const secondLineWords = words.slice(3, 6)

        let secondLine = secondLineWords.join(" ")

        if (words.length > 6) {
            secondLine += "..."
        }

        return secondLine ? `${firstLine}\n${secondLine}` : firstLine
    }

    const title = formatTitle(rawTitle)

    return (
        <div
            onClick={() => navigate(`/video/${video.id}`)}
            className="
        group
        bg-white/5 rounded-xl overflow-hidden
        cursor-pointer
        transition-all duration-300

        hover:scale-105
        hover:-translate-y-1
        hover:shadow-2xl
        hover:bg-white/10
      "
        >
            {/* 🎬 THUMBNAIL */}
            <div className="relative overflow-hidden">
                <img
                    src={thumbnail}
                    alt={rawTitle}
                    className="
            w-full h-32 object-cover
            transition-transform duration-500
            group-hover:scale-110
          "
                />

                <div
                    className="
            absolute inset-0 bg-black/0
            group-hover:bg-black/10
            transition
          "
                />
            </div>

            {/* 📄 CONTENT */}
            <div className="p-3 h-[72px] flex flex-col justify-between">

                {/* 🧠 TITLE */}
                <p
                    className="
            text-sm font-medium
            text-gray-200 group-hover:text-white
            transition

            leading-snug
            whitespace-pre-line
          "
                >
                    {title}
                </p>

                {/* 🎯 PROGRESS BAR */}
                {video.progress !== undefined && (
                    <div className="h-1 bg-gray-700/60 rounded overflow-hidden mt-2">
                        <div
                            className="
                h-full bg-purple-500
                transition-all duration-500
              "
                            style={{ width: `${video.progress}%` }}
                        />
                    </div>
                )}

            </div>
        </div>
    )
}

export default VideoCard