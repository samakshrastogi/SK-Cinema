import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execAsync = promisify(exec)

const getDuration = async (inputPath: string): Promise<number> => {

    const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    )

    return parseFloat(stdout)

}

export const generateMultipleThumbnails = async (
    inputPath: string,
    outputDir: string
): Promise<string[]> => {

    const duration = await getDuration(inputPath)

    const timestamps = [
        duration * 0.1,
        duration * 0.3,
        duration * 0.5,
        duration * 0.7,
        duration * 0.9
    ]

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputs: string[] = []

    for (let i = 0; i < timestamps.length; i++) {

        const ts = timestamps[i]

        const outputPath = path.join(outputDir, `thumb_${i}.jpg`)

        outputs.push(outputPath)

        const command = `
        ffmpeg -ss ${ts}
        -i "${inputPath}"
        -frames:v 1
        -vf "scale=1280:-2"
        -q:v 2
        -y "${outputPath}"
        `.replace(/\n/g, " ")

        await execAsync(command)

    }

    return outputs

}