import { NextResponse } from "next/server";
import { cleanLeadInput, readLeads, validateLead, writeLeads } from "@/lib/leads";
import { getSession, requireAdmin } from "@/lib/session";

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const input = cleanLeadInput(body);
  const error = validateLead(input);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const leads = await readLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (leads[index].status === "converted") {
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
  const followUps = [...(leads[index].followUps ?? [])];
  if (hasFollowUp) {
    followUps.push({
      at: now,
      type: (followUp.type ?? "Call").toString().trim(),
      outcome: (followUp.outcome ?? "").toString().trim(),
      nextFollowUp: input.nextFollowUp,
      remark: (followUp.remark ?? "").toString().trim(),
      by: user?.name ?? "Unknown",
    });
  }

  const updated = {
    ...leads[index],
    ...input,
    status: action === "lost" ? "lost" : "open",
    lostReason: action === "lost" ? lostReason : "",
    updatedAt: now,
    updatedBy: user?.name ?? "Unknown",
    followUps,
  };
  leads[index] = updated;
  await writeLeads(leads);
  return NextResponse.json(updated);
}

// Admin-only cleanup endpoint. There is intentionally no delete button in the
// lead UI because history should normally be retained.
export async function DELETE(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const leads = await readLeads();
  if (!leads.some((lead) => lead.id === id)) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  await writeLeads(leads.filter((lead) => lead.id !== id));
  return NextResponse.json({ ok: true });
}
