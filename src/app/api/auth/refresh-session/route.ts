import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAccount, toAdminSessionUser } from "@/lib/admin-role";
import { buildSessionCookie, createSessionToken } from "@/lib/admin-session";

/** Restore HttpOnly cookie when localStorage still has a valid admin user. */
export async function POST(request: Request) {
  try {
    const { id, email } = await request.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: "ID iyo email waa lagama maarmaan." },
        { status: 400 }
      );
    }

    const lookupEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
      },
    });

    if (!user || user.email !== lookupEmail || !isAdminAccount(user)) {
      return NextResponse.json(
        { error: "Fadlan mar kale ku gal." },
        { status: 401 }
      );
    }

    const sessionUser = toAdminSessionUser(user);
    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({
      message: "Session refreshed",
      user: sessionUser,
    });
    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Refresh session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
