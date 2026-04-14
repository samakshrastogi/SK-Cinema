import { useEffect, useState } from "react"
import { getAvatarSrc, getInitials } from "@/utils/avatar"

interface Props {
    name?: string
    avatarUrl?: string | null
    avatarKey?: string | null
    alt?: string
    className?: string
}

const UserAvatar = ({
    name,
    avatarUrl,
    avatarKey,
    alt = "User avatar",
    className = ""
}: Props) => {
    const [avatarFailed, setAvatarFailed] = useState(false)

    const avatarSrc = getAvatarSrc({ avatarUrl, avatarKey })

    useEffect(() => {
        Promise.resolve().then(() => setAvatarFailed(false))
    }, [avatarUrl, avatarKey])

    return (
        <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 overflow-hidden flex items-center justify-center font-semibold ${className}`}
        >
            {avatarSrc && !avatarFailed ? (
                <img
                    src={avatarSrc}
                    alt={alt}
                    onError={() => setAvatarFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                getInitials(name)
            )}
        </div>
    )
}

export default UserAvatar
