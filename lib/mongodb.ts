import mongoose from "mongoose";

declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cache = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.conn) return cache.conn;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  cache.promise ||= mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  cache.conn = await cache.promise;
  return cache.conn;
}
