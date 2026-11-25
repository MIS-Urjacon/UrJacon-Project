"use client";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import DropSelect from "@/components/Select";

// Shared table filters (used by every list page).
//   defs: [{ key, label, type: "select" | "date", get: (row) => value }]
//     select: get() returns text; the options are the distinct values found in the rows.
//     date:   get() returns an ISO date / datetime; the filter is a From / To range (day precision, local time).
// useTableFilters(rows, defs, onChange) returns { values, set, reset, count, apply } where apply(rows) filters rows.

const dayOf = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function useTableFilters(defs, onChange) {
  const [values, setValues] = useState({});
  const set = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    onChange?.();
  };
  const reset = () => {
    setValues({});
    onChange?.();
  };
  const count = defs.reduce((n, d) => n + (d.type === "date" ? (values[`${d.key}From`] || values[`${d.key}To`] ? 1 : 0) : values[d.key] ? 1 : 0), 0);
  const apply = (rows) =>
    rows.filter((row) =>
      defs.every((d) => {
        if (d.type === "date") {
          const from = values[`${d.key}From`];
          const to = values[`${d.key}To`];
          if (!from && !to) return true;
          const day = dayOf(d.get(row));
          if (!day) return false;
          return (!from || day >= from) && (!to || day <= to);
        }
        const wanted = values[d.key];
        return !wanted || String(d.get(row) ?? "") === wanted;
      })
    );
  return { values, set, reset, count, apply };
}

// Filters shown inline next to the search box: one dropdown per def (options = distinct values in `rows`), plus Clear.
export function InlineFilters({ defs, rows, filters }) {
  const options = useMemo(
    () => Object.fromEntries(defs.map((d) => [d.key, [...new Set(rows.map((r) => String(d.get(r) ?? "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))])),
    [defs, rows]
  );
  const { values, set, reset, count } = filters;
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {defs.map((d) => (
        <div key={d.key} className="w-44 max-w-full">
          <DropSelect variant="dropdown" className="field" value={values[d.key] ?? ""} onChange={(e) => set(d.key, e.target.value)}>
            <option value="">{d.label}</option>
            {options[d.key].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </DropSelect>
        </div>
      ))}
      {count > 0 && (
        <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-1 px-2 text-xs font-semibold text-slate-500 hover:text-rose-600">
          <X size={13} /> Clear
        </button>
      )}
    </div>
  );
}

// Search: matches every word typed against the VALUES of the record (names, numbers, dates, remarks...),
// never against field names or file links, so typing "village" or "status" does not match every row.
const haystacks = new WeakMap();
function collect(value, out, depth = 0) {
  if (value == null || depth > 6) return;
  if (typeof value === "string") {
    if (!value.startsWith("/api/files/") && value.length < 400) out.push(value);
  } else if (typeof value === "number") out.push(String(value));
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out, depth + 1));
  else if (typeof value === "object") Object.values(value).forEach((v) => collect(v, out, depth + 1));
}
export function matchesQuery(row, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  let hay = haystacks.get(row);
  if (hay === undefined) {
    const out = [];
    collect(row, out);
    hay = out.join(" \n ").toLowerCase();
    haystacks.set(row, hay);
  }
  return words.every((w) => hay.includes(w));
}
