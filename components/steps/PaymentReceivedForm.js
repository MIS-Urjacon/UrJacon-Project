"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";

// Cash flow: "90% Payment Received?" is a Yes / No answer.
// Yes -> Dispatch. No -> Check for Approval (Director approval to dispatch without payment).
export default function PaymentReceivedForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.cashPaymentReceived;
  const [f, setF] = useState({
    paymentReceived: prev?.paymentReceived ?? "",
    remark: prev?.remark ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const msg = await onSubmit(f);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <Label required>90% Payment Received?</Label>
          <DropSelect
            className="field"
            required
            disabled={readOnly}
            value={f.paymentReceived}
            onChange={(e) => setF({ ...f, paymentReceived: e.target.value })}
          >
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </DropSelect>
        </label>
        <label className="block sm:col-span-2">
          <Label>Remark</Label>
          <textarea
            rows={3}
            className="field !h-auto py-2.5"
            disabled={readOnly}
            placeholder="Add a remark"
            value={f.remark}
            onChange={(e) => setF({ ...f, remark: e.target.value })}
          />
        </label>
      </div>
      {!readOnly && f.paymentReceived && (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {f.paymentReceived === "Yes"
            ? "The case moves to Dispatch."
            : "The case moves to Check for Approval (Director approval is needed to dispatch without payment)."}
        </div>
      )}
      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={err} submitLabel="Submit" />
    </form>
  );
}
