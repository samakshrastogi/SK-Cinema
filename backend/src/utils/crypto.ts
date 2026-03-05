import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = crypto
    .createHash("sha256")
    .update(process.env.CREDENTIAL_SECRET!)
    .digest();

export const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted =
        cipher.update(text, "utf8", "hex") + cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
};

export const decrypt = (text: string) => {
    const [ivHex, encrypted] = text.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    return (
        decipher.update(encrypted, "hex", "utf8") +
        decipher.final("utf8")
    );
};