import "server-only";
import { getStoredGoogleRefreshToken } from "@/lib/googleAuth";
import { TEAM_ROSTER } from "@/lib/team";

const DAY_MS = 1000 * 60 * 60 * 24;

interface GoogleCalendarEvent {
  summary?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

async function getAccessToken(): Promise<string | null> {
  const refreshToken = await getStoredGoogleRefreshToken();
  if (!refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("Google access token refresh failed", res.status, await res.text());
    return null;
  }
  const data: { access_token: string } = await res.json();
  return data.access_token;
}

export interface OutOfOfficeEntry {
  discordId: string;
  name: string;
  start: string;
  end: string;
  summary: string;
}

/**
 * Who's currently out, per Google Calendar's native "Out of office" event
 * type — read through whoever connected via /api/google/connect, relying on
 * that person's calendar-sharing visibility into the rest of the Workspace
 * org's calendars (no per-teammate sign-in needed).
 */
export async function listCurrentOutOfOffice(): Promise<OutOfOfficeEntry[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const now = Date.now();
  const timeMin = new Date(now - DAY_MS).toISOString();
  const timeMax = new Date(now + DAY_MS * 14).toISOString();

  const results = await Promise.allSettled(
    TEAM_ROSTER.map(async (member): Promise<OutOfOfficeEntry[]> => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.googleEmail)}/events`,
      );
      url.searchParams.set("eventTypes", "outOfOffice");
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        // Most likely this person's calendar isn't shared with the connected
        // account — skip them rather than failing the whole banner.
        console.error(`Google Calendar fetch failed for ${member.googleEmail}`, res.status);
        return [];
      }

      const data: { items?: GoogleCalendarEvent[] } = await res.json();
      return (data.items ?? [])
        .filter((event) => event.start && event.end)
        .map((event) => ({
          discordId: member.discordId,
          name: member.name,
          start: (event.start.dateTime ?? event.start.date) as string,
          end: (event.end.dateTime ?? event.end.date) as string,
          summary: event.summary ?? "Out of office",
        }));
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<OutOfOfficeEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((entry) => new Date(entry.start).getTime() <= now && now < new Date(entry.end).getTime());
}
