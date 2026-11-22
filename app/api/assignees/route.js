import { NextResponse } from "next/server";
import { readUsers } from "@/lib/users";
import { getSession } from "@/lib/session";
import { canManagePageAssignment } from "@/lib/assign";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";

// Employees a lead / case can be assigned to. Admin / management and the
// assignees of the requested page may use this list.
export async function GET(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const users = (await readUsers()).filter((u) => u.active);
  const page = new URL(request.url).searchParams.get("page") ?? "";
  if (!canManagePageAssignment(me, page, await readAssigneeDefaults(users))) {
    return NextResponse.json({ error: "Only admin or this page's assignees can assign work" }, { status: 403 });
  }
  return NextResponse.json(
    users.map((u) => ({ id: u.id, name: u.name, role: u.role, pages: u.pages ?? null, active: true })).sort((a, b) => a.name.localeCompare(b.name))
  );
}
