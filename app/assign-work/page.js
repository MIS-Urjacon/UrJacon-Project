"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { Avatar, DateCell, Pill } from "@/components/ui";

const PAGE_SIZE = 10;
const th = "px-3 py-3 align-bottom text-[11px] font-semibold uppercase leading-tight tracking-wider";
const td = "whitespace-nowrap border-t border-slate-100 px-3 py-3.5";
const STATUS_COLOR = { Active: "amber", Closed: "green", Removed: "gray" };

const shortDay = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

// Who got which work and when: every assignment (and every take-back) is logged here.
// Admin / management see everything; everyone else sees only the work assigned to them.
export default function AssignWorkPage() {
  const [data, setData] = useState({ rows: [], all: false, available: true });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    fetch("/api/assignments", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { rows: [], available: true }))
      .then((j) => { if (active) { setData(j); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeRows = useMemo(() => data.rows.filter((r) => r.status === "Active"), [data.rows]);
  const historyRows = useMemo(() => data.rows.filter((r) => r.status !== "Active"), [data.rows]);
  const list = (tab === "active" ? activeRows : historyRows).filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const tabs = [["active", "Active", activeRows.length], ["history", "History", historyRows.length]];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assign Work</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.all
            ? "Every assignment of leads and cases: who it went to, who assigned it and when. Assign work from the Assign button on any page; the assignee gets a message in the bell. Temporary = assigned with an Assign button (until the work moves on); Permanent = set in Settings > Assignees (all work on that page)."
            : "The work assigned to you, with the date it was assigned."}
        </p>
      </div>

      {!data.available && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The assignment log table is not created yet. Run <b>supabase/add_assignments.sql</b> once in the Supabase SQL Editor; until then assignments still work but are not tracked here.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-7 border-b border-slate-100 px-6">
          {tabs.map(([k, label, count]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setPage(1); }}
              className={`-mb-px flex items-center gap-2 border-b-2 py-4 text-sm font-semibold transition ${tab === k ? "border-brand text-brand-dark" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === k ? "bg-brand-50 text-brand-dark" : "bg-slate-100 text-slate-500"}`}>{count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(47,168,154,0.18)]">
            <Search size={16} />
            <input
              placeholder="Search customer, BP SC number, employee, page..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="text-sm text-slate-400">{list.length} {list.length === 1 ? "assignment" : "assignments"}</div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className={th}>Assign Date</th>
                <th className={th}>Assigned At</th>
                <th className={th}>Customer</th>
                <th className={th}>BP SC Number</th>
                <th className={th}>Type</th>
                <th className={th}>Work / Page</th>
                <th className={th}>Assigned To</th>
                <th className={th}>Assigned By</th>
                <th className={th}>Message</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={10} className="border-t border-slate-100 px-4 py-4"><div className="skeleton h-5 w-full" /></td></tr>
              ))}
              {!loading && shown.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className={`${td} font-semibold text-slate-700`}>{shortDay(r.assignedOn)}</td>
                  <td className={td}><DateCell value={r.assignedAt} /></td>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.customerName || r.recordId} />
                      <div><div className="font-semibold text-slate-800">{r.customerName || "-"}</div><div className="text-xs text-slate-400">{r.recordId}</div></div>
                    </div>
                  </td>
                  <td className={`${td} font-mono text-[13px]`}>{r.bpScNumber || "-"}</td>
                  <td className={td}><Pill color={r.kind === "permanent" ? "blue" : "amber"}>{r.kind === "permanent" ? "Permanent" : "Temporary"}</Pill></td>
                  <td className={td}>{r.page ? <Link href={`/${r.page}`} className="font-semibold text-brand-dark hover:underline">{r.pageLabel || r.page}</Link> : "-"}</td>
                  <td className={`${td} font-semibold text-slate-700`}>{r.action === "removed" ? <span className="font-normal text-slate-400">Assignment removed</span> : r.assignedToName}</td>
                  <td className={td}>{r.assignedByName || "-"}</td>
                  <td className={td}>{r.action === "removed" ? <span className="text-slate-300">-</span> : <Pill color={r.seenAt ? "green" : "amber"}>{r.seenAt ? "Read" : "Not read"}</Pill>}</td>
                  <td className={td}><Pill color={STATUS_COLOR[r.status] ?? "gray"}>{r.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && shown.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <Inbox size={32} />
              <div className="font-medium text-slate-600">{tab === "active" ? "No active assignments" : "No assignment history yet"}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500">
          <div>Showing {list.length ? (cur - 1) * PAGE_SIZE + 1 : 0}-{Math.min(cur * PAGE_SIZE, list.length)} of {list.length}</div>
          <div className="flex items-center gap-2">
            <button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={15} /></button>
            <span className="px-1 font-semibold text-slate-700">{cur} / {pages}</span>
            <button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
