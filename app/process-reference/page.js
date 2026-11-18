import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenCheck, Building2, CheckCircle2, Database, FileCheck2, FileStack, Landmark, Scale, ShieldAlert, UsersRound } from "lucide-react";
import { BUSINESS_RULES, DOCUMENT_SETS, EXTERNAL_SYSTEMS, GLOSSARY, ROLE_ACTIONS } from "@/lib/processReference";
import { HOLD_REASONS } from "@/lib/processConfig";

const NAV = [["flow", "Core Flow"], ["rules", "Rules"], ["roles", "Roles"], ["documents", "Documents"], ["holds", "Holds"], ["systems", "External Systems"], ["glossary", "Glossary"]];
const FLOW = [
  ["1", "Lead & Quotation", "Customer requirement and document packet"],
  ["2", "Verification", "All documents proper before PMSG login"],
  ["3", "Login & Survey", "Application No. and site material report"],
  ["4", "Payment Route", "Loan, Cash or Odisha Subsidy Cheque"],
  ["5", "Dispatch & Install", "Receipt gate, material and evidence"],
  ["6", "Inspection", "Meter, JE, commissioning and portal approval"],
  ["7", "Closure", "Subsidy, zero balance, warranty and handover"],
];
const CRITICAL = new Set(["BR-04", "BR-11", "BR-12", "BR-13", "BR-16", "BR-24", "BR-28", "BR-29"]);

