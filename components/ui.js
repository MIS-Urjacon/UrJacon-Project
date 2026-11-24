import { CheckCircle2 } from "lucide-react";

// Small shared UI pieces so every step page looks the same.

export function StatCard({ icon: Icon, label, value, sub, tint = "brand" }) {
  const tints = {
    brand: "bg-brand-50 text-brand-dark",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none tracking-tight">{value}</div>
      {sub && <div className="mt-2 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function HighlightCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-emerald-300 p-5 text-white shadow-[0_8px_24px_-8px_rgba(47,168,154,0.6)]">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="text-sm font-medium text-white/85">{label}</span>
        {Icon && <Icon size={18} className="text-white/80" />}
      </div>
      <div className="relative mt-3 text-[28px] font-bold leading-none tracking-tight">{value}</div>
      {sub && <div className="relative mt-2 text-xs text-white/80">{sub}</div>}
    </div>
  );
}

const PILLS = {
  green: ["bg-emerald-50 text-emerald-700 ring-emerald-600/15", "bg-emerald-500"],
  amber: ["bg-amber-50 text-amber-700 ring-amber-600/15", "bg-amber-500"],
  red: ["bg-rose-50 text-rose-700 ring-rose-600/15", "bg-rose-500"],
  blue: ["bg-sky-50 text-sky-700 ring-sky-600/15", "bg-sky-500"],
  gray: ["bg-slate-100 text-slate-600 ring-slate-500/10", "bg-slate-400"],
};

export function Pill({ children, color = "gray" }) {
  const [cls, dot] = PILLS[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

export function Avatar({ name }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-dark ring-1 ring-brand-100">
      {initials}
    </span>
  );
}

const ROUTE_COLOR = { Loan: "blue", Cash: "green" };
export function RoutePill({ route }) {
  if (!route) return "-";
  return <Pill color={ROUTE_COLOR[route] ?? "amber"}>{route}</Pill>;
}

// Date on the first line, time below it. Shows "-" when there is no value yet.
export function DateCell({ value }) {
  if (!value) return <span className="text-slate-300">-</span>;
  const d = new Date(value);
  return (
    <div className="leading-tight">
      <div className="text-slate-700">
        {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
      </div>
      <div className="text-xs text-slate-400">
        {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

export function CustomerCell({ row }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="font-semibold text-slate-800">{row.customerName}</div>
        <div className="text-xs text-slate-400">{row.id}</div>
      </div>
    </div>
  );
}

// Read-only strip shown at the top of step popups so the user knows which case it is.
export function CaseSummary({ row }) {
  const items = [
    ["BP SC Number", row.bpScNumber],
    ["Customer", row.customerName],
    ["Village", row.village],
    ["Product Code", row.productCode],
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-800">{v || "-"}</div>
        </div>
      ))}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary:
      "bg-brand text-white shadow-sm hover:bg-brand-dark disabled:opacity-60",
    outline: "border border-brand text-brand-dark hover:bg-brand-50",
    ghost: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  };
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="anim-slide fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
      <CheckCircle2 size={18} className="text-emerald-400" />
      {message}
    </div>
  );
}
