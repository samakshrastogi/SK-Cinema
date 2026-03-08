import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3"

import fs from "fs"
import { pipeline } from "stream/promises"

const s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1"
})

export const uploadFile = async (
    bucket: string,
    key: string,
    filePath: string,
    contentType?: string
) => {

    const fileStream = fs.createReadStream(filePath)

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ContentType: contentType || "application/octet-stream"
        })
    )

    return key

}

export const uploadBuffer = async (
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType?: string
) => {

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType || "application/octet-stream"
        })
    )

    return key

}

export const downloadFile = async (
    bucket: string,
    key: string,
    outputPath: string
) => {

    const object = await s3.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key
        })
    )

    await pipeline(object.Body as any, fs.createWriteStream(outputPath))

    return outputPath

}

export { s3 }