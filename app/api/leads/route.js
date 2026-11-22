import { NextResponse } from "next/server";
import {
  cleanLeadInput,
  nextLeadId,
  readLeads,
  validateLead,
  saveLead,
} from "@/lib/leads";
import { getSession, requireLeadWriter } from "@/lib/session";
import { canSee, withAssignees } from "@/lib/assign";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";
import { readUsers } from "@/lib/users";

export async function GET() {
  const me = await getSession();
  const users = await readUsers();
  const defaults = await readAssigneeDefaults(users);
  return NextResponse.json((await readLeads()).filter((lead) => canSee(me, lead, defaults)).map((lead) => withAssignees(lead, users, defaults)));
}

export async function POST(request) {
  const guard = await requireLeadWriter();
  if (guard.error) return guard.error;
  const input = cleanLeadInput(await request.json());
  const error = validateLead(input) || (input.bpScNumber ? null : "BP SC Number is required for a new lead");
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
    // Never trust a client-entered staff name. Lead ownership comes from the session.
    agent: user?.name ?? "Unknown",
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
