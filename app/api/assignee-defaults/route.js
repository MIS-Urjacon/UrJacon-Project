import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { readUsers } from "@/lib/users";
import { readAssigneeDefaultsRaw, writeAssigneeDefault } from "@/lib/defaultAssignees";
import { GRANTABLE_PAGES } from "@/lib/access";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";
import { logAssignments } from "@/lib/assignments";
import { STEPS } from "@/lib/steps";

// Admin only. GET: the default assignees of every page. PUT { page, userIds }: replace one page's list.
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  return NextResponse.json(await readAssigneeDefaultsRaw());
}

export async function PUT(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { page, userIds, assignedOn: pickedOn } = await request.json().catch(() => ({}));
  if (!GRANTABLE_PAGES.includes(page)) return NextResponse.json({ error: "Unknown page" }, { status: 400 });
  if (!Array.isArray(userIds)) return NextResponse.json({ error: "Choose the assignees" }, { status: 400 });
  const users = await readUsers();
  const ids = [...new Set(userIds)];
  if (ids.some((id) => !users.some((u) => u.id === id && u.active))) {
    return NextResponse.json({ error: "Choose active employees only" }, { status: 400 });
  }
  // Who had this page before and who has it now (an empty list falls back to the page owners).
  const before = (await readAssigneeDefaults(users))[page] ?? [];
  await writeAssigneeDefault(page, ids);
  const after = (await readAssigneeDefaults(users))[page] ?? [];
  // Permanent assignment: log who got the page (and who lost it), with the assign date.
  const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const picked = String(pickedOn ?? "");
  const assignedOn = /^\d{4}-\d{2}-\d{2}$/.test(picked) && !isNaN(Date.parse(picked)) && picked <= todayIst ? picked : todayIst;
  const now = new Date().toISOString();
  const entry = (id, action) => ({
    recordType: "page", recordId: page, customerName: "All work on this page", bpScNumber: "", kind: "permanent", action,
    page, pageLabel: STEPS.find((step) => step.slug === page)?.title ?? page,
    assignedToId: id, assignedToName: users.find((u) => u.id === id)?.name ?? "",
    assignedById: auth.user.id, assignedByName: auth.user.name, assignedOn, assignedAt: now,
  });
  await logAssignments([
    ...after.filter((id) => !before.includes(id)).map((id) => entry(id, "assigned")),
    ...before.filter((id) => !after.includes(id)).map((id) => entry(id, "removed")),
  ]);
  return NextResponse.json(await readAssigneeDefaultsRaw());
}
