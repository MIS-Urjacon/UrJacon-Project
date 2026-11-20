"use client";
import { useCallback } from "react";
import LeadPipelinePage from "@/components/leads/LeadPipelinePage";
import CallTrackerForm from "@/components/leads/CallTrackerForm";
import { quotationStageLabel, visitHistory } from "@/lib/leadConstants";

const two = (top, bottom) => <div className="leading-tight"><div className="text-slate-700">{top || "-"}</div><div className="text-xs text-slate-400">{bottom || "-"}</div></div>;
const EXTRA_COLUMNS = [
  { key: "bp", label: "BP SC Number", render: (lead) => <span className="font-mono text-[13px] font-medium text-slate-700">{lead.bpScNumber || "-"}</span> },
  { key: "location", label: "Village / State", render: (lead) => two(lead.village, lead.state) },
  { key: "product", label: "Brand / Product", render: (lead) => two(lead.brand, [lead.productInterested, lead.pricing].filter(Boolean).join(" · ")) },
  { key: "remark", label: "Remark / Last Outcome", render: (lead) => <div className="max-w-[200px] leading-tight"><div className="truncate text-slate-700" title={lead.remark}>{lead.remark || "-"}</div><div className="text-xs text-slate-400">{lead.outcome || "-"}</div></div> },
  { key: "visit", label: "Visit Assigned", render: (lead) => <VisitCell lead={lead} /> },
];

const shortDate = (value) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

// Who is going for the visit now (or went last), with the number of visits so far.
function VisitCell({ lead }) {
  const visits = visitHistory(lead);
  if (!visits.length) return <span className="text-slate-300">-</span>;
  const last = visits.at(-1);
  const open = Boolean(lead.visitBy);
  const title = visits.map((v, i) => `${i + 1}. ${v.visitBy} · ${shortDate(v.plannedFor) || "-"} · ${v.result || "Pending"}`).join("\n");
  return (
    <div className="max-w-44 leading-tight" title={title}>
      <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
        <span className="truncate">{open ? lead.visitBy : last.visitBy}</span>
      </span>
      <div className="mt-1 text-[11px] text-slate-400">
        {open ? `Visit ${shortDate(lead.nextFollowUp) || "pending"}` : `Last: ${last.result || "done"}`} · {visits.length} visit{visits.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function CallTrackerPage() {
  // A lead with a sent quotation (or a ready packet) is back here for the customer's answer.
  const filter = useCallback((row) => ["new", "contacted", "documentsReady"].includes(row.leadStage) || (row.leadStage === "quotation" && row.quotationStatus === "sent"), []);
  return <LeadPipelinePage title="Call Tracker" subtitle="Step 2 · Call or visit each lead. Quotations are made on the Quotation page by BP SC Number; once a quotation is sent the lead is here, where you record the customer's answer and confirm Document Given to go to Document Verification." filter={filter} extraColumns={EXTRA_COLUMNS} Form={CallTrackerForm} stageLabel={quotationStageLabel} modalTitle="Record call outcome" />;
}
