import "server-only";
import { timingSafeEqual, createHmac } from "node:crypto";

const KEY_PATTERN = /OMFG-\d+/i;

/** Finds the first OMFG-### ticket key in a PR title or branch name, if any. */
export function extractTicketKey(...sources: (string | null | undefined)[]): string | null {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(KEY_PATTERN);
    if (match) return match[0].toUpperCase();
  }
  return null;
}

/**
 * Verifies GitHub's `X-Hub-Signature-256` header against the raw request
 * body. Must run against the raw text body, before any JSON parsing.
 */
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(`sha256=${expected}`);
  const actualBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
