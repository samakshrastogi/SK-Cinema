import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/api/axios";
import AppLayout from "@/layouts/AppLayout";

interface VideoDetail {
    id: number;
    title: string;

    aiTitle?: string;
    aiDescription?: string;

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
    aiTitle?: string;
    thumbnailKey: string;
}

const VideoPlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [video, setVideo] = useState<VideoDetail | null>(null);
    const [related, setRelated] = useState<RelatedVideo[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        fetchVideo();
    }, [id]);

    const fetchVideo = async () => {
        const res = await api.get(`/video/${id}`);
        setVideo(res.data);

        const relatedRes = await api.get("/video/list");

        setRelated(
            relatedRes.data.filter((v: any) => v.id !== Number(id))
        );
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
            <div className="min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="grid gap-6 lg:grid-cols-4 max-w-[1400px]">

                {/* LEFT SIDE */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Video Player */}
                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl h-[420px]">

                        <video
                            ref={videoRef}
                            src={video.signedUrl}
                            controls
                            controlsList="nodownload"
                            autoPlay
                            onEnded={handleEnded}
                            className="w-full h-full object-fill"
                        />

                    </div>

                    {/* Video Info */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">

                        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
                            {video.aiTitle || video.title}
                        </h1>
                        {video.aiDescription && (
                            <p className="text-sm text-gray-300 mt-2">
                                {video.aiDescription}
                            </p>
                        )}
                        <div className="text-sm text-gray-300">
                            {video.channel.name}
                        </div>

                        <div className="text-xs text-gray-400 mt-1">
                            {new Date(video.createdAt).toLocaleDateString()}
                        </div>

                    </div>

                    {/* Live Chat */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col">

                        <h2 className="text-lg font-semibold mb-4">
                            Live Chat
                        </h2>

                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-2">

                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className="bg-black/40 rounded-lg px-3 py-2 text-sm"
                                >
                                    {msg}
                                </div>
                            ))}

                        </div>

                        <div className="flex gap-2 mt-4">

                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Write a message..."
                                className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-sm outline-none"
                            />

                            <button
                                onClick={sendMessage}
                                className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg text-sm"
                            >
                                Send
                            </button>

                        </div>

                    </div>

                </div>

                {/* RIGHT SIDE */}
                <div className="space-y-5">

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col h-[calc(100vh-340px)]">

                        <h2 className="text-lg font-semibold mb-2">
                            Up Next
                        </h2>

                        <div className="space-y-4 overflow-y-auto flex-1">

                            {related.slice(0, 16).map((item) => (

                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/video/${item.id}`)}
                                    className="flex gap-2 cursor-pointer hover:bg-black/40 rounded-lg transition"
                                >

                                    <img
                                        src={`https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${item.thumbnailKey}`}
                                        className="w-24 h-16 object-cover rounded-md"
                                    />

                                    <div className="flex-1">

                                        <p className="text-sm font-medium line-clamp-2">
                                            {item.aiTitle || item.title}
                                        </p>

                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>

                </div>
            </div>

        </AppLayout>
    );
};

export default VideoPlayer;