import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { readUsers } from "@/lib/users";
import { readAssigneeDefaultsRaw, writeAssigneeDefault } from "@/lib/defaultAssignees";
import { GRANTABLE_PAGES } from "@/lib/access";

// Admin only. GET: the default assignees of every page. PUT { page, userIds }: replace one page's list.
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  return NextResponse.json(await readAssigneeDefaultsRaw());
}

export async function PUT(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { page, userIds } = await request.json().catch(() => ({}));
  if (!GRANTABLE_PAGES.includes(page)) return NextResponse.json({ error: "Unknown page" }, { status: 400 });
  if (!Array.isArray(userIds)) return NextResponse.json({ error: "Choose the assignees" }, { status: 400 });
  const users = await readUsers();
  const ids = [...new Set(userIds)];
  if (ids.some((id) => !users.some((u) => u.id === id && u.active))) {
    return NextResponse.json({ error: "Choose active employees only" }, { status: 400 });
  }
  await writeAssigneeDefault(page, ids);
  return NextResponse.json(await readAssigneeDefaultsRaw());
}
