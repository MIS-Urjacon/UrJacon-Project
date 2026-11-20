import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { getLead, saveLead } from "@/lib/leads";
import { readUsers } from "@/lib/users";
import { getSession } from "@/lib/session";
import { canAssign } from "@/lib/assign";

// Assign leads / cases to one or several employees: { type: "lead" | "case", ids: [], userIds: [] }.
// An empty userIds list removes the assignment (everyone with the page access sees the work again).
// Only admin and management can assign.
export async function POST(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAssign(me)) return NextResponse.json({ error: "Only admin or management can assign work" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const type = body.type;
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : [];
  const wanted = Array.isArray(body.userIds) ? body.userIds.map(String) : body.userId ? [String(body.userId)] : [];
  if (!["lead", "case"].includes(type) || ids.length === 0) {
    return NextResponse.json({ error: "Select what to assign" }, { status: 400 });
  }
  const users = (await readUsers()).filter((u) => u.active);
  const assignees = [...new Set(wanted)].map((id) => users.find((u) => u.id === id));
  if (assignees.some((u) => !u)) return NextResponse.json({ error: "Select active employees only" }, { status: 400 });

  const now = new Date().toISOString();
  const fields = assignees.length
    ? {
        assignedToIds: assignees.map((u) => u.id),
        assignedTo: assignees[0].id,
        assignedToName: assignees.map((u) => u.name).join(", "),
        assignedBy: me.name,
        assignedAt: now,
      }
    : { assignedToIds: [], assignedTo: "", assignedToName: "", assignedBy: "", assignedAt: "" };
  let done = 0;
  for (const id of ids) {
    const record = type === "case" ? await getCase(id) : await getLead(id);
    if (!record) continue;
    const updated = { ...record, ...fields };
    if (type === "case") await saveCase(updated);
    else await saveLead(updated);
    done++;
  }
  if (done === 0) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const noun = `${done} ${type === "case" ? "case" : "lead"}${done > 1 ? "s" : ""}`;
  return NextResponse.json({
    ok: true,
    message: assignees.length
      ? `Assigned ${noun} to ${assignees.map((u) => u.name).join(", ")}.`
      : `Assignment removed from ${noun}. Everyone with access to that page can see ${done > 1 ? "them" : "it"}.`,
  });
}
