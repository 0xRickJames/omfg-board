import "server-only";
import { getDb } from "@/lib/mongodb";

const DOC_ID = "google-calendar";

interface GoogleAuthDoc {
  _id: string;
  refreshToken: string;
  connectedBy: string;
  connectedAt: Date;
}

export async function getStoredGoogleRefreshToken(): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection<GoogleAuthDoc>("integrations").findOne({ _id: DOC_ID });
  return doc?.refreshToken ?? null;
}

export async function storeGoogleRefreshToken(
  refreshToken: string,
  connectedBy: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<GoogleAuthDoc>("integrations").updateOne(
    { _id: DOC_ID },
    { $set: { refreshToken, connectedBy, connectedAt: new Date() } },
    { upsert: true },
  );
}

export async function getGoogleConnectionStatus(): Promise<{ connected: boolean }> {
  const token = await getStoredGoogleRefreshToken();
  return { connected: token !== null };
}
