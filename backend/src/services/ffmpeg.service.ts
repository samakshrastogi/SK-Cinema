import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const getDuration = async (inputPath: string): Promise<number> => {
    const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    return parseFloat(stdout);
};

export const generateMultipleThumbnails = async (
    inputPath: string,
    outputDir: string
): Promise<string[]> => {
    const duration = await getDuration(inputPath);

    const percentages = [0.15, 0.35, 0.55, 0.75];
    const timestamps = percentages.map((p) => duration * p);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputs: string[] = [];

    await Promise.all(
        timestamps.map(async (ts, index) => {
            const outputPath = path.join(outputDir, `thumb_${index}.jpg`);
            outputs.push(outputPath);

            const command = `
        ffmpeg -ss ${ts}
        -i "${inputPath}"
        -vframes 1
        -vf "scale=1280:720:force_original_aspect_ratio=decrease,
             pad=1280:720:(ow-iw)/2:(oh-ih)/2"
        -q:v 2
        -y "${outputPath}"
      `.replace(/\n/g, " ");

            await execAsync(command);
        })
    );

    return outputs;
};