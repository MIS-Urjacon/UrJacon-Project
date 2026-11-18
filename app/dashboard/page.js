"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  Flame,
  FolderKanban,
  Landmark,
  RefreshCw,
  TriangleAlert,
  UsersRound,
  Wrench,
} from "lucide-react";
import { DateCell, Pill } from "@/components/ui";
import { CASH_FLOW, CLOSURE_FLOW, FLOW, INSTALL_FLOW, LOAN_FLOW, STAGE_LABEL, TAT_DAYS } from "@/lib/workflow";
import { LEAD_STAGE_LABEL } from "@/lib/leadConstants";
import { STEPS } from "@/lib/steps";

const GROUPS = [
  { key: "process", label: "Core process", hint: "Documents → PMSG → survey → payment", stages: FLOW, icon: FolderKanban, color: "bg-sky-500" },
  { key: "loan", label: "Loan process", hint: "Bank file to dispatch", stages: LOAN_FLOW, icon: Landmark, color: "bg-indigo-500" },
  { key: "cash", label: "Cash process", hint: "Payment collection and approval", stages: CASH_FLOW.filter((stage) => stage !== "cashReceipt"), icon: BadgeIndianRupee, color: "bg-amber-500" },
  { key: "payment", label: "Payment gate", hint: "Cheque documents and signed receipt", stages: ["subsidyChequeReady", "cashReceipt"], icon: BadgeIndianRupee, color: "bg-orange-500" },
  { key: "installation", label: "Installation", hint: "Installer to tariff check", stages: INSTALL_FLOW, icon: Wrench, color: "bg-violet-500" },
  { key: "closure", label: "Closure", hint: "Warranty and final handover", stages: CLOSURE_FLOW, icon: CheckCircle2, color: "bg-emerald-500" },
];

const CORE_FLOW = [
  { label: "Document Verification", note: "All documents proper", href: "/name-check" },
  { label: "Login PMSG", note: "Login completed", href: "/login-pmsg" },
  { label: "Site Survey", note: "Site and contact captured", href: "/site-survey" },
  { label: "Payment Work Start", note: "Cash or Loan selected", href: "/payment-work-start" },
];

