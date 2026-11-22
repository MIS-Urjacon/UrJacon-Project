import { NextResponse } from "next/server";
import { readCases, saveCase } from "@/lib/store";
import { buildCaseRecord } from "@/lib/caseRecord";
import { getLead, saveLead } from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";
import { canSee } from "@/lib/assign";
import { canSeeRecord } from "@/lib/defaultAssignees";

export async function POST(_request, { params }) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead || !(await canSeeRecord(guard.user, lead))) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "This lead is already converted" }, { status: 409 });
  }
  if (lead.leadStage !== "documentsReady") {
    return NextResponse.json({ error: "Complete the handover packet before Document Receive" }, { status: 400 });
  }
  if (!lead.bpScNumber) {
    return NextResponse.json({ error: "BP SC Number is required before confirmation" }, { status: 400 });
  }
  // The handover documents (Aadhaar, PAN, Passbook, Bill, Terrace Geotag) are optional here; Document Receive collects them.
  // The payment mode is chosen at Document Receive, so it is not required here.
  if (!lead.state || !lead.email) {
    return NextResponse.json({ error: "State and Email are required in the handover packet" }, { status: 400 });
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

// payment mode is chosen at Document Receive
