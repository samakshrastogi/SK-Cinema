import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "@/api/axios";

interface Channel {
    id: number;
    name: string;
    username: string;
}

type UploadStatus = "waiting" | "uploading" | "completed" | "error";

interface UploadItem {
    file: File;
    preview: string;
    duration: number;
    progress: number;
    speed: number;
    status: UploadStatus;
    title: string;
    description: string;
    category: string;
    tags: string;
    aiLoading?: boolean;
}

const Upload = () => {
    const navigate = useNavigate();

    const [channel, setChannel] = useState<Channel | null>(null);
    const [loadingChannel, setLoadingChannel] = useState(true);
    const [queue, setQueue] = useState<UploadItem[]>([]);
    const [uploading, setUploading] = useState(false);

    /* --------------------------------- */
    /* FETCH CHANNEL                     */
    /* --------------------------------- */

    useEffect(() => {
        const fetchChannel = async () => {
            try {
                const res = await api.get("/channel/me");
                setChannel(res.data);
            } finally {
                setLoadingChannel(false);
            }
        };

        fetchChannel();
    }, []);

    /* --------------------------------- */
    /* HANDLE FILES                      */
    /* --------------------------------- */

    const handleFiles = (files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            const preview = URL.createObjectURL(file);
            const video = document.createElement("video");

            video.preload = "metadata";
            video.src = preview;

            video.onloadedmetadata = () => {
                const newItem: UploadItem = {
                    file,
                    preview,
                    duration: video.duration,
                    progress: 0,
                    speed: 0,
                    status: "waiting",
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                    category: "",
                    tags: "",
                };

                setQueue((prev) => [...prev, newItem]);
            };
        });
    };

    /* --------------------------------- */
    /* UPDATE QUEUE ITEM                 */
    /* --------------------------------- */

    const updateItem = (index: number, updates: Partial<UploadItem>) => {
        setQueue((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, ...updates } : item
            )
        );
    };

    const removeItem = (index: number) => {
        setQueue((prev) => prev.filter((_, i) => i !== index));
    };

    /* --------------------------------- */
    /* UPLOAD LOGIC                      */
    /* --------------------------------- */

    const startUploadQueue = async () => {
        if (!channel) return;
        if (queue.every((item) => item.status !== "waiting")) return;

        setUploading(true);

        for (let i = 0; i < queue.length; i++) {
            if (queue[i].status !== "waiting") continue;
            await uploadSingle(i);
        }

        setUploading(false);
    };

    const uploadSingle = async (index: number) => {
        const item = queue[index];

        try {
            updateItem(index, { status: "uploading" });

            const presignRes = await api.post("/video/presign", {
                fileName: item.file.name,
                fileType: item.file.type,
            });

            const { uploadUrl, key } = presignRes.data;

            const startTime = Date.now();

            await axios.put(uploadUrl, item.file, {
                headers: { "Content-Type": item.file.type },
                onUploadProgress: (event) => {
                    if (!event.total) return;

                    const percent = Math.round(
                        (event.loaded * 100) / event.total
                    );

                    const elapsed = Math.max(
                        (Date.now() - startTime) / 1000,
                        1
                    );

                    const speed =
                        event.loaded / 1024 / 1024 / elapsed;

                    updateItem(index, {
                        progress: percent,
                        speed,
                    });
                },
            });

            await api.post("/video/complete", {
                key,
                title: item.title,
                description: item.description,
                category: item.category,
                tags: item.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                duration: item.duration,
                size: item.file.size,
            });

            updateItem(index, {
                status: "completed",
                progress: 100,
            });
        } catch {
            updateItem(index, { status: "error" });
        }
    };

    /* --------------------------------- */
    /* AI GENERATION                     */
    /* --------------------------------- */

    const generateAI = async (index: number) => {
        const item = queue[index];

        try {
            updateItem(index, { aiLoading: true });

            const res = await api.post("/ai/generate-metadata", {
                filename: item.file.name,
            });

            updateItem(index, {
                title: res.data.title,
                description: res.data.description,
                aiLoading: false,
            });
        } catch {
            updateItem(index, { aiLoading: false });
        }
    };

    /* --------------------------------- */
    /* LOADING SCREEN                    */
    /* --------------------------------- */

    if (loadingChannel) {
        return (
            <div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    /* --------------------------------- */
    /* RENDER                            */
    /* --------------------------------- */

    return (
        <div className="min-h-screen bg-[#0b1120] text-white px-6 py-10">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* HEADER */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            {channel?.name}
                        </h1>
                        <p className="text-gray-400">
                            @{channel?.username}
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/s3-import")}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600
                                   hover:from-purple-700 hover:to-indigo-700
                                   px-6 py-2.5 rounded-xl text-sm font-medium
                                   shadow-lg transition hover:scale-[1.03]"
                    >
                        S3 Import
                    </button>
                </div>

                {/* DROP ZONE */}
                <div
                    onClick={() =>
                        document.getElementById("fileInput")?.click()
                    }
                    className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 transition"
                >
                    <p className="text-gray-400">
                        Drag & drop videos here or click to select multiple files
                    </p>
                </div>

                <input
                    id="fileInput"
                    type="file"
                    accept="video/*"
                    multiple
                    hidden
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {/* START BUTTON */}
                {queue.length > 0 && (
                    <button
                        onClick={startUploadQueue}
                        disabled={uploading}
                        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-sm transition disabled:opacity-50"
                    >
                        {uploading
                            ? "Uploading..."
                            : "Start Upload Queue"}
                    </button>
                )}

                {/* QUEUE */}
                <div className="space-y-8">
                    {queue.map((item, index) => (
                        <div
                            key={index}
                            className="bg-[#111827] p-6 rounded-2xl shadow-xl space-y-6"
                        >
                            <div className="flex justify-between">
                                <span
                                    className={`text-xs font-medium ${item.status === "completed"
                                            ? "text-green-400"
                                            : item.status === "error"
                                                ? "text-red-400"
                                                : item.status === "uploading"
                                                    ? "text-yellow-400"
                                                    : "text-gray-400"
                                        }`}
                                >
                                    Status: {item.status}
                                </span>

                                <button
                                    onClick={() => removeItem(index)}
                                    className="text-xs text-red-400 hover:text-red-500"
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="flex gap-6 flex-wrap">
                                <video
                                    src={item.preview}
                                    className="w-48 h-28 object-cover rounded-lg"
                                />

                                <div className="flex-1 space-y-2">
                                    <p className="text-sm text-gray-400">
                                        Duration: {item.duration.toFixed(2)} sec
                                    </p>

                                    <p className="text-sm text-gray-400">
                                        Speed: {item.speed.toFixed(2)} MB/s
                                    </p>

                                    <div className="w-full bg-[#0b1120] h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-green-500 h-2 transition-all"
                                            style={{
                                                width: `${item.progress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <input
                                    value={item.title}
                                    onChange={(e) =>
                                        updateItem(index, {
                                            title: e.target.value,
                                        })
                                    }
                                    className="bg-[#0b1120] rounded-lg px-4 py-2 text-sm"
                                    placeholder="Video Title"
                                />

                                <input
                                    value={item.category}
                                    onChange={(e) =>
                                        updateItem(index, {
                                            category: e.target.value,
                                        })
                                    }
                                    className="bg-[#0b1120] rounded-lg px-4 py-2 text-sm"
                                    placeholder="Category"
                                />
                            </div>

                            <textarea
                                value={item.description}
                                onChange={(e) =>
                                    updateItem(index, {
                                        description: e.target.value,
                                    })
                                }
                                className="w-full bg-[#0b1120] rounded-lg px-4 py-2 text-sm"
                                placeholder="Description"
                            />

                            <input
                                value={item.tags}
                                onChange={(e) =>
                                    updateItem(index, {
                                        tags: e.target.value,
                                    })
                                }
                                className="bg-[#0b1120] rounded-lg px-4 py-2 text-sm"
                                placeholder="Tags (comma separated)"
                            />

                            <button
                                onClick={() => generateAI(index)}
                                disabled={item.aiLoading}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
                            >
                                {item.aiLoading
                                    ? "Generating..."
                                    : "Generate AI Title & Description"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Upload;