export default function ProcessReferencePage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-emerald-400 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75"><BookOpenCheck size={16} />Operating Handbook</div><h1 className="mt-3 text-3xl font-bold tracking-tight">Urjacon Process Reference</h1><p className="mt-2 text-sm leading-6 text-white/85">One place for workflow gates, ownership, required documents, hold codes and external-system references. Use this page to understand why a case moved—or why it stopped.</p></div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><HeroStat value={BUSINESS_RULES.length} label="Business rules" /><HeroStat value={Object.keys(HOLD_REASONS).length} label="Hold codes" /><HeroStat value={ROLE_ACTIONS.length} label="Role groups" /><HeroStat value={DOCUMENT_SETS.length} label="Document sets" /></div>
      </header>

      <nav className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur"><div className="flex min-w-max gap-1">{NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-dark">{label}</a>)}</div></nav>

      <section id="flow" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <SectionHead icon={ArrowRight} eyebrow="End-to-end sequence" title="Seven-stage operating flow" description="A case advances only when the current gate is complete." />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-7">{FLOW.map(([number, title, detail], index) => <div key={number} className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">{number}</span><div className="mt-3 text-sm font-bold text-slate-800">{title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>{index < FLOW.length - 1 && <ArrowRight size={15} className="absolute -right-2.5 top-1/2 z-10 hidden rounded-full bg-white text-brand xl:block" />}</div>)}</div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-5"><div className="flex items-center gap-2 font-bold text-sky-900"><Database size={17} />How data is stored</div><p className="mt-2 text-sm leading-6 text-sky-800">A <b>Lead</b> contains the possible customer and follow-ups. Confirmed quotation and documents create one <b>Case</b>. Every submitted page becomes a <b>Case Step</b>, files remain attached to that step, and the <b>Schedule</b> stores arrival, planned and actual dates. BP/SC No. identifies the connection; PMSG Application No. links portal work from Login onward.</p></div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5"><div className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle size={17} />Golden gate</div><p className="mt-2 text-sm leading-6 text-amber-800">No document correction means no PMSG login. No signed receipt means no dispatch. No required installation evidence means no portal submission. Any remaining consumer balance means no Warranty & Handover.</p></div>
        </div>
      </section>

      <section id="rules" className="scroll-mt-20 space-y-5">
        <SectionHead icon={Scale} eyebrow="Decision controls" title="Business rules" description="Critical gates are highlighted first; the complete BR-01 to BR-29 list follows." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{BUSINESS_RULES.filter(([code]) => CRITICAL.has(code)).map(([code, rule]) => <RuleCard key={code} code={code} rule={rule} critical />)}</div>
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm" open><summary className="cursor-pointer px-5 py-4 font-semibold text-slate-800">View all {BUSINESS_RULES.length} business rules</summary><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{BUSINESS_RULES.map(([code, rule]) => <RuleCard key={code} code={code} rule={rule} />)}</div></details>
      </section>

      <section id="roles" className="scroll-mt-20"><SectionHead icon={UsersRound} eyebrow="Accountability" title="Who handles what" description="Operational ownership defined by the process reference." /><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ROLE_ACTIONS.map(([name, detail], index) => <InfoCard key={name} number={index + 1} title={name} detail={detail} />)}</div></section>

      <section id="documents" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><SectionHead icon={FileStack} eyebrow="Checklists" title="Required document sets" description="Documents that must travel with the case at each major handoff." /><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{DOCUMENT_SETS.map(([name, detail]) => <div key={name} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-bold text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><FileCheck2 size={16} /></span>{name}</div><ul className="mt-3 space-y-2">{detail.split(";").map((item) => <li key={item} className="flex gap-2 text-sm text-slate-600"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{item.trim()}</li>)}</ul></div>)}</div></section>

      <section id="holds" className="scroll-mt-20"><SectionHead icon={ShieldAlert} eyebrow="Exceptions" title="Hold codes H01–H22" description="A hold keeps the case on its current page until the blocker is resolved and resubmitted." /><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Code</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">System action</th></tr></thead><tbody>{Object.entries(HOLD_REASONS).map(([code, reason]) => <tr key={code} className="hover:bg-slate-50/70"><td className="border-t border-slate-100 px-5 py-3"><span className="rounded-md bg-rose-50 px-2 py-1 font-mono text-xs font-bold text-rose-600">{code}</span></td><td className="border-t border-slate-100 px-4 py-3 font-medium text-slate-700">{reason}</td><td className="border-t border-slate-100 px-4 py-3 text-slate-500">Stay at current step · preserve data · retry after resolution</td></tr>)}</tbody></table></div></div></section>

      <section id="systems" className="scroll-mt-20"><SectionHead icon={Building2} eyebrow="Integrations" title="External systems & references" description="The identifier stored in Urjacon and the work performed outside this application." /><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{EXTERNAL_SYSTEMS.map(([system, reference, use]) => <div key={system} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="font-bold text-slate-800">{system}</div><Landmark size={17} className="text-slate-300" /></div><div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-dark">Stored: {reference}</div><p className="mt-3 text-sm leading-6 text-slate-500">{use}</p></div>)}</div></section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><SectionHead icon={BookOpenCheck} eyebrow="Examples" title="How the rules work together" description="Three common end-to-end paths." /><div className="mt-5 grid gap-4 lg:grid-cols-3"><Example number="01" title="CG loan + correction" text="Correction → PMSG → survey → agreement → JanSamarth/PHS → 70% + DP → signed receipt → dispatch → installation → inspection/meter/JE → final 30% → subsidy → zero balance → warranty."/><Example number="02" title="OD subsidy cheque" text="Price-minus-subsidy balance + both cheques + agreement → signed receipt → TPWODL dispatch → installation/inspection → subsidy → cheque deposit → balance → warranty."/><Example number="03" title="Cash below 90%" text="Named MD approval may permit dispatch, but DCR and commissioning remain blocked until 90% is received. Remaining balance still blocks warranty."/></div></section>

      <section id="glossary" className="scroll-mt-20"><SectionHead icon={BookOpenCheck} eyebrow="Quick definitions" title="Glossary" description="Terms used across the process pages." /><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{GLOSSARY.map(([term, meaning]) => <div key={term} className="rounded-xl border border-slate-200 bg-white p-4"><div className="font-bold text-brand-dark">{term}</div><p className="mt-1 text-sm leading-5 text-slate-500">{meaning}</p></div>)}</div></section>

      <div className="flex justify-center pb-2"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-50">Back to Dashboard <ArrowRight size={15} /></Link></div>
    </div>
  );
}

function HeroStat({ value, label }) { return <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-bold">{value}</div><div className="mt-0.5 text-xs text-white/70">{label}</div></div>; }
function SectionHead({ icon: Icon, eyebrow, title, description }) { return <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-dark"><Icon size={19} /></span><div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-dark">{eyebrow}</div><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>; }
function RuleCard({ code, rule, critical }) { return <div className={`rounded-xl border p-4 ${critical ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-white"}`}><div className={`font-mono text-xs font-bold ${critical ? "text-amber-700" : "text-brand-dark"}`}>{code}{critical && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-sans text-[9px] uppercase tracking-wide">Critical</span>}</div><p className="mt-2 text-sm leading-6 text-slate-600">{rule}</p></div>; }
function InfoCard({ number, title, detail }) { return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{String(number).padStart(2, "0")}</span><div><div className="font-bold text-slate-800">{title}</div><p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p></div></div></div>; }
function Example({ number, title, text }) { return <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-5"><span className="absolute right-4 top-2 text-5xl font-black text-slate-100">{number}</span><div className="relative font-bold text-slate-800">{title}</div><p className="relative mt-3 text-sm leading-6 text-slate-500">{text}</p></div>; }
