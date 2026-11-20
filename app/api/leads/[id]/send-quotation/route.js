import { NextResponse } from "next/server";
import { getLead, saveLead } from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";
import { canSee, assigneeIds, NO_ASSIGNMENT } from "@/lib/assign";
import { canSeeRecord } from "@/lib/defaultAssignees";
import { withQuotationSnapshot } from "@/lib/quotation";

// This is the single integration point for quotation delivery. Today it records
// a manual send. When WhatsApp is connected, dispatch the message here first and
// only mark the quotation sent after the provider confirms delivery acceptance.
export async function POST(_request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead || !(await canSeeRecord(guard.user, lead))) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "open" || lead.leadStage !== "quotation") {
    return NextResponse.json({ error: "This lead is not pending at Quotation" }, { status: 409 });
  }
  if (!lead.quotationReference) {
    return NextResponse.json({ error: "Create the quotation before sending it" }, { status: 400 });
  }
  if (lead.quotationStatus === "sent") {
    return NextResponse.json({ error: "This quotation has already been sent" }, { status: 409 });
  }
  if (!lead.quotationEntity || !lead.quotationSystemType || !lead.quotationDcrType || !lead.quotationGridType) {
    return NextResponse.json({ error: "Complete the quotation configuration before sending it" }, { status: 400 });
  }
  if (!(Number(lead.kwWanted) > 0) || !(Number(lead.dealAmount) > 0)) {
    return NextResponse.json({ error: "System size and quotation price are required before sending" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const user = await getSession();
  const by = user?.name ?? "Unknown";
  const updated = {
    ...lead,
    // The quotation page only creates the quotation; the customer's answer is taken in Call Tracker.
    leadStage: "contacted",
    ...(assigneeIds(lead).length ? NO_ASSIGNMENT : {}),
    quotationStatus: "sent",
    quotationSentAt: now,
    quotationSentBy: by,
    quotationChannel: "Manual (WhatsApp integration pending)",
    quotationRevisions: withQuotationSnapshot(lead, { status: "sent", sentAt: now, sentBy: by }),
    outcome: "Quotation sent",
    nextFollowUp: "",
    updatedAt: now,
    updatedBy: by,
    followUps: [
      ...(lead.followUps ?? []),
      { at: now, type: "Quotation", outcome: "Quotation sent", nextFollowUp: "", remark: "WhatsApp integration pending", by },
    ],
  };
  await saveLead(updated);
  return NextResponse.json({
    lead: updated,
    delivery: { channel: updated.quotationChannel, providerMessageId: null, whatsappIntegrated: false },
  });
}
