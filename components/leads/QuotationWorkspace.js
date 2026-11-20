"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import { Label } from "@/components/steps/shared";
import QuotationForm from "@/components/leads/QuotationForm";

// Quotation > Pending. No table: the quotation format is always on screen. Choose a BP SC Number and
// that lead's details fill the quotation; then save the draft or send it.
export default function QuotationWorkspace({ rows, loading, reload, notify, revising, clearRevising }) {
  const [id, setId] = useState(revising?.id ?? "");
  const reviseMode = Boolean(revising) && id === revising.id;
  const lead = reviseMode ? revising : rows.find((row) => row.id === id);
  const options = [...rows, ...(reviseMode && !rows.some((row) => row.id === revising.id) ? [revising] : [])].sort((a, b) => (a.bpScNumber || a.id).localeCompare(b.bpScNumber || b.id));

  function done(message) {
    notify(message);
    setId("");
    clearRevising?.();
    reload();
  }
  function choose(value) {
    setId(value);
    if (revising && value !== revising.id) clearRevising?.();
  }

  return (
    <div className="space-y-6 border-t border-slate-100 px-6 py-5">
      <label className="block max-w-md">
        <Label required>BP SC Number</Label>
        <DropSelect className="field" value={lead ? id : ""} disabled={loading} onChange={(event) => choose(event.target.value)}>
          <option value="">{loading ? "Loading..." : options.length ? "Select BP SC Number" : "No lead is ready for a quotation"}</option>
          {options.map((row) => (
            <option key={row.id} value={row.id}>{`${row.bpScNumber || row.id} · ${row.customerName}`}</option>
          ))}
        </DropSelect>
        <p className="mt-1.5 text-xs text-slate-500">Choose the BP SC Number to fill the quotation with that customer's details.</p>
      </label>
      {lead ? (
        <QuotationForm key={`${lead.id}-${reviseMode ? "revise" : "new"}`} row={lead} revising={reviseMode} onComplete={done} onRefresh={reload} onCancel={() => choose("")} />
      ) : (
        <QuotationForm key="idle" idle row={{}} onComplete={() => {}} onCancel={() => {}} />
      )}
    </div>
  );
}
