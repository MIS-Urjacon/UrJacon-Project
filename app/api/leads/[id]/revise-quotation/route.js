import { NextResponse } from "next/server";
import { getLead, saveLead } from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";
import { quotationVersion, withQuotationSnapshot } from "@/lib/quotation";

export async function POST(request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "open" || lead.leadStage !== "quotation") {
    return NextResponse.json({ error: "Only a pending quotation can be revised" }, { status: 409 });
  }
  if (lead.quotationStatus !== "sent") {
    return NextResponse.json({ error: "Send the current quotation before creating a revision" }, { status: 409 });
  }

  const { reason = "" } = await request.json().catch(() => ({}));
  const revisionReason = reason.toString().trim();
  if (!revisionReason) {
    return NextResponse.json({ error: "Enter the reason for revising this quotation" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const user = await getSession();
  const by = user?.name ?? "Unknown";
  const archived = withQuotationSnapshot(lead, { status: "sent" });
  const updated = {
    ...lead,
    quotationRevision: quotationVersion(lead) + 1,
    quotationRevisionReason: revisionReason,
    quotationRevisions: archived,
    quotationStatus: "draft",
    quotationCreatedAt: now,
    quotationSentAt: "",
    quotationSentBy: "",
    quotationChannel: "",
    outcome: "Quotation revision started",
    updatedAt: now,
    updatedBy: by,
  };
  await saveLead(updated);
  return NextResponse.json(updated);
}
