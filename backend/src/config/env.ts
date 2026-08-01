import dotenv from "dotenv";

dotenv.config();

const placeholder = /^(PASTE_|CHANGE_ME|YOUR_)/i;
const configuredUrl = process.env.DATABASE_URL?.trim();
const databaseName = process.env.DATABASE_NAME?.trim();

if (!configuredUrl || placeholder.test(configuredUrl)) {
    throw new Error("MongoDB is not configured. Set DATABASE_URL to the complete MongoDB connection string.");
}
if (!databaseName || placeholder.test(databaseName)) {
    throw new Error("MongoDB database name is not configured. Set DATABASE_NAME.");
}
if (!/^mongodb(?:\+srv)?:\/\//i.test(configuredUrl)) {
    throw new Error("DATABASE_URL must use the mongodb:// or mongodb+srv:// protocol.");
}

const queryIndex = configuredUrl.indexOf("?");
const connectionPart = queryIndex === -1 ? configuredUrl : configuredUrl.slice(0, queryIndex);
const queryPart = queryIndex === -1 ? "" : configuredUrl.slice(queryIndex);
const authorityStart = configuredUrl.indexOf("://") + 3;
const pathIndex = connectionPart.indexOf("/", authorityStart);
const authority = pathIndex === -1 ? connectionPart : connectionPart.slice(0, pathIndex);

if (!authority.slice(authorityStart).includes("@")) {
    throw new Error("DATABASE_URL must include MongoDB credentials.");
}

process.env.DATABASE_URL = `${authority}/${encodeURIComponent(databaseName)}${queryPart}`;

export const PORT = process.env.PORT;
export const DATABASE_NAME = databaseName;