"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import Modal from "@/components/Modal";
import { Pill, Toast, DateCell } from "@/components/ui";
import IssueReportForm from "@/components/steps/IssueReportForm";
import { STAGE_LABEL } from "@/lib/workflow";

const PAGE_SIZE = 10;

const th = "px-2 py-3 align-bottom text-[11px] font-semibold uppercase leading-tight tracking-wider";
const td = "whitespace-nowrap border-t border-slate-100 px-2 py-3.5";

/**
 * One pipeline step: a Pending tab (cases waiting at this step) and a History
 * tab (cases already submitted). The Action button opens the step's popup form.
 */
export default function StepPage({
  stepKey,
  title,
  subtitle,
  columns,
  historyColumns = [], // this step's own submitted data, shown in History only
  Form,
  modalTitle,
  modalWidth,
  modalBodyClass,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { row, readOnly }
  const [toast, setToast] = useState("");
  const [issueRow, setIssueRow] = useState(null); // case whose issue is being reported

  async function load() {
    setRows(await (await fetch("/api/cases", { cache: "no-store" })).json());
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/cases", { cache: "no-store" })
      .then((response) => response.json())
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

  const entry = (r) => r.steps?.[stepKey];
  const pending = useMemo(
    () => rows.filter((r) => r.stage === stepKey).sort((a, b) => (b.schedule?.[stepKey]?.timestamp || b.timestamp).localeCompare(a.schedule?.[stepKey]?.timestamp || a.timestamp)),
    [rows, stepKey]
  );
  const history = useMemo(
    () =>
      rows
        .filter((r) => r.steps?.[stepKey]?.status === "done")
        .sort((a, b) => r_sub(b).localeCompare(r_sub(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, stepKey]
  );
  function r_sub(r) {
    return r.steps[stepKey].submittedAt;
  }
  const list = (tab === "pending" ? pending : history).filter((r) =>
    JSON.stringify(r).toLowerCase().includes(q.toLowerCase())
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function submit(data) {
    const res = await fetch(`/api/cases/${modal.row.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: stepKey, data }),
    });
    const j = await res.json();
    if (!res.ok) return j.error;
    setModal(null);
    notify(
      j.stage === stepKey
        ? "Saved on hold. The case stays in Pending."
        : `Submitted. Moved to ${STAGE_LABEL[j.stage]}.`
    );
    load();
    return null;
  }

  // Report an issue: the case goes back to Document Verification & Name Check.
  async function reportIssue(data) {
    const res = await fetch(`/api/cases/${issueRow.id}/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) return j.error;
    setIssueRow(null);
    notify(`Issue reported. Case moved to ${STAGE_LABEL.documentReceive}.`);
    load();
    return null;
  }

  const tabs = [
    ["pending", "Pending", pending.length],
    ["history", "History", history.length],
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-7 border-b border-slate-100 px-6">
          {tabs.map(([k, label, count]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 py-4 text-sm font-semibold transition ${
                tab === k
                  ? "border-brand text-brand-dark"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  tab === k ? "bg-brand-50 text-brand-dark" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(47,168,154,0.18)]">
            <Search size={16} />
            <input
              placeholder="Search customer, BP SC number, village..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="text-sm text-slate-400">
            {list.length} {list.length === 1 ? "case" : "cases"}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                {tab === "pending" && (
                  <th className={`${th} sticky left-0 z-10 bg-slate-50 text-center shadow-[8px_0_8px_-8px_rgba(15,23,42,0.12)]`}>
                    Action
                  </th>
                )}
                <th className={th}>Timestamp</th>
                {columns.map((c) => (
                  <th key={c.label} className={th}>
                    {c.label}
                  </th>
                ))}
                {tab === "history" &&
                  historyColumns.map((c) => (
                    <th key={c.label} className={th}>
                      {c.label}
                    </th>
                  ))}
                <th className={th}>Planned Date</th>
                {tab === "history" && <th className={th}>Actual Date</th>}
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={columns.length + 4 + (tab === "history" ? historyColumns.length : 0)} className="border-t border-slate-100 px-4 py-4">
                      <div className="skeleton h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                shown.map((r) => {
                  const e = entry(r);
                  const sch = r.schedule?.[stepKey];
                  return (
                    <tr key={r.id} className="group transition hover:bg-slate-50/70">
                      {tab === "pending" && (
                        <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-2.5 py-3.5 text-center shadow-[8px_0_8px_-8px_rgba(15,23,42,0.12)] group-hover:bg-slate-50">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setModal({ row: r, readOnly: false })}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                            >
                              <ClipboardCheck size={13} /> Update
                            </button>
                            {stepKey !== "nameCheck" && stepKey !== "documentReceive" && (
                              <button
                                onClick={() => setIssueRow(r)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                              >
                                <AlertTriangle size={13} /> Report Issue
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      <td className={td}>
                        <DateCell value={sch?.timestamp} />
                      </td>
                      {columns.map((c) => (
                        <td key={c.label} className={`${td} ${c.mono ? "font-mono text-[13px] font-medium text-slate-700" : "text-slate-600"}`}>
                          {c.cell(r)}
                        </td>
                      ))}
                      {tab === "history" &&
                        historyColumns.map((c) => (
                          <td key={c.label} className={`${td} text-slate-600`}>
                            {c.cell(r)}
                          </td>
                        ))}
                      <td className={td}>
                        <DateCell value={sch?.plannedDate} />
                      </td>
                      {tab === "history" && (
                        <td className={td}>
                          <DateCell value={sch?.actualDate} />
                        </td>
                      )}
                      <td className={td}>
                        {tab === "history" ? (
                          <Pill color="green">Completed</Pill>
                        ) : e?.status === "hold" ? (
                          <Pill color="red">On hold</Pill>
                        ) : (
                          <Pill color="amber">Pending</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!loading && shown.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <Inbox size={32} />
              <div className="font-medium text-slate-600">
                {tab === "pending" ? "No pending cases" : "No history yet"}
              </div>
              <div className="text-sm">
                {tab === "pending"
                  ? "New cases appear here when the previous step is submitted."
                  : "Submitted cases will show up here."}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">
          <div>
            {list.length === 0
              ? "No results"
              : `Showing ${(cur - 1) * PAGE_SIZE + 1}-${Math.min(cur * PAGE_SIZE, list.length)} of ${list.length}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={cur <= 1}
              onClick={() => setPage(cur - 1)}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 font-medium text-slate-700">
              {cur} / {pages}
            </span>
            <button
              disabled={cur >= pages}
              onClick={() => setPage(cur + 1)}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modalTitle}
        subtitle={modal ? `${modal.row.customerName} · ${modal.row.bpScNumber}` : ""}
        maxWidth={modalWidth}
        bodyClass={modalBodyClass}
      >
        {modal && (
          <Form
            key={modal.row.id}
            stepKey={stepKey}
            row={modal.row}
            readOnly={modal.readOnly}
            onSubmit={submit}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!issueRow}
        onClose={() => setIssueRow(null)}
        title="Report Issue"
        subtitle={issueRow ? `${issueRow.customerName} · ${issueRow.bpScNumber}` : ""}
        maxWidth="max-w-2xl"
      >
        {issueRow && (
          <IssueReportForm
            key={issueRow.id}
            row={issueRow}
            stepKey={stepKey}
            onSubmit={reportIssue}
            onCancel={() => setIssueRow(null)}
          />
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
