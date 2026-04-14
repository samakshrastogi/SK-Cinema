import { useState } from "react"

interface SharePopupProps {
    open: boolean
    onClose: () => void
    onShare: (method: string, targetUrl?: string) => Promise<void> | void
    videoUrl: string
}

const SharePopup = ({ open, onClose, onShare, videoUrl }: SharePopupProps) => {
    const [copied, setCopied] = useState(false)

    if (!open) return null

    const encodedUrl = encodeURIComponent(videoUrl)

    const options = [
        {
            label: "WhatsApp",
            method: "WHATSAPP",
            url: `https://wa.me/?text=${encodedUrl}`,
            icon: "🟢"
        },
        {
            label: "Telegram",
            method: "TELEGRAM",
            url: `https://t.me/share/url?url=${encodedUrl}`,
            icon: "✈️"
        },
        {
            label: "X",
            method: "X",
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
            icon: "🐦"
        },
        {
            label: "Facebook",
            method: "FACEBOOK",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: "📘"
        },
        {
            label: "LinkedIn",
            method: "LINKEDIN",
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: "💼"
        },
        {
            label: "Email",
            method: "EMAIL",
            url: `mailto:?subject=Check this video&body=${encodedUrl}`,
            icon: "✉️"
        }
    ]

    const handleCopy = async () => {
        await onShare("COPY_LINK")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end justify-center px-3 sm:px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-t-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-5 space-y-5 animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >

                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                        Share Video
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* LINK PREVIEW */}
                <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 truncate">
                    {videoUrl}
                </div>

                {/* SHARE OPTIONS */}
                <div className="grid grid-cols-3 gap-3">
                    {options.map((opt) => (
                        <button
                            key={opt.method}
                            type="button"
                            onClick={() => onShare(opt.method, opt.url)}
                            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
                        >
                            <span className="text-lg">{opt.icon}</span>
                            <span className="text-[10px] text-gray-300">
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* PRIMARY ACTIONS */}
                <div className="flex gap-2">

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-medium transition"
                    >
                        {copied ? "Copied!" : "Copy Link"}
                    </button>

                    {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                            type="button"
                            onClick={() => onShare("NATIVE")}
                            className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
                        >
                            More
                        </button>
                    )}
                </div>

                {/* CLOSE */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm transition"
                >
                    Close
                </button>

            </div>
        </div>
    )
}

export default SharePopup