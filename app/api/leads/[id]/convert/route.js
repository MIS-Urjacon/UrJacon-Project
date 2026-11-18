import { NextResponse } from "next/server";
import { readCases, saveCase } from "@/lib/store";
import { buildCaseRecord } from "@/lib/caseRecord";
import { hasCompletePacket, getLead, saveLead } from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";

export async function POST(_request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "This lead is already converted" }, { status: 409 });
  }
  if (lead.leadStage !== "documentsReady") {
    return NextResponse.json({ error: "Complete the quotation and document packet before Name Check" }, { status: 400 });
  }
  if (!lead.quotationReference) {
    return NextResponse.json({ error: "Quotation Reference is required before Name Check" }, { status: 400 });
  }
  if (lead.quotationStatus !== "sent") {
    return NextResponse.json({ error: "Send the quotation before moving to Document Verification" }, { status: 400 });
  }
  if (!lead.bpScNumber) {
    return NextResponse.json({ error: "BP SC Number is required before confirmation" }, { status: 400 });
  }
  if (!hasCompletePacket(lead)) {
    return NextResponse.json(
      { error: "Aadhaar, PAN, Passbook, Electricity Bill and Terrace Geotag must be collected before confirmation" },
      { status: 400 }
    );
  }
  if (!lead.paymentMode) {
    return NextResponse.json({ error: "Select a payment mode before confirmation" }, { status: 400 });
  }
  if (!lead.state || !lead.email || !lead.productCode || !(Number(lead.kwWanted) > 0)) {
    return NextResponse.json({ error: "State, Email, Product Code and System kW are required in the handover packet" }, { status: 400 });
  }
  if (lead.source === "Agent" && !(Number(lead.commission) > 0)) {
    return NextResponse.json({ error: "Agent Commission is required for an agent case" }, { status: 400 });
  }

  const cases = await readCases();
  const now = new Date().toISOString();
  const result = buildCaseRecord(cases, lead, { leadId: lead.id, now });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = await getSession();
  lead.status = "converted";
  lead.leadStage = "documentsReady";
  lead.convertedCaseId = result.record.id;
  lead.convertedAt = now;
  lead.updatedAt = now;
  lead.updatedBy = user?.name ?? "Unknown";
  await saveCase(result.record);
  await saveLead(lead);
  return NextResponse.json({ lead, case: result.record }, { status: 201 });
}
