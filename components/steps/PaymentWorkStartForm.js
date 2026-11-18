"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";

const FIELDS = [
  { key: "cashOrLoan", label: "Payment Mode", options: ["Cash", "Loan", "Subsidy Cheque"] },
  { key: "workStatus", label: "Status", options: ["Done", "Not Done"] },
  { key: "corridor", label: "Corridor", options: ["Regular", "Special"] },
];

export default function PaymentWorkStartForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.paymentWorkStart;
  const [f, setF] = useState({
    cashOrLoan: prev?.cashOrLoan ?? row.preferredPaymentMode ?? "",
    workStatus: prev?.workStatus ?? "",
    corridor: prev?.corridor ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (f.cashOrLoan === "Subsidy Cheque" && row.state !== "Odisha") {
      return setErr("Subsidy Cheque mode is available only for Odisha cases");
    }
    setSaving(true);
    const msg = await onSubmit(f);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map((fld) => (
          <label key={fld.key} className="block">
            <Label required>{fld.label}</Label>
            <DropSelect
              className="field"
              required
              disabled={readOnly}
              value={f[fld.key]}
              onChange={(e) => setF({ ...f, [fld.key]: e.target.value })}
            >
              <option value="">Select</option>
              {fld.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </DropSelect>
          </label>
        ))}
      </div>
      {!readOnly && f.workStatus !== "Not Done" && f.cashOrLoan && (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {f.cashOrLoan === "Loan"
            ? "Loan cases move to the Loan steps, starting with Bank File Ready."
            : f.cashOrLoan === "Subsidy Cheque"
            ? "Odisha subsidy-cheque cases move to cheque, agreement and balance verification."
            : "Cash cases move to the Cash steps, starting with Ask 90% Payment for Dispatch."}
        </div>
      )}
      {!readOnly && f.workStatus === "Not Done" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Status is Not Done. The case will stay in Pending until it is marked Done.
        </div>
      )}
      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel={f.workStatus === "Not Done" ? "Save as Not Done" : "Submit"}
      />
    </form>
  );
}
