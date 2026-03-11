import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Video {
    id: number;
    title: string;
    aiTitle?: string;
    aiDescription?: string;
    thumbnailKey: string;
}

interface Props {
    video: Video;
}

const HeroCard = ({ video }: Props) => {
    const navigate = useNavigate();

    const thumbnail = `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`;

    const title = video.aiTitle || video.title;

    return (
        <div className="relative w-full h-[240px] sm:h-[300px] lg:h-[340px] rounded-xl overflow-hidden shadow-xl">

            <img
                src={thumbnail}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

            <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 right-6 space-y-4 max-w-xl">

                <span className="inline-block bg-orange-500 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                    🔥 Trending
                </span>

                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold leading-tight line-clamp-2">
                    {title}
                </h1>

                <button
                    onClick={() => navigate(`/video/${video.id}`)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm sm:text-base transition"
                >
                    <Play size={18} />
                    Watch Now
                </button>

            </div>

        </div>
    );
};

export default HeroCard;