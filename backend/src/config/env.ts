import dotenv from "dotenv";

dotenv.config();

const placeholder = /^(PASTE_|CHANGE_ME|YOUR_)/i;
const databaseName = (process.env.DATABASE_NAME || "sk_mediaflow").trim();

const buildDatabaseUrl = () => {
    const host = process.env.MONGODB_HOST?.trim();
    const username = process.env.MONGODB_USERNAME?.trim();
    const password = process.env.MONGODB_PASSWORD;
    const authSource = (process.env.MONGODB_AUTH_SOURCE || "admin").trim();

    if (host && username && password) {
        return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host.replace(/^mongodb(?:\+srv)?:\/\//, "").replace(/\/$/, "")}/${encodeURIComponent(databaseName)}?retryWrites=true&w=majority&authSource=${encodeURIComponent(authSource)}`;
    }

    const configuredUrl = process.env.DATABASE_URL?.trim();
    if (!configuredUrl || placeholder.test(configuredUrl)) {
        throw new Error("MongoDB is not configured. Set MONGODB_HOST, MONGODB_USERNAME, MONGODB_PASSWORD and DATABASE_NAME, or provide DATABASE_URL.");
    }

    try {
        const url = new URL(configuredUrl);
        url.pathname = `/${encodeURIComponent(databaseName)}`;
        return url.toString();
    } catch {
        throw new Error("DATABASE_URL is not a valid MongoDB connection string.");
    }
};

process.env.DATABASE_URL = buildDatabaseUrl();

export const PORT = process.env.PORT;
export const DATABASE_NAME = databaseName;