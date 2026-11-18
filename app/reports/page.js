"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, BadgeIndianRupee, BarChart3, CheckCircle2, Clock3, FileWarning, Landmark, MapPinned, RefreshCw, Truck } from "lucide-react";
import { Pill } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/workflow";
import { HOLD_REASONS } from "@/lib/processConfig";
import { STEPS } from "@/lib/steps";

const DAY = 86400000;

export default function ReportsPage() {
  const [leads, setLeads] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(null);

  async function load() {
    setLoading(true);
    const [leadResponse, caseResponse] = await Promise.all([
      fetch("/api/leads", { cache: "no-store" }),
      fetch("/api/cases", { cache: "no-store" }),
    ]);
    setLeads(leadResponse.ok ? await leadResponse.json() : []);
    setCases(caseResponse.ok ? await caseResponse.json() : []);
    setAsOf(Date.now());
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/leads", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
      fetch("/api/cases", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
    ]).then(([leadRows, caseRows]) => {
      if (!active) return;
      setLeads(leadRows);
      setCases(caseRows);
      setAsOf(Date.now());
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const report = useMemo(() => buildReport(leads, cases, asOf), [leads, cases, asOf]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-dark px-6 py-6 text-white shadow-lg sm:px-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Live Operations MIS</div><h1 className="mt-2 text-3xl font-bold tracking-tight">Reports & Action Centre</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Important follow-ups, blocked cases, ageing, pending balances and stage workload from live workflow data.</p></div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold backdrop-blur hover:bg-white/15 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric loading={loading} label="Active Cases" value={report.active.length} detail={`${report.openLeads.length} open leads`} icon={BarChart3} color="blue" href="/dashboard" />
        <Metric loading={loading} label="Follow-ups Due" value={report.followUps.length} detail="Call / visit required" icon={Clock3} color="amber" href="/call-tracker" />
        <Metric loading={loading} label="Cases on Hold" value={report.holds.length} detail="Current-stage blockers" icon={FileWarning} color="red" />
        <Metric loading={loading} label="Pending Balance" value={money(report.pendingBalanceTotal)} detail={`${report.balances.length} cases`} icon={BadgeIndianRupee} color="orange" compact href="/balance-clearance" />
        <Metric loading={loading} label="Completed Cases" value={report.completed.length} detail={`${report.completionRate}% completion`} icon={CheckCircle2} color="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <ReportTable title="Priority workload" subtitle="Oldest active cases first" icon={AlertCircle} rows={report.pending.slice(0, 12)} columns={[
          ["Case / Customer", (row) => <div><Link href={row.href} className="font-mono text-xs font-bold text-brand-dark hover:underline">{row.id}</Link><div className="mt-0.5 font-semibold text-slate-800">{row.customer}</div></div>],
          ["Current Stage", (row) => <div><div className="font-medium text-slate-700">{row.stage}</div><div className="mt-1 text-xs text-slate-400">{row.state} · {row.mode}</div></div>],
          ["Age", (row) => <AgePill days={row.ageDays} />],
          ["Status", (row) => <Pill color={row.hold ? "red" : "blue"}>{row.hold ? row.holdCode || "On Hold" : "Pending"}</Pill>],
          ["Open", (row) => <Link href={row.href} aria-label={`Open ${row.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-brand hover:text-brand-dark"><ArrowUpRight size={15} /></Link>],
        ]} />

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Stage workload</h2><p className="mt-1 text-sm text-slate-500">Where active cases are waiting.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{report.active.length} active</span></div>
          <div className="mt-6 space-y-4">{report.stageCounts.slice(0, 8).map((item) => <StageBar key={item.stage} item={item} total={report.active.length} />)}{report.stageCounts.length === 0 && <Empty text="No active cases" />}</div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportTable title="Holds & exceptions" subtitle="Cases blocked at their current step" icon={FileWarning} rows={report.holds} columns={[
          ["Case", (row) => <div><Link href={row.href} className="font-mono text-xs font-bold text-brand-dark hover:underline">{row.id}</Link><div className="font-semibold text-slate-800">{row.customer}</div></div>],
          ["Reason", (row) => <div><span className="font-mono text-xs font-bold text-rose-600">{row.code}</span><div className="mt-1 max-w-sm text-sm text-slate-600">{row.reason}</div></div>],
          ["Owner / Age", (row) => <div><div className="font-medium text-slate-700">{row.owner}</div><div className="mt-1 text-xs text-slate-400">{row.ageDays} days on hold</div></div>],
        ]} />
        <ReportTable title="Balance collection" subtitle="Warranty remains blocked until remaining balance is zero" icon={BadgeIndianRupee} rows={report.balances} columns={[
          ["Case", (row) => <div><Link href="/balance-clearance" className="font-mono text-xs font-bold text-brand-dark hover:underline">{row.id}</Link><div className="font-semibold text-slate-800">{row.customer}</div></div>],
          ["Total", (row) => money(row.total)],
          ["Received", (row) => <span className="font-medium text-emerald-700">{money(row.received)}</span>],
          ["Remaining", (row) => <span className="font-bold text-rose-600">{money(row.remaining)}</span>],
        ]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Breakdown title="Payment mode" icon={Landmark} rows={report.modeCounts} total={report.active.length} />
        <Breakdown title="State workload" icon={MapPinned} rows={report.stateCounts} total={report.active.length} />
        <Breakdown title="Dispatch & inspection" icon={Truck} rows={report.deliveryCounts} total={report.active.length} />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><div><h2 className="font-bold text-slate-900">Available management views</h2><p className="mt-1 text-sm text-slate-500">The important operational questions covered by this report.</p></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{report.catalog.map(([name, audience, shows]) => <div key={name} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"><div className="font-semibold text-slate-800">{name}</div><div className="mt-1 text-xs font-semibold text-brand-dark">{audience}</div><p className="mt-2 text-xs leading-5 text-slate-500">{shows}</p></div>)}</div></section>
    </div>
  );
}

function buildReport(leads, cases, asOf) {
  const now = asOf ?? 0;
  const active = cases.filter((row) => row.stage !== "done");
  const completed = cases.filter((row) => row.stage === "done");
  const openLeads = leads.filter((lead) => lead.status === "open");
  const modeOf = (row) => row.steps?.paymentWorkStart?.cashOrLoan || row.preferredPaymentMode || "Not decided";
  const ageDays = (iso) => Math.max(0, Math.floor((now - new Date(iso || now).getTime()) / DAY));
  const pending = active.map((row) => ({
    id: row.id, customer: row.customerName, stage: STAGE_LABEL[row.stage] ?? row.stage,
    state: row.state || "-", mode: modeOf(row), href: stageHref(row.stage),
    ageDays: ageDays(row.schedule?.[row.stage]?.timestamp || row.timestamp),
    hold: row.steps?.[row.stage]?.status === "hold", holdCode: row.steps?.[row.stage]?.holdCode,
  })).sort((a, b) => b.ageDays - a.ageDays);
  const holds = active.filter((row) => row.steps?.[row.stage]?.status === "hold").map((row) => {
    const entry = row.steps[row.stage];
    return { id: row.id, customer: row.customerName, code: entry.holdCode || "HOLD", reason: entry.holdReason || HOLD_REASONS[entry.holdCode] || entry.remark || "Action required", owner: entry.submittedBy || "Owner pending", ageDays: ageDays(entry.submittedAt), href: stageHref(row.stage) };
  }).sort((a, b) => b.ageDays - a.ageDays);
  const balances = cases.map((row) => {
    const entry = row.steps?.balanceClearance;
    if (!entry) return null;
    const total = Number(entry?.totalAmount ?? entry?.balanceDue ?? row.dealAmount ?? 0);
    const received = Number(entry?.amountReceived ?? entry?.balanceRecovered ?? 0);
    const remaining = Math.max(0, Number(entry?.remainingBalance ?? total - received));
    return { id: row.id, customer: row.customerName, total, received, remaining };
  }).filter((row) => row?.remaining > 0).sort((a, b) => b.remaining - a.remaining);
  const countBy = (values) => Object.entries(values.reduce((out, value) => ({ ...out, [value]: (out[value] || 0) + 1 }), {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const stageCounts = countBy(active.map((row) => STAGE_LABEL[row.stage] ?? row.stage)).map((item) => ({ stage: item.label, count: item.count }));
  const stages = (keys) => active.filter((row) => keys.includes(row.stage)).length;
  const followUps = openLeads.filter((lead) => lead.nextFollowUp && new Date(lead.nextFollowUp).getTime() <= now);
  return {
    active, completed, openLeads, pending, holds, balances, followUps, stageCounts,
    pendingBalanceTotal: balances.reduce((sum, row) => sum + row.remaining, 0),
    completionRate: cases.length ? Math.round((completed.length / cases.length) * 100) : 0,
    modeCounts: countBy(active.map(modeOf)), stateCounts: countBy(active.map((row) => row.state || "Not set")),
    deliveryCounts: [
      { label: "Payment / Dispatch", count: stages(["cashReceipt", "dispatch", "cashDispatch", "cashApproval", "subsidyChequeReady"]) },
      { label: "Installation", count: stages(["assignInstaller", "installationComplete", "billDcr", "portalInstallation"]) },
      { label: "Inspection", count: stages(["inspectionFile", "meterInspection", "jeInspection", "generationWifi", "portalInspectionApproval"]) },
      { label: "Closure", count: stages(["finalBankFile", "finalBankPayment", "subsidyRedeem", "subsidyDisbursal", "chequeDeposit", "balanceClearance", "warranty"]) },
    ],
    catalog: [["Follow-ups due", "Calling / Field", "Due customer calls and visits"], ["Stage ageing", "Management", "Oldest active cases and current owner"], ["Holds by reason", "Co-ordinators", "H01–H22 blockers and hold age"], ["Balance collection", "Accounts", "Total, received and remaining amount"], ["Loan pipeline", "Banking", "Bank progress, PHS and disbursal"], ["Dispatch board", "Accounts / Dispatch", "Receipt, shortfall approval and dispatch"], ["Inspection & meter", "DISCOM / Docs", "Filing, meter, JE and portal state"], ["Warranty pending", "Service", "Balance and handover blockers"]],
  };
}

function Metric({ loading, label, value, detail, icon: Icon, color, compact, href }) {
  const colors = { blue: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-600", red: "bg-rose-50 text-rose-600", orange: "bg-orange-50 text-orange-600", green: "bg-emerald-50 text-emerald-600" };
  const content = <><div className="flex items-start justify-between"><div className="text-sm font-medium text-slate-500">{label}</div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}><Icon size={18} /></span></div>{loading ? <div className="skeleton mt-3 h-8 w-20" /> : <div className={`mt-2 font-bold tracking-tight text-slate-900 ${compact ? "text-2xl" : "text-3xl"}`}>{value}</div>}<div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{detail}</span>{href && <ArrowUpRight size={13} />}</div></>;
  return href ? <Link href={href} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md">{content}</Link> : <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">{content}</div>;
}

function ReportTable({ title, subtitle, icon: Icon, rows, columns }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><Icon size={18} className="mt-1 text-slate-400" /></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{columns.map(([label]) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">{columns.map(([label, render]) => <td key={label} className="border-t border-slate-100 px-4 py-3 text-slate-600">{render(row)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <Empty text="No records requiring attention" />}</div></section>;
}

function StageBar({ item, total }) { const percentage = total ? Math.round((item.count / total) * 100) : 0; return <div><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-600">{item.stage}</span><span className="font-bold text-slate-800">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${percentage}%` }} /></div></div>; }
function AgePill({ days }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${days >= 7 ? "bg-rose-50 text-rose-700" : days >= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{days} days</span>; }
function Breakdown({ title, icon: Icon, rows, total }) { return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">{title}</h2><Icon size={18} className="text-slate-400" /></div><div className="mt-5 space-y-3">{rows.map((row) => <div key={row.label}><div className="flex items-center justify-between text-sm"><span className="text-slate-600">{row.label}</span><b>{row.count}</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} /></div></div>)}{rows.length === 0 && <Empty text="No data" />}</div></section>; }
function Empty({ text }) { return <div className="px-5 py-10 text-center text-sm text-slate-400">{text}</div>; }
function money(value) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function stageHref(stage) { const step = STEPS.find((item) => item.title === STAGE_LABEL[stage]); return step ? `/${step.slug}` : "/dashboard"; }
