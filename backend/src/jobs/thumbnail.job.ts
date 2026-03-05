import { thumbnailQueue } from "../queues/thumbnail.queue";

export const addThumbnailJob = async (
    inputPath: string,
    bucket: string,
    s3Key: string
) => {
    await thumbnailQueue.add("generate-thumbnail", {
        inputPath,
        tempDir: "/tmp/thumbs",
        bucket,
        s3Key,
    });
};