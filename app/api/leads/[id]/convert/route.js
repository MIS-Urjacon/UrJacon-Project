import { NextResponse } from "next/server";
import { readCases, saveCase } from "@/lib/store";
import { buildCaseRecord } from "@/lib/caseRecord";
import { hasCompletePacket, getLead, saveLead } from "@/lib/leads";
import { getSession } from "@/lib/session";

export async function POST(_request, { params }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "This lead is already converted" }, { status: 409 });
  }
  if (!lead.bpScNumber) {
    return NextResponse.json({ error: "BP SC Number is required before confirmation" }, { status: 400 });
  }
  if (!hasCompletePacket(lead)) {
    return NextResponse.json(
      { error: "Aadhaar, PAN, Passbook and Electricity Bill must be collected before confirmation" },
      { status: 400 }
    );
  }
  if (!lead.paymentMode) {
    return NextResponse.json({ error: "Select Cash or Loan before confirmation" }, { status: 400 });
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
