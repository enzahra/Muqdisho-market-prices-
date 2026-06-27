import { createHmac, timingSafeEqual } from "crypto";
import { toAdminSessionUser } from "@/lib/admin-role";

export const ADMIN_SESSION_COOKIE = "admin_session";
/** Session token validity (8 hours) — cookie itself is browser-session unless user logged in. */
const MAX_AGE_SEC = 60 * 60 * 8;

export type AdminSessionPayload = {
  id: string;
  email: string;
  adminRole: string;
  isAdmin: boolean;
  exp: number;
};

export type AdminSessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  adminRole: string;
};

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.DATABASE_URL ||
    "muqdisho-dev-session-secret"
  );
}

function sign(payload: AdminSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): AdminSessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as AdminSessionPayload;
    if (!payload?.id || !payload?.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!payload.isAdmin) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: AdminSessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  return sign({
    id: user.id,
    email: user.email,
    adminRole: user.adminRole,
    isAdmin: user.isAdmin,
    exp,
  });
}

export function parseSessionCookie(cookieHeader: string | null): AdminSessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`)
  );
  if (!match?.[1]) return null;
  try {
    return verifySessionToken(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function buildClearSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function sessionUserFromPayload(
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    isAdmin?: boolean | null;
    adminRole?: string | null;
  }
): AdminSessionUser {
  return toAdminSessionUser(user);
}

export function isSessionUser(user: unknown): user is AdminSessionUser {
  if (!user || typeof user !== "object") return false;
  const u = user as AdminSessionUser;
  return Boolean(u.id && u.email && u.adminRole && u.isAdmin === true);
}
