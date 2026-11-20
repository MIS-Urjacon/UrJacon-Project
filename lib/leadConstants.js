export const LEAD_STAGES = ["new", "contacted", "quotation", "documentsReady"];

export const LEAD_STAGE_LABEL = {
  new: "New lead",
  contacted: "Contacted",
  quotation: "Quotation pending",
  documentsReady: "Documents ready",
};

// Stage text for a lead, using its quotation status: a sent quotation shows "Quotation sent" (with
// the revision) instead of the plain stage, and a quotation being prepared shows as pending.
export function leadStageLabel(lead) {
  const stage = lead?.leadStage;
  const rev = Number(lead?.quotationRevision) > 0 ? ` (R${lead.quotationRevision})` : "";
  if (stage === "documentsReady") return LEAD_STAGE_LABEL.documentsReady;
  if (lead?.quotationStatus === "sent" && (stage === "contacted" || stage === "quotation")) return `Quotation sent${rev}`;
  if (stage === "quotation") return rev ? `Revision pending${rev}` : LEAD_STAGE_LABEL.quotation;
  return LEAD_STAGE_LABEL[stage];
}

// Call Tracker shows only the quotation state: sent (with the revision) or still pending.
export function quotationStageLabel(lead) {
  const rev = Number(lead?.quotationRevision) > 0 ? ` (R${lead.quotationRevision})` : "";
  return lead?.quotationStatus === "sent" ? `Quotation sent${rev}` : "Quotation pending";
}

// Visit assignments of a lead, oldest first, from its interaction history: who was sent, when the
// visit was planned, who assigned it, and the result recorded at the next Visit entry (if any).
export function visitHistory(lead) {
  const list = lead?.followUps ?? [];
  return list.flatMap((item, index) => {
    if (item.outcome !== "Visit required" || !item.visitBy) return [];
    const next = list.slice(index + 1).find((later) => later.type === "Visit" || later.outcome === "Visit required");
    const result = next?.type === "Visit" ? next : null;
    return [{
      visitBy: item.visitBy,
      plannedFor: item.nextFollowUp,
      assignedAt: item.at,
      assignedBy: item.by,
      result: result ? result.outcome : "",
      resultRemark: result?.remark ?? "",
      resultAt: result?.at ?? "",
    }];
  });
}

export const REQUIRED_LEAD_DOCS = ["aadhaar", "pan", "passbook", "bill", "terracePhoto"];
