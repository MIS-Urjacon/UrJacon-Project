"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Inbox, Plus, Search } from "lucide-react";
import LeadForm from "@/components/leads/LeadForm";
import Modal from "@/components/Modal";
import { BulkAssign, RowBox, SelectAllBox, useCanAssign, useSelection } from "@/components/BulkAssign";
import AssigneeCell from "@/components/AssigneeCell";
import { Avatar, Button, DateCell, Pill, Toast } from "@/components/ui";
import { leadStageLabel } from "@/lib/leadConstants";

const TABS = [["open", "Open"], ["converted", "Converted"], ["lost", "Lost"]];
const TEMPERATURE_COLOR = { Hot: "red", Warm: "amber", Cold: "blue", Interested: "green", "Not Interested": "red", "Follow up Required": "amber" };
const PAGE_SIZE = 10;

export default function LeadsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    const response = await fetch("/api/leads", { cache: "no-store" });
    setRows(response.ok ? await response.json() : []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/leads", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map(([key]) => [
      key,
      rows.filter((row) => row.status === key && (key !== "open" || row.leadStage === "new")).length,
    ])),
    [rows]
  );
  const filtered = useMemo(
    () => rows
      .filter((row) => row.status === tab)
      .filter((row) => tab !== "open" || row.leadStage === "new")
      .filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.updatedAt ?? b.timestamp).localeCompare(a.updatedAt ?? a.timestamp)),
    [rows, tab, query]
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const canBulk = useCanAssign();
  const sel = useSelection(tab === "open" ? shown : []);

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  async function addLead(data) {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return result.error ?? `Could not save the lead (server error ${response.status})`;
    setAddOpen(false);
    setTab("open");
    notify(`${result.id} added to the lead pipeline.`);
    load();
    return null;
  }

  async function updateLead(data) {
    const action = data.action;
    const response = await fetch(`/api/leads/${modal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, action }),
    });
    const result = await response.json();
    if (!response.ok) return result.error;

    setModal(null);
    setTab(result.status);
    notify(action === "lost" ? "Lead marked as lost." : action === "reopen" ? "Lead reopened." : "Lead updated.");
    load();
    return null;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Step 1 · Capture a new lead. Calling and qualification continue in Call Tracker.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add lead</Button>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-7 border-b border-slate-100 px-6">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
              className={`-mb-px flex items-center gap-2 border-b-2 py-4 text-sm font-semibold ${tab === key ? "border-brand text-brand-dark" : "border-transparent text-slate-400"}`}
            >
              {label}<span className={`rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-brand-50 text-brand-dark" : "bg-slate-100 text-slate-500"}`}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand">
            <Search size={16} />
            <input className="w-full bg-transparent text-sm text-slate-700 outline-none" placeholder="Search name, mobile, village, lead ID..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-4"><div className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? "lead" : "leads"}</div>{canBulk && <BulkAssign type="lead" sel={sel} onDone={(message) => { sel.clear(); notify(message); load(); }} />}</div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[1100px] text-left text-[13px]">
            <thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 text-center"><div className="flex items-center justify-center gap-2.5">{canBulk && tab === "open" && <SelectAllBox sel={sel} />}Action</div></th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Lead</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Requirement</th><th className="px-3 py-3">Brand</th><th className="px-3 py-3">Assigned To</th><th className="px-3 py-3">Next Follow-up</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Stage / Status</th>
            </tr></thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan="10" className="border-t border-slate-100 px-4 py-4"><div className="skeleton h-5 w-full" /></td></tr>)}
              {!loading && shown.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/70">
                  <td className="border-t border-slate-100 px-3 py-3 text-center"><div className="flex items-center justify-center gap-2.5">{canBulk && lead.status === "open" && <RowBox sel={sel} row={lead} />}<button onClick={() => setModal(lead)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark"><ClipboardCheck size={13} />{lead.status === "converted" ? "View" : "Update"}</button></div></td>
                  <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.timestamp} /></td>
                  <td className="border-t border-slate-100 px-3 py-3"><div className="flex items-center gap-3"><Avatar name={lead.customerName} /><div><div className="font-semibold text-slate-800">{lead.customerName}</div><div className="text-xs text-slate-400">{lead.id} · {lead.mobile}</div></div></div></td>
                  <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.source}</div><div className="text-xs text-slate-400">{lead.agent || "-"}</div></td>
                  <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.kwWanted ? `${lead.kwWanted} kW` : "-"} · {lead.paymentMode || "Undecided"}</div><div className="text-xs text-slate-400">{lead.productCode || lead.village || "-"}</div></td>
                  <td className="border-t border-slate-100 px-3 py-3 text-slate-600">{lead.brand || "-"}</td>
                  <td className="border-t border-slate-100 px-3 py-3"><AssigneeCell row={lead} /></td>
                  <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.nextFollowUp} /></td>
                  <td className="border-t border-slate-100 px-3 py-3"><Pill color={TEMPERATURE_COLOR[lead.temperature]}>{lead.temperature}</Pill></td>
                  <td className="border-t border-slate-100 px-3 py-3">{lead.status === "converted" ? <><Pill color="green">Converted</Pill><div className="mt-1 text-xs text-slate-400">{lead.convertedCaseId}</div></> : lead.status === "lost" ? <><Pill color="red">Lost</Pill><div className="mt-1 max-w-44 truncate text-xs text-slate-400">{lead.lostReason}</div></> : <Pill color="blue">{leadStageLabel(lead) ?? "Open"}</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && shown.length === 0 && <div className="flex flex-col items-center gap-2 py-16 text-slate-400"><Inbox size={32} /><div className="font-medium text-slate-600">No {tab} leads</div><div className="text-sm">{tab === "open" ? "Add a lead to start the pipeline." : `No leads have been ${tab} yet.`}</div></div>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">
          <div>{filtered.length === 0 ? "No results" : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}</div>
          <div className="flex items-center gap-2">
            <button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="px-1 font-medium text-slate-700">{currentPage} / {pages}</span>
            <button aria-label="Next page" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add new lead" subtitle="Create the first record in the customer journey." maxWidth="max-w-5xl">
        {addOpen && <LeadForm onSubmit={addLead} onCancel={() => setAddOpen(false)} />}
      </Modal>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.status === "converted" ? "Lead details" : "Update lead"} subtitle={modal ? `${modal.customerName} · ${modal.id}` : ""} maxWidth="max-w-5xl">
        {modal && <LeadForm key={`${modal.id}-${modal.updatedAt}`} lead={modal} readOnly={modal.status === "converted"} onSubmit={updateLead} onCancel={() => setModal(null)} />}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}
