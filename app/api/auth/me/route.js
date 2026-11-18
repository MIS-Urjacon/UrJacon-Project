import { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_SECONDS, createSession } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (user) {
    // Re-issue the cookie so role / page-access changes reach proxy.js without a new sign-in.
    const res = NextResponse.json(user);
    res.cookies.set(COOKIE_NAME, await createSession(user), {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
    });
    return res;
  }
  // Cookie is valid but the user was removed or deactivated: clear it so /login opens.
  const res = NextResponse.json({ error: "Not signed in" }, { status: 401 });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
