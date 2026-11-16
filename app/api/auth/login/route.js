import { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_SECONDS, createSession } from "@/lib/auth";
import { readUsers, verifyPassword, publicUser } from "@/lib/users";

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  const users = await readUsers();
  const user = users.find(
    (u) => u.active && u.username.toLowerCase() === String(username ?? "").trim().toLowerCase()
  );
  const ok = user && verifyPassword(String(password ?? ""), user.passwordHash);
  if (!ok) {
    // Same message for a wrong username or password, plus a short delay.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const res = NextResponse.json(publicUser(user));
  res.cookies.set(COOKIE_NAME, await createSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
}
