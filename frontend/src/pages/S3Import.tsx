import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/axios";

interface Bucket {
    id: number;
    name: string;
    bucketName: string;
    region?: string | null;
    endpoint?: string | null;
}

interface S3File {
    key: string;
    size?: number;
}

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"];

const isVideoFile = (key: string) => {
    return VIDEO_EXTENSIONS.some((ext) =>
        key.toLowerCase().endsWith(ext)
    );
};

const S3Import = () => {
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

    const [files, setFiles] = useState<S3File[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

    const [scanning, setScanning] = useState(false);
    const [importing, setImporting] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);

    const [bucketForm, setBucketForm] = useState({
        name: "",
        accessKey: "",
        secretKey: "",
        bucketName: "",
        region: "",
        endpoint: "",
    });

    /* ============================= Fetch Buckets ============================= */

    useEffect(() => {
        fetchBuckets();
    }, []);

    const fetchBuckets = async () => {
        const res = await api.get("/video/s3/list");
        setBuckets(res.data);
    };

    /* ============================= Add Bucket ============================= */

    const handleAddBucket = async () => {
        try {
            await api.post("/video/s3/add", bucketForm);

            alert("Bucket added successfully");

            setShowAddModal(false);
            setBucketForm({
                name: "",
                accessKey: "",
                secretKey: "",
                bucketName: "",
                region: "",
                endpoint: "",
            });

            fetchBuckets();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to add bucket");
        }
    };

    /* ============================= Scan Bucket ============================= */

    const handleScan = async () => {
        if (!selectedBucket) {
            alert("Select a bucket first");
            return;
        }

        try {
            setScanning(true);
            const res = await api.get(`/video/s3/scan/${selectedBucket}`);
            setFiles(res.data);
            setSelectedFiles([]);
        } catch (error: any) {
            alert(error.response?.data?.message || "Scan failed");
        } finally {
            setScanning(false);
        }
    };

    /* ============================= Filter Videos ============================= */

    const videoFiles = useMemo(() => {
        return files.filter((file) => isVideoFile(file.key));
    }, [files]);

    /* ============================= Folder Grouping ============================= */

    const folderMap = useMemo(() => {
        const map: Record<string, string[]> = {};

        videoFiles.forEach((file) => {
            const parts = file.key.split("/");
            const folder = parts.length > 1 ? parts[0] : "root";

            if (!map[folder]) map[folder] = [];
            map[folder].push(file.key);
        });

        return map;
    }, [videoFiles]);

    /* ============================= Selection Logic ============================= */

    const toggleFile = (key: string) => {
        setSelectedFiles((prev) =>
            prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key]
        );
    };

    const toggleFolder = (folder: string) => {
        const folderFiles = folderMap[folder];

        const allSelected = folderFiles.every((f) =>
            selectedFiles.includes(f)
        );

        if (allSelected) {
            setSelectedFiles((prev) =>
                prev.filter((f) => !folderFiles.includes(f))
            );
        } else {
            setSelectedFiles((prev) => [
                ...new Set([...prev, ...folderFiles]),
            ]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedFiles.length === videoFiles.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(videoFiles.map((f) => f.key));
        }
    };

    /* ============================= Import ============================= */

    const handleImport = async () => {
        if (!selectedBucket || selectedFiles.length === 0) return;

        try {
            setImporting(true);

            for (const key of selectedFiles) {
                await api.post("/video/s3/import", {
                    credentialId: selectedBucket,
                    sourceKey: key,
                });
            }

            alert("Import completed");
            setSelectedFiles([]);
        } catch (error: any) {
            alert(error.response?.data?.message || "Import failed");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto mt-8 px-6 space-y-8">

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">S3 Import Manager</h1>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    + Add Bucket
                </button>
            </div>

            {/* Bucket Selector */}
            <div className="bg-[#0f172a] shadow rounded-xl p-6 space-y-4 border border-gray-700">

                <select
                    className="w-full px-4 py-3 rounded-xl 
                   bg-black/50 text-white 
                   border border-gray-700 
                   focus:border-blue-500 
                   outline-none"
                    onChange={(e) =>
                        setSelectedBucket(
                            e.target.value ? Number(e.target.value) : null
                        )
                    }
                >
                    <option value="" className="bg-[#0f172a] text-white">
                        Choose bucket
                    </option>

                    {buckets.map((b) => (
                        <option
                            key={b.id}
                            value={b.id}
                            className="bg-[#0f172a] text-white"
                        >
                            {b.name} ({b.bucketName})
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 
                   text-white px-5 py-2 rounded-xl 
                   hover:opacity-90 transition"
                >
                    {scanning ? "Scanning..." : "Scan Bucket"}
                </button>
            </div>
            
            {/* Files Section */}
            {videoFiles.length > 0 && (
                <div className="bg-dark shadow rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-medium">
                            Videos ({videoFiles.length})
                        </h2>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={
                                    selectedFiles.length === videoFiles.length
                                }
                                onChange={toggleSelectAll}
                            />
                            Select All
                        </label>
                    </div>

                    <div className="max-h-96 overflow-y-auto border rounded">
                        {Object.keys(folderMap).map((folder) => (
                            <div key={folder} className="border-b">
                                <div className="bg-gray-100 text-black p-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={folderMap[folder].every((f) =>
                                            selectedFiles.includes(f)
                                        )}
                                        onChange={() =>
                                            toggleFolder(folder)
                                        }
                                    />
                                    <span className="font-semibold">
                                        📁 {folder}
                                    </span>
                                </div>

                                {folderMap[folder].map((fileKey) => (
                                    <div
                                        key={fileKey}
                                        className="flex items-center gap-3 p-2 pl-8"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.includes(fileKey)}
                                            onChange={() =>
                                                toggleFile(fileKey)
                                            }
                                        />
                                        <span className="text-sm">
                                            {fileKey.split("/").pop()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleImport}
                        disabled={
                            importing || selectedFiles.length === 0
                        }
                        className="bg-purple-600 text-white px-4 py-2 rounded"
                    >
                        {importing
                            ? "Importing..."
                            : `Import (${selectedFiles.length})`}
                    </button>
                </div>
            )}

            {/* Add Bucket Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

                    <div className="bg-[#0f172a] border border-gray-700 rounded-2xl w-[420px] p-8 shadow-2xl relative">

                        {/* Close Button */}
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-semibold text-white mb-6">
                            Add S3 Bucket
                        </h2>

                        <div className="space-y-4">

                            <input
                                placeholder="Display Name"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.name}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, name: e.target.value })
                                }
                            />

                            <input
                                placeholder="Access Key"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.accessKey}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, accessKey: e.target.value })
                                }
                            />

                            <input
                                placeholder="Secret Key"
                                type="password"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.secretKey}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, secretKey: e.target.value })
                                }
                            />

                            <input
                                placeholder="Bucket Name"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.bucketName}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, bucketName: e.target.value })
                                }
                            />

                            <input
                                placeholder="Region (optional)"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.region}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, region: e.target.value })
                                }
                            />

                            <input
                                placeholder="Custom Endpoint (optional)"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                                value={bucketForm.endpoint}
                                onChange={(e) =>
                                    setBucketForm({ ...bucketForm, endpoint: e.target.value })
                                }
                            />

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-5 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleAddBucket}
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:opacity-90 transition"
                                >
                                    Add Bucket
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default S3Import;