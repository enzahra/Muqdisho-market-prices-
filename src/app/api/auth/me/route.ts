import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ user: auth.admin });
}
