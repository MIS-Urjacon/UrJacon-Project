import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canAssign } from "@/lib/assign";
import { readAssignments, markAssignmentsSeen } from "@/lib/assignments";
import { readLeads } from "@/lib/leads";
import { readCases } from "@/lib/store";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";

// GET /api/assignments        -> the assignment log: admin / management see all, everyone else only theirs.
// GET /api/assignments?mine=1 -> only what was assigned to me (the bell), with the unread count.
// POST { action: "seen" }     -> mark my new assignments as read.
export async function GET(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const mine = new URL(request.url).searchParams.get("mine") === "1";
  const { rows, available } = await readAssignments();
  const forMe = rows.filter((row) => row.assignedToId === me.id && row.action === "assigned");
  const unseen = forMe.filter((row) => !row.seenAt).length;
  if (mine) return NextResponse.json({ available, unseen, rows: forMe.slice(0, 8) });

  const visible = canAssign(me) ? rows : forMe;
  // Active = the work still carries this very assignment; once it moved on (or was reassigned) it is closed.
  const [leads, cases] = await Promise.all([readLeads(), readCases()]);
  const records = new Map([...leads, ...cases].map((record) => [record.id, record]));
  // A permanent (Settings) assignment is active while the person is still a default assignee of that page
  // and no newer permanent row for the same person and page replaced it.
  const defaults = await readAssigneeDefaults();
  const latest = new Map();
  for (const row of rows) if (row.kind === "permanent" && !latest.has(`${row.page}|${row.assignedToId}`)) latest.set(`${row.page}|${row.assignedToId}`, row.id);
  const withStatus = visible.map((row) => {
    if (row.action === "removed") return { ...row, status: "Removed" };
    if (row.kind === "permanent") {
      const current = latest.get(`${row.page}|${row.assignedToId}`) === row.id && (defaults[row.page] ?? []).includes(row.assignedToId);
      return { ...row, status: current ? "Active" : "Closed" };
    }
    const record = records.get(row.recordId);
    const stamp = row.page === "site-survey" ? record?.surveyAssignedAt : record?.assignedAt;
    return { ...row, status: stamp && stamp === row.assignedAt ? "Active" : "Closed" };
  });
  return NextResponse.json({ available, unseen, all: canAssign(me), rows: withStatus });
}

export async function POST(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.action !== "seen") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  await markAssignmentsSeen(me.id);
  return NextResponse.json({ ok: true });
}
