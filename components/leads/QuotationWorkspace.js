"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import { Label } from "@/components/steps/shared";
import QuotationForm from "@/components/leads/QuotationForm";

// Quotation > Pending. No table: the quotation format is always on screen. Choose a BP SC Number and
// that lead's details fill the quotation; then save the draft or send it.
export default function QuotationWorkspace({ rows, loading, reload, notify, revising, clearRevising }) {
  const [id, setId] = useState(revising?.id ?? "");
  // "direct" = a quotation for a client who has no BP SC Number (no lead); it is typed in the proposal itself.
  const [direct, setDirect] = useState(false);
  const [directKey, setDirectKey] = useState(0);
  const reviseMode = Boolean(revising) && id === revising.id;
  const lead = reviseMode ? revising : rows.find((row) => row.id === id);
  const options = [...rows, ...(reviseMode && !rows.some((row) => row.id === revising.id) ? [revising] : [])].sort((a, b) => (a.bpScNumber || a.id).localeCompare(b.bpScNumber || b.id));

  function done(message) {
    notify(message);
    setId("");
    setDirect(false);
    setDirectKey((n) => n + 1);
    clearRevising?.();
    reload();
  }
  function choose(value) {
    setId(value);
    if (value) setDirect(false);
    if (revising && value !== revising.id) clearRevising?.();
  }

  return (
    <div className="space-y-6 border-t border-slate-100 px-6 py-5">
      <div className="flex flex-wrap gap-2">
        {[[false, "Lead with BP SC Number"], [true, "New client (no BP SC Number)"]].map(([value, label]) => (
          <button key={label} type="button" onClick={() => { setDirect(value); if (value) choose(""); }} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${direct === value ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand"}`}>{label}</button>
        ))}
      </div>
      {direct ? (
        <p className="text-xs text-slate-500">For a client who is not a lead yet: fill the customer and price in the quotation below and Submit. It is kept only in Quotation &gt; History; no lead is created.</p>
      ) : (
        <label className="block max-w-md">
          <Label required>BP SC Number</Label>
          <DropSelect variant="dropdown" className="field" value={lead ? id : ""} disabled={loading} onChange={(event) => choose(event.target.value)}>
            <option value="">{loading ? "Loading..." : options.length ? "Select BP SC Number" : "No lead is ready for a quotation"}</option>
            {options.map((row) => (
              <option key={row.id} value={row.id}>{`${row.bpScNumber || row.id} · ${row.customerName}`}</option>
            ))}
          </DropSelect>
          <p className="mt-1.5 text-xs text-slate-500">Choose the BP SC Number to fill the quotation with that customer's details.</p>
        </label>
      )}
      {direct ? (
        <QuotationForm key={`direct-${directKey}`} walkIn row={{}} onComplete={done} onCancel={() => setDirect(false)} />
      ) : lead ? (
        <QuotationForm key={`${lead.id}-${reviseMode ? "revise" : "new"}`} row={lead} revising={reviseMode} onComplete={done} onRefresh={reload} onCancel={() => choose("")} />
      ) : (
        <QuotationForm key="idle" idle row={{}} onComplete={() => {}} onCancel={() => {}} />
      )}
    </div>
  );
}
