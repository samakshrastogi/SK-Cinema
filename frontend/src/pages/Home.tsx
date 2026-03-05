import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import { useNavigate } from "react-router-dom";

interface Video {
  id: number;
  title: string;
  createdAt: string;
  thumbnailKey: string;
  channel: {
    name: string;
    username: string;
  };
}

const Home = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await api.get("/video/list");
      setVideos(res.data);
    } catch (error) {
      console.error("Error fetching videos", error);
    }
  };

  const heroVideo = videos[0];

  return (
    <div className="bg-black min-h-screen text-white">

      {/* ================= HERO SECTION ================= */}
      {heroVideo && (
        <div
          className="relative h-[85vh] w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${heroVideo.thumbnailKey})`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

          {/* Hero Content */}
          <div className="absolute bottom-24 left-16 max-w-xl space-y-5">
            <h1 className="text-5xl font-bold leading-tight">
              {heroVideo.title}
            </h1>

            <p className="text-gray-300 text-sm">
              Stream now on SK Cinema • {new Date(heroVideo.createdAt).toLocaleDateString()}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/video/${heroVideo.id}`)}
                className="bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-gray-200 transition"
              >
                ▶ Play
              </button>

              <button className="bg-gray-600/70 px-8 py-3 rounded-md font-semibold hover:bg-gray-500 transition">
                More Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TRENDING ROW ================= */}
      <div className="px-12 mt-12">
        <h2 className="text-2xl font-semibold mb-6">Trending Now</h2>

        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {videos.map((video) => (
            <div
              key={video.id}
              onClick={() => navigate(`/video/${video.id}`)}
              className="relative min-w-[220px] h-60 cursor-pointer group transform transition duration-300 hover:scale-110"
            >
              <img
                src={`https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`}
                alt={video.title}
                className="w-full h-full object-cover rounded-lg"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                <span className="text-lg font-semibold">▶ Play</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= NEW RELEASES ROW ================= */}
      <div className="px-12 mt-10 pb-16">
        <h2 className="text-2xl font-semibold mb-6">New Releases</h2>

        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {videos.slice().reverse().map((video) => (
            <div
              key={video.id}
              onClick={() => navigate(`/video/${video.id}`)}
              className="relative min-w-[220px] h-60 cursor-pointer group transform transition duration-300 hover:scale-110"
            >
              <img
                src={`https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`}
                alt={video.title}
                className="w-full h-full object-cover rounded-lg"
              />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                <span className="text-lg font-semibold">▶ Play</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;