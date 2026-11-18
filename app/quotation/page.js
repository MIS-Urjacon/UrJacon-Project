"use client";

import { useCallback } from "react";
import { FileText } from "lucide-react";
import LeadPipelinePage from "@/components/leads/LeadPipelinePage";
import QuotationForm from "@/components/leads/QuotationForm";
import { DateCell, Pill } from "@/components/ui";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const HISTORY_COLUMNS = [
  {
    key: "quotation",
    label: "Quotation",
    render: (row) => <div><div className="font-semibold text-slate-700">{row.quotationReference || "-"}</div><div className="mt-1"><Pill color={row.quotationStatus === "sent" ? "green" : "amber"}>{row.quotationStatus === "sent" ? "Sent" : "Draft"}</Pill></div></div>,
  },
  { key: "quotationCreatedAt", label: "Quotation Created", render: (row) => <DateCell value={row.quotationCreatedAt} /> },
  {
    key: "amount",
    label: "Amount",
    render: (row) => <div><div className="font-semibold text-slate-700">{money(row.dealAmount)}</div><div className="text-xs text-slate-400">{row.kwWanted ? `${row.kwWanted} kW` : "-"}</div></div>,
  },
  { key: "image", label: "Image / PDF", render: (row) => <QuotationFile file={row.quotationFiles?.[0]} /> },
];

function QuotationFile({ file }) {
  if (!file) return <span className="text-slate-400">Not uploaded</span>;
  return <a href={file.url} target="_blank" rel="noreferrer" title={file.name} className="inline-flex h-14 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-brand-dark">{file.url.endsWith(".pdf") ? <FileText size={24} /> : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={file.url} alt={file.name || "Quotation"} className="h-full w-full object-cover" />
  )}</a>;
}

export default function QuotationPage() {
  // Pending = quotation still to be created / sent (including a started revision).
  const filter = useCallback((row) => row.leadStage === "quotation" && row.quotationStatus !== "sent", []);
  const historyFilter = useCallback((row) => Boolean(row.quotationStatus && row.quotationCreatedAt), []);
  return <LeadPipelinePage title="Quotation & Documents" subtitle="Step 3 · Create and send the quotation, or revise a sent one from History. After sending, the lead returns to Call Tracker for the customer's answer." filter={filter} historyFilter={historyFilter} historyColumns={HISTORY_COLUMNS} Form={QuotationForm} modalTitle="Create, send and track quotation" />;
}
