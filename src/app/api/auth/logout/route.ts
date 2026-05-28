import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  response.headers.set("Set-Cookie", buildClearSessionCookie());
  return response;
}
