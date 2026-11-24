import { NextResponse } from "next/server";
import { cleanLeadInput, getLead, validateLead, saveLead, removeLead } from "@/lib/leads";
import { getSession, requireAdmin } from "@/lib/session";
import { requireLeadWriter } from "@/lib/session";
import { canSee, assigneeIds, NO_ASSIGNMENT } from "@/lib/assign";
import { canSeeRecord } from "@/lib/defaultAssignees";

export async function PUT(request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await request.json();
  const input = cleanLeadInput(body);
  const current = await getLead(id);
  if (!current || !(await canSeeRecord(guard.user, current))) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  // A direct quotation (no BP SC Number) may have no mobile number.
  const direct = current.status === "quotation";
  const error = validateLead(direct ? { ...input, mobile: input.mobile || "0000000000" } : input);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (current.status === "converted") {
    return NextResponse.json({ error: "Converted leads cannot be edited" }, { status: 409 });
  }

  const action = body.action ?? "save";
  if (!["save", "lost", "reopen"].includes(action)) {
    return NextResponse.json({ error: "Invalid lead action" }, { status: 400 });
  }
  const lostReason = (body.lostReason ?? "").toString().trim();
  if (action === "lost" && !lostReason) {
    return NextResponse.json({ error: "Lost reason is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const user = await getSession();
  const followUp = body.followUp ?? {};
  const hasFollowUp = [followUp.type, followUp.outcome, followUp.remark].some((value) =>
    value?.toString().trim()
  );
  const followUps = [...(current.followUps ?? [])];
  if (hasFollowUp) {
    followUps.push({
      at: now,
      type: (followUp.type ?? "Call").toString().trim(),
      outcome: (followUp.outcome ?? "").toString().trim(),
      nextFollowUp: input.nextFollowUp,
      remark: (followUp.remark ?? "").toString().trim(),
      ...(followUp.visitBy ? { visitBy: followUp.visitBy.toString().trim().slice(0, 120) } : {}),
      by: user?.name ?? "Unknown",
    });
  }

  const updated = {
    ...current,
    ...input,
    // The staff owner is assigned at creation from the authenticated session.
    agent: current.agent || user?.name || "Unknown",
    status: direct ? "quotation" : action === "lost" ? "lost" : "open",
    lostReason: action === "lost" ? lostReason : "",
    updatedAt: now,
    updatedBy: user?.name ?? "Unknown",
    followUps,
  };
  if (input.leadStage !== current.leadStage && assigneeIds(current).length) Object.assign(updated, NO_ASSIGNMENT);
  if (current.issue?.open && hasFollowUp) {
    updated.issue = { ...current.issue, open: false, resolvedAt: now, resolvedBy: user?.name ?? "Unknown" };
  }
  await saveLead(updated);
  return NextResponse.json(updated);
}

// Admin-only cleanup endpoint. There is intentionally no delete button in the
// lead UI because history should normally be retained.
export async function DELETE(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await getLead(id))) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  await removeLead(id);
  return NextResponse.json({ ok: true });
}
