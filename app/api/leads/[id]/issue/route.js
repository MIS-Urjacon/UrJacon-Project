import { NextResponse } from "next/server";
import { getLead, saveLead } from "@/lib/leads";
import { requireLeadWriter } from "@/lib/session";
import { canSee, assigneeIds, NO_ASSIGNMENT } from "@/lib/assign";
import { canSeeRecord } from "@/lib/defaultAssignees";
import { ISSUE_TYPES, issueFilePattern } from "@/lib/issues";

// Report an issue on a lead from Call Tracker or Quotation. From Quotation the lead goes back
// to Call Tracker; from Call Tracker it stays, flagged. The issue is cleared when the next call
// outcome is recorded (see PUT /api/leads/[id]).
export async function POST(request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead || !(await canSeeRecord(guard.user, lead))) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "open") return NextResponse.json({ error: "Only an open lead can have an issue reported" }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const type = (body.type ?? "").toString();
  const description = (body.description ?? "").toString().trim().slice(0, 1000);
  if (!ISSUE_TYPES.includes(type)) return NextResponse.json({ error: "Select the issue type" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Describe the issue" }, { status: 400 });
  const files = (Array.isArray(body.files) ? body.files : [])
    .filter((f) => f && typeof f.url === "string" && issueFilePattern.test(f.url))
    .slice(0, 3)
    .map((f) => ({ url: f.url, name: (f.name ?? "Attachment").toString().slice(0, 120) }));

  const now = new Date().toISOString();
  const fromQuotation = lead.leadStage === "quotation";
  const issue = {
    open: true,
    fromStep: fromQuotation ? "quotation" : "callTracker",
    fromLabel: fromQuotation ? "Quotation" : "Call Tracker",
    type,
    description,
    files,
    reportedAt: now,
    reportedBy: guard.user.name ?? "Unknown",
  };
  const updated = {
    ...lead,
    issue,
    issues: [...(lead.issues ?? []), issue],
    leadStage: fromQuotation ? "contacted" : lead.leadStage,
    ...(fromQuotation && assigneeIds(lead).length ? NO_ASSIGNMENT : {}),
    updatedAt: now,
    updatedBy: guard.user.name ?? "Unknown",
  };
  await saveLead(updated);
  return NextResponse.json(updated);
}
