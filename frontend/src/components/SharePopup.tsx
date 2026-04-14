interface SharePopupProps {
    open: boolean
    onClose: () => void
    onShare: (method: string, targetUrl?: string) => Promise<void> | void
    videoUrl: string
}

const SharePopup = ({ open, onClose, onShare, videoUrl }: SharePopupProps) => {
    if (!open) return null

    const encodedUrl = encodeURIComponent(videoUrl)

    const options = [
        {
            label: "WhatsApp",
            method: "WHATSAPP",
            url: `https://wa.me/?text=${encodedUrl}`
        },
        {
            label: "Telegram",
            method: "TELEGRAM",
            url: `https://t.me/share/url?url=${encodedUrl}`
        },
        {
            label: "X",
            method: "X",
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}`
        },
        {
            label: "Facebook",
            method: "FACEBOOK",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        },
        {
            label: "LinkedIn",
            method: "LINKEDIN",
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        },
        {
            label: "Email",
            method: "EMAIL",
            url: `mailto:?subject=Check this video&body=${encodedUrl}`
        }
    ]

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold">Share Video</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {options.map((opt) => (
                        <button
                            key={opt.method}
                            type="button"
                            onClick={() => onShare(opt.method, opt.url)}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onShare("COPY_LINK")}
                        className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm transition"
                    >
                        Copy Link
                    </button>
                    {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                            type="button"
                            onClick={() => onShare("NATIVE")}
                            className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm transition"
                        >
                            More Options
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition"
                >
                    Close
                </button>
            </div>
        </div>
    )
}

export default SharePopup

