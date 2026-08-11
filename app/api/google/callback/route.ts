import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeGoogleRefreshToken } from "@/lib/googleAuth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "founder") {
    return NextResponse.json({ error: "Founders only" }, { status: 403 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured" },
      { status: 500 },
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Google token exchange failed", tokenRes.status, body);
    return NextResponse.json({ error: "Google token exchange failed" }, { status: 502 });
  }

  const tokens: { refresh_token?: string } = await tokenRes.json();
  if (!tokens.refresh_token) {
    // Google only returns a refresh_token on first consent (or a forced
    // re-consent, which the connect route requests via prompt=consent) —
    // if it's still missing, ask them to revoke access and try again.
    return NextResponse.json(
      {
        error:
          "Google didn't return a refresh token. Revoke OMFGBoard's access at https://myaccount.google.com/permissions and try connecting again.",
      },
      { status: 400 },
    );
  }

  await storeGoogleRefreshToken(tokens.refresh_token, session.user.discordId);

  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
