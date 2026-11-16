import { NextResponse } from "next/server";
import { readUsers, writeUsers, hashPassword, publicUser } from "@/lib/users";
import { requireAdmin } from "@/lib/session";

const ROLES = ["admin", "user"];

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  return NextResponse.json((await readUsers()).map(publicUser));
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const b = await request.json().catch(() => ({}));
  const username = String(b.username ?? "").trim();
  const name = String(b.name ?? "").trim();
  const password = String(b.password ?? "");
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 letters, numbers, dot, dash or underscore" },
      { status: 400 }
    );
  }
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Enter the user's name" }, { status: 400 });
  }
  if (!ROLES.includes(b.role)) return NextResponse.json({ error: "Select a role" }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  const users = await readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return NextResponse.json({ error: "This username already exists" }, { status: 409 });
  }
  const next = Math.max(0, ...users.map((u) => Number(u.id.split("-")[1]))) + 1;
  const user = {
    id: `U-${String(next).padStart(4, "0")}`,
    username,
    name,
    role: b.role,
    active: true,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return NextResponse.json(publicUser(user), { status: 201 });
}
