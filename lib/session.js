import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, readSession } from "@/lib/auth";
import { readUsers, publicUser } from "@/lib/users";

// The signed-in user, re-read from the user file so deleted/deactivated users
// and role changes take effect straight away. Returns null if not signed in.
export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = await readSession(token);
  if (!s) return null;
  const user = (await readUsers()).find((u) => u.id === s.id);
  return user && user.active ? publicUser(user) : null;
}

// For admin-only route handlers. Returns { user } or { error: Response }.
export async function requireAdmin() {
  const user = await getSession();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { user };
}
