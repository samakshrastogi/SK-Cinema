import { generateMultipleThumbnails } from "./ffmpeg.service";
import { selectBestThumbnail } from "./selector.service";
import { optimizeThumbnail } from "./optimizer.service";
import { uploadToS3 } from "./s3.service";

export const processThumbnailPipeline = async (
    inputPath: string,
    tempDir: string,
    bucket: string,
    s3Key: string
) => {
    const thumbnails = await generateMultipleThumbnails(inputPath, tempDir);

    const best = await selectBestThumbnail(thumbnails);

    const optimizedPath = `${tempDir}/optimized.webp`;

    await optimizeThumbnail(best, optimizedPath);

    await uploadToS3(bucket, s3Key, optimizedPath);

    return s3Key;
};