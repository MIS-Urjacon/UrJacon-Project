import { NextResponse } from "next/server";
import { readUsers } from "@/lib/users";
import { getSession } from "@/lib/session";

// Active employees (id + name only), e.g. for "Visit By" in Call Tracker. Any signed-in user.
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const users = (await readUsers()).filter((u) => u.active && u.role !== "admin");
  return NextResponse.json(users.map((u) => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)));
}
