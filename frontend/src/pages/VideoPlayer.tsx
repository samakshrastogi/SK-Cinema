import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/api/axios";

interface VideoDetail {
    id: number;
    title: string;
    signedUrl: string;
    thumbnailKey?: string;
    channel: {
        name: string;
        username: string;
    };
    createdAt: string;
}

interface RelatedVideo {
    id: number;
    title: string;
    thumbnailKey: string;
}

const VideoPlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [video, setVideo] = useState<VideoDetail | null>(null);
    const [related, setRelated] = useState<RelatedVideo[]>([]);
    const [cinemaMode, setCinemaMode] = useState(false);
    const [messages, setMessages] = useState<string[]>([
        "Welcome to SK Cinema 👋",
        "Enjoy your experience 🚀",
    ]);
    const [input, setInput] = useState("");

    useEffect(() => {
        fetchVideo();
    }, [id]);

    const fetchVideo = async () => {
        const res = await api.get(`/video/${id}`);
        setVideo(res.data);
        const relatedRes = await api.get("/video/list");
        setRelated(relatedRes.data.filter((v: any) => v.id !== Number(id)));
    };

    const handleEnded = () => {
        if (related.length > 0) {
            navigate(`/video/${related[0].id}`);
        }
    };

    const sendMessage = () => {
        if (!input.trim()) return;
        setMessages([...messages, input]);
        setInput("");
    };

    if (!video) {
        return (
            <div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-[#0b1120] text-white transition-all duration-500 ${cinemaMode ? "bg-black" : ""}`}>

            <div className="sticky top-0 z-50 backdrop-blur-md bg-black/40 px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-wide">SK Cinema</h1>
                <button
                    onClick={() => setCinemaMode(!cinemaMode)}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
                >
                    {cinemaMode ? "Exit Cinema" : "Cinema Mode"}
                </button>
            </div>

            <div className={`max-w-7xl mx-auto px-6 py-8 grid ${cinemaMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-4"} gap-8`}>

                <div className={`${cinemaMode ? "col-span-1" : "lg:col-span-3"} space-y-6`}>

                    <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
                        <video
                            ref={videoRef}
                            src={video.signedUrl}
                            controls
                            autoPlay
                            onEnded={handleEnded}
                            className="w-full h-[500px] bg-black"
                        />
                        <div className="absolute bottom-4 right-4 text-xs text-white/70 pointer-events-none">
                            SK Cinema
                        </div>
                    </div>

                    {!cinemaMode && (
                        <div className="bg-[#111827] p-6 rounded-2xl shadow-lg space-y-4">
                            <h2 className="text-2xl font-semibold">{video.title}</h2>

                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <p className="text-gray-300 text-sm">{video.channel.name}</p>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(video.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg text-sm transition">
                                        👍 Like
                                    </button>
                                    <button className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg text-sm transition">
                                        🔗 Share
                                    </button>
                                    <button className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg text-sm transition">
                                        Subscribe
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {!cinemaMode && (
                    <div className="space-y-6">

                        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg flex flex-col">
                            <h3 className="text-lg font-semibold mb-4">Live Chat</h3>

                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className="bg-[#0b1120] p-3 rounded-lg text-sm text-gray-300"
                                    >
                                        {msg}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="flex-1 bg-[#0b1120] rounded-lg px-3 py-2 text-sm outline-none"
                                    placeholder="Type a message..."
                                />
                                <button
                                    onClick={sendMessage}
                                    className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg text-sm transition"
                                >
                                    Send
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg">
                            <h3 className="text-lg font-semibold mb-4">Up Next</h3>

                            <div className="space-y-4">
                                {related.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/video/${item.id}`)}
                                        className="flex gap-3 cursor-pointer hover:bg-[#0b1120] p-2 rounded-lg transition"
                                    >
                                        <img
                                            src={`https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${item.thumbnailKey}`}
                                            className="w-24 h-16 object-cover rounded-md"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium line-clamp-2">
                                                {item.title}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};

export default VideoPlayer;