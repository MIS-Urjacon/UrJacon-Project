import { NextResponse } from "next/server";
import {
  cleanLeadInput,
  nextLeadId,
  readLeads,
  validateLead,
  saveLead,
} from "@/lib/leads";
import { getSession } from "@/lib/session";

export async function GET() {
  return NextResponse.json(await readLeads());
}

export async function POST(request) {
  const input = cleanLeadInput(await request.json());
  const error = validateLead(input);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const leads = await readLeads();
  const duplicate = leads.find(
    (lead) => lead.status === "open" && lead.mobile.replace(/\D/g, "") === input.mobile.replace(/\D/g, "")
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `An open lead with this mobile number already exists (${duplicate.id})` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const user = await getSession();
  const record = {
    id: nextLeadId(leads),
    timestamp: now,
    updatedAt: now,
    status: "open",
    lostReason: "",
    convertedCaseId: null,
    createdBy: user?.name ?? "Unknown",
    updatedBy: user?.name ?? "Unknown",
    followUps: [],
    ...input,
  };
  try {
    await saveLead(record);
  } catch (e) {
    console.error("saveLead failed:", e);
    return NextResponse.json(
      { error: "Could not save the lead. Please check the database settings and try again." },
      { status: 500 }
    );
  }
  return NextResponse.json(record, { status: 201 });
}
