import { NextResponse } from "next/server";
import { readUsers } from "@/lib/users";
import { getSession } from "@/lib/session";
import { canAssign } from "@/lib/assign";

// Employees a lead / case can be assigned to (admin and management only).
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAssign(me)) return NextResponse.json({ error: "Only admin or management can assign work" }, { status: 403 });
  const users = (await readUsers()).filter((u) => u.active);
  return NextResponse.json(
    users.map((u) => ({ id: u.id, name: u.name, role: u.role, pages: u.pages ?? null, active: true })).sort((a, b) => a.name.localeCompare(b.name))
  );
}
