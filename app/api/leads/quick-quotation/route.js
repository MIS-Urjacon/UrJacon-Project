import { NextResponse } from "next/server";
import { cleanLeadInput, nextLeadId, readLeads, validateLead, saveLead } from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";

// A quotation made for a client who is not a lead yet (no BP SC Number): the record is kept with status
// "quotation", so it never appears in Leads, Call Tracker, the Dashboard or Reports. It shows only on the
// Quotation page (History), where it can be viewed and revised like any other quotation.
export async function POST(request) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const input = cleanLeadInput(await request.json());
  input.bpScNumber = "";
  input.source = "Direct quotation";
  input.leadStage = "contacted";
  input.quotationStatus = "draft";
  // The number is optional for a direct quotation; the other checks stay the same.
  const error = validateLead({ ...input, mobile: input.mobile || "0000000000" });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const now = new Date().toISOString();
  const user = await getSession();
  const record = {
    id: nextLeadId(await readLeads()),
    timestamp: now,
    updatedAt: now,
    status: "quotation",
    lostReason: "",
    convertedCaseId: null,
    createdBy: user?.name ?? "Unknown",
    updatedBy: user?.name ?? "Unknown",
    followUps: [],
    ...input,
    agent: user?.name ?? "Unknown",
  };
  try {
    await saveLead(record);
  } catch (e) {
    console.error("saveLead failed:", e);
    return NextResponse.json({ error: "Could not save the quotation. Please try again." }, { status: 500 });
  }
  return NextResponse.json(record, { status: 201 });
}
