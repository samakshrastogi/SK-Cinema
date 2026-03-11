import VideoCard from "./VideoCard";

const VideoRow = ({ title, videos }: any) => {
    return (
        <div className="space-y-4">

            <div className="flex justify-between items-center">

                <h2 className="text-lg sm:text-xl font-semibold">
                    {title}
                </h2>

                <button className="text-sm text-gray-400 hover:text-white">
                    See All
                </button>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

                {videos.map((video: any) => (
                    <VideoCard key={video.id} video={video} />
                ))}

            </div>

        </div>
    );
};

export default VideoRow;