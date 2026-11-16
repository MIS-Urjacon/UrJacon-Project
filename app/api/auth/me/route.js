import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (user) return NextResponse.json(user);
  // Cookie is valid but the user was removed or deactivated: clear it so /login opens.
  const res = NextResponse.json({ error: "Not signed in" }, { status: 401 });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
