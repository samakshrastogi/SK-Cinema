import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import VideoCard, { Video } from "./VideoCard"

interface Props {
    title: string
    videos: Video[]
}

const VideoRow = ({ title, videos }: Props) => {
    const scrollRef = useRef<HTMLDivElement | null>(null)

    const scroll = (dir: "left" | "right") => {
        if (!scrollRef.current) return

        const scrollAmount = 300

        scrollRef.current.scrollBy({
            left: dir === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth"
        })
    }

    return (
        <div className="space-y-4 group">

            {/* HEADER */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-base sm:text-xl font-semibold tracking-wide">
                    {title}
                </h2>
            </div>

            {/* MOBILE */}
            <div className="flex flex-col gap-3 sm:hidden px-1">
                {videos.map((video) => (
                    <div key={video.id}>
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>

            {/* DESKTOP */}
            <div className="relative hidden sm:block">

                {/* LEFT BUTTON */}
                <button
                    aria-label="Scroll left"
                    title="Scroll left"
                    onClick={() => scroll("left")}
                    className="
                        absolute left-0 top-1/2 -translate-y-1/2 z-10
                        bg-black/60 backdrop-blur
                        p-2 rounded-full
                        opacity-0 group-hover:opacity-100
                        transition
                    "
                >
                    <ChevronLeft size={20} />
                </button>

                {/* RIGHT BUTTON */}
                <button
                    aria-label="Scroll right"
                    title="Scroll right"
                    onClick={() => scroll("right")}
                    className="
                        absolute right-0 top-1/2 -translate-y-1/2 z-10
                        bg-black/60 backdrop-blur
                        p-2 rounded-full
                        opacity-0 group-hover:opacity-100
                        transition
                    "
                >
                    <ChevronRight size={20} />
                </button>

                {/* SCROLL CONTAINER */}
                <div
                    ref={scrollRef}
                    className="
                        flex gap-4 overflow-x-auto scroll-smooth pb-2
                        no-scrollbar
                    "
                >
                    {videos.map((video) => (
                        <div
                            key={video.id}
                            className="
                                min-w-50 lg:min-w-55
                                shrink-0
                                transition-transform duration-300
                                hover:scale-105
                            "
                        >
                            <VideoCard video={video} />
                        </div>
                    ))}
                </div>

            </div>

        </div>
    )
}

export default VideoRow