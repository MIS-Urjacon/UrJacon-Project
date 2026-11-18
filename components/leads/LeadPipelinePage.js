"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Eye, Inbox, Search } from "lucide-react";
import Modal from "@/components/Modal";
import { Avatar, DateCell, Pill, Toast } from "@/components/ui";
import { LEAD_STAGE_LABEL } from "@/lib/leadConstants";

const TEMPERATURE_COLOR = { Hot: "red", Warm: "amber", Cold: "blue" };
const EMPTY_COLUMNS = [];

export default function LeadPipelinePage({ title, subtitle, filter, Form, modalTitle, historyFilter, historyColumns = EMPTY_COLUMNS }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("pending");

  async function load() {
    const response = await fetch("/api/leads", { cache: "no-store" });
    setRows(response.ok ? await response.json() : []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/leads", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingRows = useMemo(() => rows.filter((row) => row.status === "open" && filter(row)), [rows, filter]);
  const historyRows = useMemo(() => historyFilter ? rows.filter(historyFilter) : [], [rows, historyFilter]);
  const shown = useMemo(() => (tab === "history" ? historyRows : pendingRows)
    .filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => tab === "history"
      ? (b.quotationCreatedAt || b.quotationSentAt || b.updatedAt || b.timestamp || "").localeCompare(a.quotationCreatedAt || a.quotationSentAt || a.updatedAt || a.timestamp || "")
      : (b.updatedAt || b.timestamp || "").localeCompare(a.updatedAt || a.timestamp || "")),
  [historyRows, pendingRows, query, tab]);

  function complete(message) {
    setModal(null);
    setToast(message);
    setTimeout(() => setToast(""), 3500);
    load();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {historyFilter && <div className="flex gap-1 border-b border-slate-100 px-6 pt-3">
          <button type="button" onClick={() => setTab("pending")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "pending" ? "border-brand text-brand-dark" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Pending <span className="ml-1 text-xs">({pendingRows.length})</span></button>
          <button type="button" onClick={() => setTab("history")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "history" ? "border-brand text-brand-dark" : "border-transparent text-slate-400 hover:text-slate-600"}`}>History <span className="ml-1 text-xs">({historyRows.length})</span></button>
        </div>}
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand">
            <Search size={16} /><input className="w-full bg-transparent text-sm text-slate-700 outline-none" placeholder="Search name, mobile, village, lead ID..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="text-sm text-slate-400">{shown.length} {tab === "history" ? "quotations" : "pending"}</div>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[1050px] text-left text-[13px]">
            <thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-3 py-3 text-center">Action</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Lead</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Requirement</th><th className="px-3 py-3">Next Follow-up</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Stage</th>{tab === "history" && historyColumns.map((column) => <th key={column.key} className="px-3 py-3">{column.label}</th>)}</tr></thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={8 + (tab === "history" ? historyColumns.length : 0)} className="border-t border-slate-100 px-4 py-4"><div className="skeleton h-5 w-full" /></td></tr>)}
              {!loading && shown.map((lead) => <tr key={lead.id} className="hover:bg-slate-50/70">
                <td className="border-t border-slate-100 px-3 py-3 text-center"><button onClick={() => setModal(lead)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark">{tab === "history" ? <Eye size={13} /> : <ClipboardCheck size={13} />}{tab === "history" ? "View" : "Update"}</button></td>
                <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.timestamp} /></td>
                <td className="border-t border-slate-100 px-3 py-3"><div className="flex items-center gap-3"><Avatar name={lead.customerName} /><div><div className="font-semibold text-slate-800">{lead.customerName}</div><div className="text-xs text-slate-400">{lead.id} · {lead.mobile}</div></div></div></td>
                <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.source}</div><div className="text-xs text-slate-400">{lead.agent || "-"}</div></td>
                <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.kwWanted ? `${lead.kwWanted} kW` : "-"} · {lead.paymentMode || "Undecided"}</div><div className="text-xs text-slate-400">{lead.productCode || lead.village || "-"}</div></td>
                <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.nextFollowUp} /></td>
                <td className="border-t border-slate-100 px-3 py-3"><Pill color={TEMPERATURE_COLOR[lead.temperature]}>{lead.temperature}</Pill></td>
                <td className="border-t border-slate-100 px-3 py-3"><Pill color="blue">{LEAD_STAGE_LABEL[lead.leadStage] ?? "Open"}</Pill></td>
                {tab === "history" && historyColumns.map((column) => <td key={column.key} className="border-t border-slate-100 px-3 py-3">{column.render(lead)}</td>)}
              </tr>)}
            </tbody>
          </table>
          {!loading && shown.length === 0 && <div className="flex flex-col items-center gap-2 py-16 text-slate-400"><Inbox size={32} /><div className="font-medium text-slate-600">{tab === "history" ? "No quotation history" : "No pending records"}</div><div className="text-sm">{tab === "history" ? "Created quotation records will appear here." : "Records appear here when they reach this stage."}</div></div>}
        </div>
      </section>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modalTitle} subtitle={modal ? `${modal.customerName} · ${modal.id}` : ""} maxWidth="max-w-5xl">
        {modal && <Form key={`${modal.id}-${modal.updatedAt}`} row={modal} readOnly={tab === "history"} onComplete={complete} onRefresh={load} onCancel={() => setModal(null)} />}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}
