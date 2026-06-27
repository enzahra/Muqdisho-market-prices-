/** Fetch for admin panel — sends session cookie. */
export function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
    },
  });
}

export type AdminJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

/** Safe JSON parse — avoids "Unexpected end of JSON input". */
export async function parseAdminJson<T = unknown>(
  response: Response
): Promise<AdminJsonResult<T>> {
  const status = response.status;
  let text = "";
  try {
    text = await response.text();
  } catch {
    return {
      ok: false,
      status,
      data: null,
      error: "Jawaabta server-ka lama akhrin karo.",
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      status,
      data: null,
      error:
        status === 401
          ? "Fadlan mar kale ku gal (session-ka wuu dhacay)."
          : `Server-ka jawaab madhan ayuu soo celiyay (${status}).`,
    };
  }

  try {
    const data = JSON.parse(text) as T;
    if (!response.ok) {
      const err =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Cilad server (${status})`;
      return { ok: false, status, data, error: err };
    }
    return { ok: true, status, data };
  } catch {
    return {
      ok: false,
      status,
      data: null,
      error: "Jawaabta server-ka ma ahan JSON sax ah.",
    };
  }
}

/** Verify admin session via HttpOnly cookie — never restore without password. */
export async function verifyAdminAuth(): Promise<{
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  adminRole: string;
} | null> {
  const me = await parseAdminJson<{ user?: {
    id: string;
    email: string;
    fullName: string | null;
    isAdmin: boolean;
    adminRole: string;
  } }>(
    await adminFetch("/api/auth/me", { cache: "no-store" })
  );
  if (me.ok && me.data?.user?.isAdmin) {
    localStorage.setItem("user", JSON.stringify(me.data.user));
    return me.data.user;
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
  }
  return null;
}

export async function adminLogout() {
  await adminFetch("/api/auth/logout", { method: "POST" });
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
  }
}
