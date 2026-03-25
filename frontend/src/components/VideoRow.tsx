import VideoCard, { Video } from "./VideoCard"

interface Props {
    title: string
    videos: Video[]
}

const VideoRow = ({ title, videos }: Props) => {
    return (
        <div className="space-y-5">

            {/* 🔷 HEADER */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg sm:text-xl font-semibold tracking-wide">
                    {title}
                </h2>

                <button
                    className="
            text-sm text-gray-400
            hover:text-white
            transition
          "
                    aria-label="See all videos"
                >
                    See All
                </button>
            </div>

            {/* 🎬 HORIZONTAL SCROLL ROW */}
            <div
                className="
          flex gap-4 overflow-x-auto
          scroll-smooth pb-2

          [-ms-overflow-style:none]
          [scrollbar-width:none]
        "
            >
                {/* Hide scrollbar (Chrome) */}
                <style>
                    {`
            div::-webkit-scrollbar {
              display: none;
            }
          `}
                </style>

                {videos.map((video) => (
                    <div
                        key={video.id}
                        className="
              min-w-[180px] sm:min-w-[200px] lg:min-w-[220px]
              flex-shrink-0
            "
                    >
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>

        </div>
    )
}

export default VideoRow