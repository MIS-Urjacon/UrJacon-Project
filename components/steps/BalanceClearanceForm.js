"use client";

import { useState } from "react";
import { CaseSummary, Pill } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function BalanceClearanceForm({ row, readOnly, onSubmit, onCancel }) {
  const previous = row.steps?.balanceClearance;
  const totalAmount = Number(row.dealAmount || previous?.totalAmount || previous?.balanceDue || 0);
  const [amountReceived, setAmountReceived] = useState(previous?.amountReceived ?? previous?.balanceRecovered ?? "");
  const [clearanceDate, setClearanceDate] = useState(previous?.clearanceDate ?? "");
  const [remark, setRemark] = useState(previous?.remark ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const received = Number(amountReceived || 0);
  const remaining = Math.max(0, totalAmount - received);
  const cleared = totalAmount > 0 && remaining === 0;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!(totalAmount > 0)) return setError("Quotation / deal amount is missing for this case");
    if (amountReceived === "" || received < 0) return setError("Enter the total amount received till now");
    if (received > totalAmount) return setError("Received amount cannot be more than the total amount to collect");
    if (cleared && !clearanceDate) return setError("Select the balance clearance date");
    setSaving(true);
    const message = await onSubmit({
      workStatus: cleared ? "Done" : "Not Done",
      totalAmount,
      amountReceived: received,
      balanceDue: totalAmount,
      balanceRecovered: received,
      remainingBalance: remaining,
      clearanceDate: cleared ? clearanceDate : "",
      holdCode: cleared ? "" : "H22",
      remark,
    });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      <CaseDetails items={importantDetails(row, "balanceClearance")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <AmountCard label="Total Amount to Collect" value={totalAmount} tone="slate" />
        <AmountCard label="Amount Received" value={received} tone="green" />
        <AmountCard label="Remaining Balance" value={remaining} tone={remaining > 0 ? "red" : "green"} />
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${cleared ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <div className="flex items-center justify-between gap-3"><b>{cleared ? "Balance fully cleared" : `${money(remaining)} is still pending`}</b><Pill color={cleared ? "green" : "amber"}>{cleared ? "Ready for Warranty" : "H22 · On Hold"}</Pill></div>
        {!cleared && <p className="mt-1">The case will remain on Balance Clearance and will not appear in Warranty & Handover.</p>}
      </div>

      <fieldset disabled={readOnly}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><Label required>Total Amount Received Till Now (₹)</Label><input className="field" type="number" min={0} max={totalAmount || undefined} required value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /></label>
          <label className="block"><Label required={cleared}>Balance Clearance Date</Label><input className="field" type="date" required={cleared} disabled={readOnly || !cleared} value={clearanceDate} onChange={(event) => setClearanceDate(event.target.value)} /></label>
          <label className="block sm:col-span-2"><Label>Remark</Label><textarea className="field !h-auto py-2.5" rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} placeholder={cleared ? "Optional closing remark" : "Payment follow-up or pending balance note"} /></label>
        </div>
      </fieldset>

      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={error} submitLabel={cleared ? "Clear Balance & Send to Warranty" : "Save Pending Balance"} />
    </form>
  );
}

function AmountCard({ label, value, tone }) {
  const styles = { slate: "border-slate-200 bg-slate-50 text-slate-900", green: "border-emerald-200 bg-emerald-50 text-emerald-800", red: "border-rose-200 bg-rose-50 text-rose-700" };
  return <div className={`rounded-xl border p-4 ${styles[tone]}`}><div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div><div className="mt-2 text-2xl font-bold">{money(value)}</div></div>;
}
