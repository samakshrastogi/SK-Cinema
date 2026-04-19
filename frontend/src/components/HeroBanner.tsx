import { useNavigate } from "react-router-dom";

interface Video {
    id: string;
    title: string;
    aiTitle?: string;
    aiDescription?: string;

    createdAt: string;
    thumbnailKey: string;

    channel: {
        name: string;
    };
}

const HeroBanner = ({ video }: { video: Video }) => {
    const navigate = useNavigate();

    const title = video.aiTitle || video.title;

    const thumbnail = `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`;

    return (
        <div
            className="relative h-[65vh] sm:h-[75vh] lg:h-[85vh] bg-cover bg-center"
            style={{ backgroundImage: `url(${thumbnail})` }}
        >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-16 sm:bottom-24 left-6 sm:left-16 right-6 max-w-xl space-y-5">

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                    {title}
                </h1>

                {video.aiDescription && (
                    <p className="text-gray-300 text-sm sm:text-base line-clamp-3">
                        {video.aiDescription}
                    </p>
                )}

                <p className="text-gray-400 text-sm">
                    {video.channel.name} •{" "}
                    {new Date(video.createdAt).toLocaleDateString()}
                </p>

                <div className="flex gap-4 pt-2">

                    <button
                        onClick={() => navigate(`/video/${video.id}`)}
                        className="bg-white text-black px-6 sm:px-8 py-2 sm:py-3 rounded-md font-semibold hover:bg-gray-200 transition"
                    >
                        ▶ Play
                    </button>

                    <button className="bg-gray-600/80 px-6 sm:px-8 py-2 sm:py-3 rounded-md font-semibold hover:bg-gray-500 transition">
                        More Info
                    </button>

                </div>

            </div>
        </div>
    );
};

export default HeroBanner;
