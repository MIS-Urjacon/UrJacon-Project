import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { getLead, saveLead } from "@/lib/leads";
import { readUsers } from "@/lib/users";
import { getSession } from "@/lib/session";
import { canAssign, canManagePageAssignment, recordIsOnPage } from "@/lib/assign";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";
import { logAssignments } from "@/lib/assignments";
import { STEPS } from "@/lib/steps";

// Assign leads / cases to one or several employees: { type: "lead" | "case", ids: [], userIds: [] }.
// An empty userIds list removes the assignment (everyone with the page access sees the work again).
// Admin / management can assign globally. A page's assignees can assign only
// records currently on their page.
export async function POST(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = body.type;
  const page = String(body.page ?? "");
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : [];
  const wanted = Array.isArray(body.userIds) ? body.userIds.map(String) : body.userId ? [String(body.userId)] : [];
  if (!["lead", "case"].includes(type) || ids.length === 0) {
    return NextResponse.json({ error: "Select what to assign" }, { status: 400 });
  }
  const users = (await readUsers()).filter((u) => u.active);
  const globalAccess = canAssign(me);
  if (!canManagePageAssignment(me, page, await readAssigneeDefaults(users))) {
    return NextResponse.json({ error: "Only admin or this page's assignees can assign work" }, { status: 403 });
  }
  const assignees = [...new Set(wanted)].map((id) => users.find((u) => u.id === id));
  if (assignees.some((u) => !u)) return NextResponse.json({ error: "Select active employees only" }, { status: 400 });

  const now = new Date().toISOString();
  // The "assign date" picked in the dialog (default today, India time; never in the future).
  const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const pickedOn = String(body.assignedOn ?? "");
  const assignedOn = /^\d{4}-\d{2}-\d{2}$/.test(pickedOn) && !isNaN(Date.parse(pickedOn)) && pickedOn <= todayIst ? pickedOn : todayIst;
  const fields = assignees.length
    ? {
        assignedToIds: assignees.map((u) => u.id),
        assignedTo: assignees[0].id,
        assignedToName: assignees.map((u) => u.name).join(", "),
        assignedBy: me.name,
        assignedAt: now,
      }
    : { assignedToIds: [], assignedTo: "", assignedToName: "", assignedBy: "", assignedAt: "" };
  const records = [];
  for (const id of ids) {
    const record = type === "case" ? await getCase(id) : await getLead(id);
    if (!record) continue;
    if (!globalAccess && !recordIsOnPage(record, page)) {
      return NextResponse.json({ error: "You can assign only work currently on your page" }, { status: 403 });
    }
    records.push(record);
  }
  if (records.length === 0) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  let done = 0;
  for (const record of records) {
    const updated = page === "site-survey"
      ? {
          ...record,
          surveyAssignedToIds: fields.assignedToIds,
          surveyAssignedTo: fields.assignedTo,
          surveyAssignedToName: fields.assignedToName,
          surveyAssignedBy: fields.assignedBy,
          surveyAssignedAt: fields.assignedAt,
        }
      : { ...record, ...fields };
    if (type === "case") await saveCase(updated);
    else await saveLead(updated);
    done++;
  }
  // Track it: one log row per assignee (their bell message), or one "removed" row.
  const pageLabel = STEPS.find((step) => step.slug === page)?.title ?? page;
  const entry = (record) => ({
    recordType: type, recordId: record.id, customerName: record.customerName ?? "", bpScNumber: record.bpScNumber ?? "",
    kind: "temporary", page, pageLabel, assignedById: me.id, assignedByName: me.name, assignedOn, assignedAt: now,
  });
  await logAssignments(records.flatMap((record) => assignees.length
    ? assignees.map((u) => ({ ...entry(record), action: "assigned", assignedToId: u.id, assignedToName: u.name }))
    : [{ ...entry(record), action: "removed", assignedToId: "", assignedToName: "" }]));
  const noun = `${done} ${type === "case" ? "case" : "lead"}${done > 1 ? "s" : ""}`;
  return NextResponse.json({
    ok: true,
    message: assignees.length
      ? `Assigned ${noun} to ${assignees.map((u) => u.name).join(", ")}.`
      : `Assignment removed from ${noun}. The page's normal assignees can see ${done > 1 ? "them" : "it"}.`,
  });
}
