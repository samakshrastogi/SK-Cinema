import type { Server } from "socket.io"

let ioRef: Server | null = null

export const setSocketServer = (io: Server) => {
    ioRef = io
}

export const emitNewVideoUploaded = (payload: {
    publicId: string
    title: string
    uploaderName?: string | null
}) => {
    if (!ioRef) return

    const base = process.env.CLIENT_URL || ""
    const videoLink = `${base}/video/${payload.publicId}`

    ioRef.emit("new-video-uploaded", {
        ...payload,
        videoLink,
        createdAt: new Date().toISOString()
    })
}

export const emitProcessingEvent = (event: string, payload: Record<string, unknown>) => {
    if (!ioRef) return
    ioRef.emit(event, payload)
}
