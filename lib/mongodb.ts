import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  // Cached at module scope so both dev (survives HMR) and the long-running
  // Railway server (one process) reuse a single connection pool.
  if (!global._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI environment variable");
    }
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db();
}
