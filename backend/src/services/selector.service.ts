import sharp from "sharp";

const scoreImage = async (filePath: string): Promise<number> => {
    const { data, info } = await sharp(filePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

    let brightness = 0;
    for (let i = 0; i < data.length; i += info.channels) {
        brightness += data[i]; // R channel
    }

    brightness = brightness / (data.length / info.channels);

    // Score formula
    return brightness;
};

export const selectBestThumbnail = async (
    files: string[]
): Promise<string> => {
    const scores = await Promise.all(
        files.map(async (file) => ({
            file,
            score: await scoreImage(file),
        }))
    );

    scores.sort((a, b) => b.score - a.score);

    return scores[0].file;
};