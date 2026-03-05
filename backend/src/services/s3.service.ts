import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({ region: "ap-south-1" });

export const uploadToS3 = async (
    bucket: string,
    key: string,
    filePath: string
) => {
    const fileStream = fs.createReadStream(filePath);

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ContentType: "image/webp",
        })
    );
};