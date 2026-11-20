"use client";

// A compact "Important details" box for step popups: label / value pairs, empty ones left out.
export default function CaseDetails({ items, title = "Important details" }) {
  const shown = items.filter(([, value]) => value);
  if (!shown.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800" title={typeof value === "string" ? value : undefined}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
