import { exec } from "child_process";

const getVideoDuration = (inputPath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        exec(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(parseFloat(stdout));
                }
            }
        );
    });
};

export const generateThumbnail = async (
    inputPath: string,
    outputPath: string
): Promise<void> => {
    const duration = await getVideoDuration(inputPath);

    // 🎯 Smart frame selection:
    // - Minimum 2 seconds
    // - Maximum 40% into video
    // - Avoid end credits
    const timestamp = Math.max(2, duration * 0.35);

    return new Promise((resolve, reject) => {
        const command = `
      ffmpeg -ss ${timestamp}
      -i "${inputPath}"
      -vframes 1
      -vf "scale=1280:720:force_original_aspect_ratio=decrease,
           pad=1280:720:(ow-iw)/2:(oh-ih)/2"
      -q:v 2
      -y
      "${outputPath}"
    `.replace(/\n/g, " ");

        exec(command, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
};