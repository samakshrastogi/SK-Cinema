import sharp from "sharp";

export const optimizeThumbnail = async (
    input: string,
    output: string
) => {
    await sharp(input)
        .webp({ quality: 85 })
        .toFile(output);
};