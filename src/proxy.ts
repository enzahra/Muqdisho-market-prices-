import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionCookieEdge } from "@/lib/admin-session-edge";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin-login") {
    const session = await parseSessionCookieEdge(request.headers.get("cookie"));
    if (!session?.isAdmin) {
      const login = new URL("/admin-login", request.url);
      login.searchParams.set(
        "error",
        encodeURIComponent("Fadlan ku gal admin ahaan.")
      );
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