function fetchDashboardData() {
  return Promise.all([
    fetch("/api/leads", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Could not load leads");
      return response.json();
    }),
    fetch("/api/cases", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Could not load cases");
      return response.json();
    }),
  ]);
}

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState(null);

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then(([leadRows, caseRows]) => {
        if (!active) return;
        setLeads(leadRows);
        setCases(caseRows);
        setAsOf(Date.now());
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const [leadRows, caseRows] = await fetchDashboardData();
      setLeads(leadRows);
      setCases(caseRows);
      setAsOf(Date.now());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
    }
  }

  const dashboard = useMemo(() => summarize(leads, cases, asOf), [leads, cases, asOf]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">Operations command center</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live view of lead conversion, case workload, delays and the complete solar delivery pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs text-slate-400 sm:block">
            <div>Last refreshed</div>
            <div className="font-medium text-slate-600">{asOf ? formatDateTime(asOf) : "Loading..."}</div>
          </div>
          <button onClick={refresh} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-dark disabled:opacity-60">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard loading={loading} icon={UsersRound} label="Open Leads" value={dashboard.openLeads.length} sub={`${dashboard.hotLeads.length} hot · ${dashboard.dueLeads.length} follow-ups due`} accent="brand" href="/leads" />
        <MetricCard loading={loading} icon={FolderKanban} label="Active Cases" value={dashboard.activeCases.length} sub={`${dashboard.activeLoanCases.length} loan · ${dashboard.activeCashCases.length} cash`} accent="blue" href="/name-check" />
        <MetricCard loading={loading} icon={TriangleAlert} label="Needs Attention" value={dashboard.attentionCount} sub={`${dashboard.holdCases.length} on hold · ${dashboard.overdueCases.length} overdue`} accent="rose" href="#priority-queue" />
        <MetricCard loading={loading} icon={CheckCircle2} label="Completed" value={dashboard.completedCases.length} sub={`${dashboard.conversionRate}% lead conversion`} accent="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">Operational pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">Where every active lead and case is waiting right now.</p>
            </div>
            <Pill color="blue">{dashboard.totalLiveWork} live items</Pill>
          </div>
          <CoreFlow />
          <div className="mt-6 space-y-5">
            <PipelineRow icon={UsersRound} label="Lead qualification" hint="Open leads before confirmation" count={dashboard.openLeads.length} total={dashboard.totalLiveWork} color="bg-brand" href="/leads" />
            {GROUPS.map((group) => (
              <PipelineRow key={group.key} icon={group.icon} label={group.label} hint={group.hint} count={dashboard.groupCounts[group.key]} total={dashboard.totalLiveWork} color={group.color} href={groupHref(group)} />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
            <MiniMetric label="New leads" value={dashboard.leadStageCounts.new} />
            <MiniMetric label="Contacted" value={dashboard.leadStageCounts.contacted} />
            <MiniMetric label="Quotation sent" value={dashboard.leadStageCounts.quotation} />
            <MiniMetric label="Documents ready" value={dashboard.leadStageCounts.documentsReady} />
          </div>
        </section>

        <section id="priority-queue" className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div><h2 className="font-bold text-slate-900">Priority queue</h2><p className="mt-1 text-sm text-slate-500">Items requiring immediate follow-up.</p></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><TriangleAlert size={18} /></span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && Array.from({ length: 4 }).map((_, index) => <div key={index} className="px-6 py-4"><div className="skeleton h-10 w-full" /></div>)}
            {!loading && dashboard.priorities.slice(0, 6).map((item) => <PriorityItem key={item.key} item={item} />)}
            {!loading && dashboard.priorities.length === 0 && (
              <div className="flex flex-col items-center px-6 py-12 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span><div className="mt-3 font-semibold text-slate-700">Nothing urgent</div><p className="mt-1 text-sm text-slate-400">No overdue work, holds or due follow-ups.</p></div>
            )}
          </div>
          {dashboard.priorities.length > 6 && <div className="border-t border-slate-100 px-6 py-3 text-center text-xs font-medium text-slate-400">+{dashboard.priorities.length - 6} more attention items</div>}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <BreakdownCard title="Lead health" subtitle="Open lead priority mix">
          <DonutSummary total={dashboard.openLeads.length} centerLabel="open" segments={[
            { label: "Hot", value: dashboard.temperatureCounts.Hot, color: "#f43f5e" },
            { label: "Warm", value: dashboard.temperatureCounts.Warm, color: "#f59e0b" },
            { label: "Cold", value: dashboard.temperatureCounts.Cold, color: "#38bdf8" },
          ]} />
        </BreakdownCard>
        <BreakdownCard title="Payment mode" subtitle="Cases after payment decision">
          <DonutSummary total={dashboard.loanCases.length + dashboard.cashCases.length} centerLabel="decided" segments={[
            { label: "Loan", value: dashboard.loanCases.length, color: "#6366f1" },
            { label: "Cash", value: dashboard.cashCases.length, color: "#2fa89a" },
          ]} />
        </BreakdownCard>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Delivery health</h2><p className="mt-1 text-sm text-slate-500">Progress and completion indicators.</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-dark"><Wrench size={18} /></span></div>
          <div className="mt-6 space-y-5">
            <HealthBar label="Lead conversion" value={dashboard.convertedLeads.length} total={leads.length} color="bg-brand" />
            <HealthBar label="Cases completed" value={dashboard.completedCases.length} total={cases.length} color="bg-emerald-500" />
            <HealthBar label="Installation workload" value={dashboard.groupCounts.installation} total={dashboard.activeCases.length} color="bg-violet-500" />
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Cases on hold</span><span className="font-bold text-slate-800">{dashboard.holdCases.length}</span></div>
            <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Past planned date</span><span className="font-bold text-slate-800">{dashboard.overdueCases.length}</span></div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="font-bold text-slate-900">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest lead updates and completed process steps.</p></div><Clock3 size={18} className="mt-1 text-slate-400" /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-6 py-3">Activity</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Time</th><th className="px-6 py-3 text-right">Open</th></tr></thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan="5" className="border-t border-slate-100 px-6 py-4"><div className="skeleton h-5 w-full" /></td></tr>)}
              {!loading && dashboard.recentActivity.map((item) => (
                <tr key={item.key} className="transition hover:bg-slate-50/70"><td className="border-t border-slate-100 px-6 py-4"><div className="font-semibold text-slate-700">{item.title}</div><div className="mt-0.5 text-xs text-slate-400">{item.detail}</div></td><td className="border-t border-slate-100 px-4 py-4"><div className="font-medium text-slate-700">{item.customer}</div><div className="text-xs text-slate-400">{item.reference}</div></td><td className="border-t border-slate-100 px-4 py-4 text-slate-500">{item.owner || "-"}</td><td className="border-t border-slate-100 px-4 py-4"><DateCell value={item.time} /></td><td className="border-t border-slate-100 px-6 py-4 text-right"><Link href={item.href} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-dark"><ArrowUpRight size={15} /></Link></td></tr>
              ))}
            </tbody>
          </table>
          {!loading && dashboard.recentActivity.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Activity will appear when leads and cases are updated.</div>}
        </div>
      </section>
    </div>
  );
}

function CoreFlow() {
  return (
    <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-700">Required core handoff</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {CORE_FLOW.map((item, index) => (
          <div key={item.href} className="contents">
            <Link href={item.href} className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2.5 ring-1 ring-sky-100 transition hover:ring-sky-300">
              <div className="text-xs font-semibold text-slate-700">{index + 1}. {item.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{item.note}</div>
            </Link>
            {index < CORE_FLOW.length - 1 && (
              <span className="flex items-center justify-center text-sky-400" aria-hidden="true">
                <ArrowRight size={16} className="rotate-90 sm:rotate-0" />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-sky-700">Site Survey details continue with the case and are shown again at Dispatch.</div>
    </div>
  );
}

function summarize(leads, cases, asOf) {
  const now = asOf ?? Number.NEGATIVE_INFINITY;
  const openLeads = leads.filter((lead) => lead.status === "open");
  const convertedLeads = leads.filter((lead) => lead.status === "converted");
  const activeCases = cases.filter((row) => row.stage !== "done");
  const completedCases = cases.filter((row) => row.stage === "done");
  const dueLeads = openLeads.filter((lead) => lead.nextFollowUp && new Date(lead.nextFollowUp).getTime() <= now);
  const hotLeads = openLeads.filter((lead) => lead.temperature === "Hot");
  const holdCases = activeCases.filter((row) => row.steps?.[row.stage]?.status === "hold");
  const overdueCases = activeCases.filter((row) => {
    const planned = row.schedule?.[row.stage]?.plannedDate;
    return TAT_DAYS[row.stage] > 0 && planned && new Date(planned).getTime() < now;
  });
  const paymentMode = (row) => row.steps?.paymentWorkStart?.cashOrLoan || row.preferredPaymentMode;
  const loanCases = cases.filter((row) => paymentMode(row) === "Loan");
  const cashCases = cases.filter((row) => paymentMode(row) === "Cash");
  const activeLoanCases = activeCases.filter((row) => paymentMode(row) === "Loan");
  const activeCashCases = activeCases.filter((row) => paymentMode(row) === "Cash");
  const groupCounts = Object.fromEntries(GROUPS.map((group) => [group.key, activeCases.filter((row) => group.stages.includes(row.stage)).length]));
  const leadStageCounts = Object.fromEntries(["new", "contacted", "quotation", "documentsReady"].map((stage) => [stage, openLeads.filter((lead) => lead.leadStage === stage).length]));
  const temperatureCounts = Object.fromEntries(["Hot", "Warm", "Cold"].map((temperature) => [temperature, openLeads.filter((lead) => lead.temperature === temperature).length]));

  const priorities = [
    ...dueLeads.map((lead) => ({ key: `lead-${lead.id}`, type: "Follow-up due", color: "rose", title: lead.customerName, meta: `${lead.id} · ${lead.mobile}`, time: lead.nextFollowUp, href: "/leads" })),
    ...holdCases.map((row) => ({ key: `hold-${row.id}`, type: "On hold", color: "amber", title: row.customerName, meta: `${row.id} · ${STAGE_LABEL[row.stage]}`, time: row.steps?.[row.stage]?.submittedAt, href: stageHref(row.stage) })),
    ...overdueCases.filter((row) => !holdCases.some((hold) => hold.id === row.id)).map((row) => ({ key: `overdue-${row.id}`, type: "Past planned date", color: "red", title: row.customerName, meta: `${row.id} · ${STAGE_LABEL[row.stage]}`, time: row.schedule?.[row.stage]?.plannedDate, href: stageHref(row.stage) })),
  ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

  const leadActivity = leads.map((lead) => ({ key: `lead-${lead.id}-${lead.updatedAt}`, title: lead.status === "converted" ? "Lead converted to case" : lead.status === "lost" ? "Lead marked lost" : "Lead updated", detail: lead.status === "open" ? LEAD_STAGE_LABEL[lead.leadStage] : lead.status, customer: lead.customerName, reference: lead.id, owner: lead.updatedBy || lead.createdBy, time: lead.updatedAt || lead.timestamp, href: "/leads" }));
  const caseActivity = cases.flatMap((row) => Object.entries(row.steps ?? {}).filter(([, entry]) => entry?.submittedAt).map(([step, entry]) => ({ key: `${row.id}-${step}-${entry.submittedAt}`, title: `${STAGE_LABEL[step] ?? step} completed`, detail: entry.status === "hold" ? "Saved on hold" : "Moved to next stage", customer: row.customerName, reference: row.id, owner: entry.submittedBy, time: entry.submittedAt, href: stageHref(step) })));
  const recentActivity = [...leadActivity, ...caseActivity].filter((item) => item.time).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  const conversionRate = leads.length ? Math.round((convertedLeads.length / leads.length) * 100) : 0;
  const totalLiveWork = openLeads.length + activeCases.length;

  return { openLeads, convertedLeads, activeCases, completedCases, dueLeads, hotLeads, holdCases, overdueCases, loanCases, cashCases, activeLoanCases, activeCashCases, groupCounts, leadStageCounts, temperatureCounts, priorities, recentActivity, conversionRate, totalLiveWork, attentionCount: priorities.length };
}

function MetricCard({ loading, icon: Icon, label, value, sub, accent, href }) {
  const colors = { brand: "bg-brand-50 text-brand-dark", blue: "bg-sky-50 text-sky-600", rose: "bg-rose-50 text-rose-600", green: "bg-emerald-50 text-emerald-600" };
  const content = <><div className="flex items-start justify-between"><div><div className="text-sm font-medium text-slate-500">{label}</div>{loading ? <div className="skeleton mt-3 h-8 w-20" /> : <div className="mt-2 text-[30px] font-bold leading-none tracking-tight text-slate-900">{value}</div>}</div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[accent]}`}><Icon size={19} /></span></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400"><span>{sub}</span>{href && <ArrowUpRight size={14} />}</div></>;
  return href ? <Link href={href} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md">{content}</Link> : <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">{content}</div>;
}

function PipelineRow({ icon: Icon, label, hint, count, total, color, href }) {
  const percentage = total ? Math.round((count / total) * 100) : 0;
  return <Link href={href} className="group grid grid-cols-[42px_1fr_auto] items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-dark"><Icon size={18} /></span><div><div className="flex items-center justify-between gap-3"><div><span className="text-sm font-semibold text-slate-700">{label}</span><span className="ml-2 hidden text-xs text-slate-400 sm:inline">{hint}</span></div><span className="text-xs font-medium text-slate-400">{percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div></div><div className="min-w-10 text-right text-xl font-bold text-slate-800">{count}</div></Link>;
}

function MiniMetric({ label, value }) { return <div className="rounded-xl bg-slate-50 px-3 py-3"><div className="text-lg font-bold text-slate-800">{value}</div><div className="mt-0.5 text-xs text-slate-400">{label}</div></div>; }

function PriorityItem({ item }) { return <Link href={item.href} className="group flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color === "rose" || item.color === "red" ? "bg-rose-500" : "bg-amber-500"}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-slate-700">{item.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.type}</span></div><div className="mt-0.5 truncate text-xs text-slate-400">{item.meta}</div></div><div className="text-right text-xs text-slate-400"><DateCell value={item.time} /></div><ArrowUpRight size={14} className="text-slate-300 group-hover:text-brand" /></Link>; }

function BreakdownCard({ title, subtitle, children }) { return <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p>{children}</section>; }

function DonutSummary({ total, centerLabel, segments }) {
  let offset = 0;
  const stops = segments.map((segment) => { const start = total ? (offset / total) * 100 : 0; offset += segment.value; const end = total ? (offset / total) * 100 : 0; return `${segment.color} ${start}% ${end}%`; });
  const background = total ? `conic-gradient(${stops.join(", ")})` : "#e2e8f0";
  return <div className="mt-6 flex items-center gap-6"><div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background }}><div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold text-slate-800">{total}</span><span className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</span></div></div><div className="flex-1 space-y-3">{segments.map((segment) => <div key={segment.label} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span><span className="font-bold text-slate-700">{segment.value}</span></div>)}</div></div>;
}

function HealthBar({ label, value, total, color }) { const percentage = total ? Math.round((value / total) * 100) : 0; return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-600">{label}</span><span className="font-bold text-slate-700">{percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div><div className="mt-1.5 text-xs text-slate-400">{value} of {total}</div></div>; }

function stageHref(stage) { const step = STEPS.find((item) => item.slug !== "leads" && item.title === STAGE_LABEL[stage]); return step ? `/${step.slug}` : "/dashboard"; }
function groupHref(group) { return stageHref(group.stages[0]); }
function formatDateTime(value) { return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
