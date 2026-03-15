import { useNavigate } from "react-router-dom"

interface Video {
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

    const title = video.aiTitle || video.title

    return (
        <div
            onClick={() => navigate(`/video/${video.id}`)}
            className="bg-white/5 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/10"
        >

            <img
                src={thumbnail}
                alt={title}
                className="w-full h-32 object-cover"
            />

            <div className="p-3 space-y-2">

                <p className="text-sm font-medium line-clamp-2">
                    {title}
                </p>

                {video.progress !== undefined && (
                    <div className="h-1 bg-gray-700 rounded">
                        <div
                            className="h-full bg-purple-500 rounded"
                            style={{ width: `${video.progress}%` }}
                        />
                    </div>
                )}

            </div>

        </div>
    )
}

export default VideoCard