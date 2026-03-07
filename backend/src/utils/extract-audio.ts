import ffmpeg from "fluent-ffmpeg"

export const extractAudio = (videoPath: string, audioPath: string) => {
    return new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec("libmp3lame")
            .save(audioPath)
            .on("end", () => resolve())
            .on("error", reject)
    })
}