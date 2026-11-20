"use client";
import { UserCheck, Users } from "lucide-react";

// "Assigned To" column cell. Explicit: the employees chosen by admin / management (with who and
// when). Automatic: everyone who has access to the page the work is on.
export default function AssigneeCell({ row }) {
  const label = row?.assigneesLabel ?? row?.assignedToName;
  if (!label) return <span className="text-slate-300">-</span>;
  if (row.assigneesAuto) {
    return (
      <div className="max-w-48 leading-tight" title={label}>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Users size={12} className="shrink-0 text-slate-400" />
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">{row.assigneesDefault ? "Default · page assignee" : "Auto · page access"}</div>
      </div>
    );
  }
  const when = row.assignedAt
    ? new Date(row.assignedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    : "";
  return (
    <div className="max-w-48 leading-tight" title={label}>
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-dark">
        <UserCheck size={12} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {(row.assignedBy || when) && (
        <div className="mt-1 text-[11px] text-slate-400">
          {row.assignedBy ? `by ${row.assignedBy}` : ""}{row.assignedBy && when ? " · " : ""}{when}
        </div>
      )}
    </div>
  );
}
