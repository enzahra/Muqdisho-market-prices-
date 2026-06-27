import { NextResponse } from "next/server";

/** Disabled — admin must sign in with email and password on /admin-login. */
export async function POST() {
  return NextResponse.json(
    { error: "Fadlan ku gal email-ka iyo password-kaaga /admin-login." },
    { status: 401 }
  );
}
