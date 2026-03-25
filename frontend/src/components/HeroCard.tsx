import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Video {
    id: number;
    title: string;
    aiTitle?: string;
    aiDescription?: string;
    thumbnailKey?: string;
}

interface Props {
    video?: Video;
}

const HeroCard = ({ video }: Props) => {
    const navigate = useNavigate();

    if (!video) return null;

    const thumbnail = video.thumbnailKey
        ? `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
        : "/placeholder.jpg";

    const title = video.aiTitle || video.title;

    return (
        <div className="
      relative w-full
      h-[260px] sm:h-[320px] lg:h-[380px]
      rounded-2xl overflow-hidden
      shadow-2xl
      group
    ">

            {/* 🎬 BACKGROUND */}
            <img
                src={thumbnail}
                alt={title}
                className="
          absolute inset-0 w-full h-full object-cover
          transition-transform duration-500
          group-hover:scale-105
        "
            />

            {/* 🔥 CINEMATIC OVERLAY */}
            <div className="
        absolute inset-0
        bg-gradient-to-r
        from-black/90 via-black/60 to-transparent
      " />

            {/* 🔥 VIGNETTE DEPTH */}
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]" />

            {/* 🎯 CONTENT */}
            <div className="
        absolute bottom-6 sm:bottom-10
        left-6 sm:left-10 right-6
        space-y-4 max-w-xl
      ">

                {/* TAG */}
                <span className="
          inline-block
          bg-orange-500/90 backdrop-blur
          px-3 py-1 rounded-full
          text-xs sm:text-sm font-medium
          shadow-md
        ">
                    🔥 Trending
                </span>

                {/* TITLE */}
                <h1 className="
          text-2xl sm:text-3xl lg:text-4xl
          font-bold leading-tight
          line-clamp-2
        ">
                    {title}
                </h1>

                {/* CTA BUTTON */}
                <button
                    onClick={() => navigate(`/video/${video.id}`)}
                    className="
            flex items-center gap-2
            bg-purple-600 hover:bg-purple-700
            px-5 py-2.5 rounded-xl
            text-sm sm:text-base
            transition-all duration-300

            hover:scale-105
            active:scale-95
            shadow-lg
          "
                >
                    <Play size={18} />
                    Watch Now
                </button>

            </div>
        </div>
    );
};

export default HeroCard;