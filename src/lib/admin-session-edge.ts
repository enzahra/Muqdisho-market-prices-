/** Edge-safe session parse for middleware (Web Crypto). */
import type { AdminSessionPayload } from "@/lib/admin-session";

const COOKIE_NAME = "admin_session";

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.DATABASE_URL ||
    "muqdisho-dev-session-secret"
  );
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64urlEncode(new Uint8Array(sig));
}

export async function verifySessionTokenEdge(
  token: string
): Promise<AdminSessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = await hmacSign(body);
  if (expected !== sig) return null;

  try {
    const json = new TextDecoder().decode(base64urlDecode(body));
    const payload = JSON.parse(json) as AdminSessionPayload;
    if (!payload?.id || !payload?.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!payload.isAdmin) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function parseSessionCookieEdge(
  cookieHeader: string | null
): Promise<AdminSessionPayload | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
  );
  if (!match?.[1]) return null;
  try {
    return verifySessionTokenEdge(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
