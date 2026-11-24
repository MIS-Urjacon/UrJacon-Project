"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Eye, Inbox, PencilLine, Search } from "lucide-react";
import IssueReportForm from "@/components/steps/IssueReportForm";
import Modal from "@/components/Modal";
import AssignDialog from "@/components/AssignDialog";
import AssigneeCell from "@/components/AssigneeCell";
import { useMe } from "@/lib/useMe";
import { canAssign, canManagePageAssignment, assigneeIdsForPage } from "@/lib/assign";
import { DateCell, Pill, Toast } from "@/components/ui";
import { leadStageLabel } from "@/lib/leadConstants";

const TEMPERATURE_COLOR = { Interested: "green", "Not Interested": "red", "Follow up Required": "amber" };
const EMPTY_COLUMNS = [];

export default function LeadPipelinePage({ title, subtitle, pageSlug, filter, Form, modalTitle, historyFilter, historyColumns = EMPTY_COLUMNS, extraColumns = EMPTY_COLUMNS, selectable = false, PendingView, stageLabel = leadStageLabel, canRevise }) {
  const assignmentPage = pageSlug ?? (title === "Call Tracker" ? "call-tracker" : title === "Quotation & Documents" ? "quotation" : "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [revising, setRevising] = useState(null); // History > Revise: lead opened in Pending for correction
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("pending");
  const me = useMe();
  const canDelegate = canManagePageAssignment(me, assignmentPage);
  const [assignOpen, setAssignOpen] = useState(false);
  const [issueRows, setIssueRows] = useState(null); // leads whose issue is being reported
  const checkable = selectable || tab === "pending"; // ticks offer Report Issue (and Assign for admin / management)
  const [selectedIds, setSelectedIds] = useState([]); // selectable pages: tick rows, then Submit

  async function load() {
    const response = await fetch("/api/leads", { cache: "no-store" });
    const data = response.ok ? await response.json() : [];
    setRows(data);
    setLoading(false);
    return data;
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

  // Selected rows in table order. Submit opens them one after another.
  const selectedRows = checkable ? shown.filter((row) => selectedIds.includes(row.id)) : [];
  const allSelected = shown.length > 0 && selectedRows.length === shown.length;
  const toggleAll = (checked) => setSelectedIds(checked ? shown.map((row) => row.id) : []);
  const toggleRow = (id, checked) => setSelectedIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));

  async function reportIssue(data) {
    let ok = 0;
    let firstError = "";
    for (const row of issueRows) {
      const res = await fetch(`/api/leads/${row.id}/issue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) ok++;
      else firstError ||= (await res.json()).error;
    }
    if (ok === 0) return firstError || "Could not report the issue";
    const failed = issueRows.length - ok;
    setIssueRows(null);
    setSelectedIds([]);
    setToast(`Issue reported for ${ok} lead${ok > 1 ? "s" : ""}.${failed ? ` ${failed} failed: ${firstError}` : ""}`);
    setTimeout(() => setToast(""), 3500);
    load();
    return null;
  }

  function afterAssign(message) {
    setAssignOpen(false);
    setSelectedIds([]);
    setToast(message);
    setTimeout(() => setToast(""), 3500);
    load();
  }

  async function complete(message) {
    const doneId = modal?.id;
    const rest = selectedIds.filter((id) => id !== doneId);
    setModal(null);
    setSelectedIds(rest);
    setToast(message);
    setTimeout(() => setToast(""), 3500);
    const data = await load();
    const next = selectable && rest.length ? data.find((row) => row.id === rest[0] && row.status === "open") : null;
    if (next) setModal(next);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {historyFilter && <div className="flex gap-1 border-b border-slate-100 px-6 pt-3">
          <button type="button" onClick={() => setTab("pending")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "pending" ? "border-brand text-brand-dark" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Pending <span className="ml-1 text-xs">({pendingRows.length})</span></button>
          <button type="button" onClick={() => setTab("history")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "history" ? "border-brand text-brand-dark" : "border-transparent text-slate-400 hover:text-slate-600"}`}>History <span className="ml-1 text-xs">({historyRows.length})</span></button>
        </div>}
        {PendingView && tab === "pending" ? <PendingView rows={pendingRows} loading={loading} reload={load} revising={revising} clearRevising={() => setRevising(null)} notify={(message) => { setToast(message); setTimeout(() => setToast(""), 3500); }} /> : <>
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand">
            <Search size={16} /><input className="w-full bg-transparent text-sm text-slate-700 outline-none" placeholder="Search name, mobile, village, lead ID..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">{shown.length} {tab === "history" ? "quotations" : "pending"}</div>
            {checkable && selectedRows.length > 0 && <button type="button" onClick={() => setIssueRows(selectedRows)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"><AlertTriangle size={15} />Report Issue{selectedRows.length > 1 ? ` (${selectedRows.length})` : ""}</button>}
            {checkable && canDelegate && (tab === "pending" || canAssign(me)) && selectedRows.length > 0 && <button type="button" onClick={() => setAssignOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Assign{selectedRows.length > 1 ? ` (${selectedRows.length})` : ""}</button>}
            {selectable && selectedRows.length > 0 && <button type="button" onClick={() => setModal(selectedRows[0])} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"><ClipboardCheck size={15} />Submit{selectedRows.length > 1 ? ` (${selectedRows.length})` : ""}</button>}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[1050px] text-left text-[13px]">
            <thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-3 py-3 text-center">{checkable ? <div className="flex items-center justify-center gap-2.5"><input type="checkbox" aria-label="Select all" className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--color-brand)]" checked={allSelected} ref={(element) => { if (element) element.indeterminate = selectedRows.length > 0 && !allSelected; }} onChange={(event) => toggleAll(event.target.checked)} />{!selectable && "Action"}</div> : "Action"}</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Lead</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Requirement</th>{extraColumns.map((column) => <th key={column.key} className="px-3 py-3">{column.label}</th>)}<th className="px-3 py-3">Assigned To</th><th className="px-3 py-3">Next Follow-up</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Stage</th>{tab === "history" && historyColumns.map((column) => <th key={column.key} className="px-3 py-3">{column.label}</th>)}</tr></thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={9 + extraColumns.length + (tab === "history" ? historyColumns.length : 0)} className="border-t border-slate-100 px-4 py-4"><div className="skeleton h-5 w-full" /></td></tr>)}
              {!loading && shown.map((lead) => <tr key={lead.id} className="hover:bg-slate-50/70">
                <td className="border-t border-slate-100 px-3 py-3 text-center">{selectable ? <input type="checkbox" aria-label={`Select ${lead.customerName}`} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--color-brand)]" checked={selectedIds.includes(lead.id)} onChange={(event) => toggleRow(lead.id, event.target.checked)} /> : <div className="flex items-center justify-center gap-2.5">{checkable && <input type="checkbox" aria-label={`Select ${lead.customerName}`} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--color-brand)]" checked={selectedIds.includes(lead.id)} onChange={(event) => toggleRow(lead.id, event.target.checked)} />}<button onClick={() => setModal(lead)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark">{tab === "history" ? <Eye size={13} /> : <ClipboardCheck size={13} />}{tab === "history" ? "View" : "Update"}</button>{tab === "history" && canRevise?.(lead) && <button onClick={() => { setRevising(lead); setTab("pending"); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100"><PencilLine size={13} />Revise</button>}</div>}</td>
                <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.timestamp} /></td>
                <td className="border-t border-slate-100 px-3 py-3"><div className="flex items-center gap-3"><div><div className="font-semibold text-slate-800">{lead.customerName}</div><div className="text-xs text-slate-400">{lead.id} · {lead.mobile}</div>{lead.issue?.open && <div className="mt-1 flex items-center gap-1.5" title={lead.issue.description}><Pill color="red">Issue</Pill><span className="max-w-40 truncate text-[11px] text-slate-500">{lead.issue.type}</span></div>}</div></div></td>
                <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.source}</div><div className="text-xs text-slate-400">{lead.agent || "-"}</div></td>
                <td className="border-t border-slate-100 px-3 py-3 text-slate-600"><div>{lead.kwWanted ? `${lead.kwWanted} kW` : "-"}</div><div className="text-xs text-slate-400">{lead.productCode || lead.village || "-"}</div></td>
                {extraColumns.map((column) => <td key={column.key} className="border-t border-slate-100 px-3 py-3 text-slate-600">{column.render(lead)}</td>)}
                <td className="border-t border-slate-100 px-3 py-3"><AssigneeCell row={lead} /></td>
                <td className="border-t border-slate-100 px-3 py-3"><DateCell value={lead.nextFollowUp} /></td>
                <td className="border-t border-slate-100 px-3 py-3"><Pill color={TEMPERATURE_COLOR[lead.temperature]}>{lead.temperature}</Pill></td>
                <td className="border-t border-slate-100 px-3 py-3"><Pill color="blue">{stageLabel(lead) ?? "Open"}</Pill></td>
                {tab === "history" && historyColumns.map((column) => <td key={column.key} className="border-t border-slate-100 px-3 py-3">{column.render(lead)}</td>)}
              </tr>)}
            </tbody>
          </table>
          {!loading && shown.length === 0 && <div className="flex flex-col items-center gap-2 py-16 text-slate-400"><Inbox size={32} /><div className="font-medium text-slate-600">{tab === "history" ? "No quotation history" : "No pending records"}</div><div className="text-sm">{tab === "history" ? "Created quotation records will appear here." : "Records appear here when they reach this stage."}</div></div>}
        </div>
        </>}
      </section>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modalTitle} subtitle={modal ? `${modal.customerName} · ${modal.id}` : ""} maxWidth="max-w-5xl">
        {modal && <Form key={`${modal.id}-${modal.updatedAt}`} row={modal} readOnly={tab === "history"} onComplete={complete} onRefresh={load} onCancel={() => setModal(null)} />}
      </Modal>
      <Modal open={!!issueRows} onClose={() => setIssueRows(null)} title="Report Issue" subtitle={issueRows ? (issueRows.length > 1 ? `${issueRows.length} leads selected` : `${issueRows[0].customerName} · ${issueRows[0].id}`) : ""} maxWidth="max-w-2xl">
        {issueRows && <IssueReportForm key={issueRows.map((row) => row.id).join(",")} row={issueRows[0]} count={issueRows.length} stageLabel={issueRows[0].leadStage === "quotation" ? "Quotation" : "Call Tracker"} notice={issueRows[0].leadStage === "quotation" ? "The lead goes back to Call Tracker with these details." : "The lead stays in Call Tracker, flagged with these details, until the next call outcome is recorded."} onSubmit={reportIssue} onCancel={() => setIssueRows(null)} />}
      </Modal>
      <AssignDialog open={assignOpen} type="lead" page={assignmentPage} ids={selectedRows.map((row) => row.id)} current={selectedRows.length === 1 ? assigneeIdsForPage(selectedRows[0], assignmentPage) : []} onClose={() => setAssignOpen(false)} onDone={afterAssign} />
      <Toast message={toast} />
    </div>
  );
}
