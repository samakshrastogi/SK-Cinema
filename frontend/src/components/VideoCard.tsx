import { useNavigate } from "react-router-dom";

const VideoCard = ({ video }: any) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/video/${video.id}`)}
            className="bg-white/5 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/10"
        >

            <img
                src={`https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`}
                className="w-full h-32 object-cover"
            />

            <div className="p-3 space-y-2">

                <p className="text-sm font-medium line-clamp-2">
                    {video.aiTitle || video.title}
                </p>

                {video.progress && (
                    <div className="h-1 bg-gray-700 rounded">
                        <div
                            className="h-full bg-purple-500 rounded"
                            style={{ width: `${video.progress}%` }}
                        />
                    </div>
                )}

            </div>

        </div>
    );
};

export default VideoCard;