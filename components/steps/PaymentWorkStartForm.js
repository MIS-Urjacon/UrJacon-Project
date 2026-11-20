"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import CaseDetails from "@/components/steps/CaseDetails";
import { docData } from "@/lib/workflow";

const FIELDS = [
  { key: "cashOrLoan", label: "Payment Mode", options: ["Cash", "Loan", "Subsidy Cheque"] },
  { key: "corridor", label: "Corridor", options: ["Regular", "Special"] },
];

export default function PaymentWorkStartForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.paymentWorkStart;
  const [f, setF] = useState({
    cashOrLoan: prev?.cashOrLoan ?? row.steps?.documentReceive?.paymentMode ?? docData(row)?.paymentMode ?? row.preferredPaymentMode ?? "",
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
      <CaseDetails items={importantDetails(row)} />
      <div className="grid gap-4 sm:grid-cols-2">
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
      {!readOnly && f.cashOrLoan && (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {f.cashOrLoan === "Loan"
            ? "Loan cases move to the Loan steps, starting with Bank File Ready."
            : f.cashOrLoan === "Subsidy Cheque"
            ? "Odisha subsidy-cheque cases move to cheque, agreement and balance verification."
            : "Cash cases move to the Cash steps, starting with Ask 90% Payment for Dispatch."}
        </div>
      )}
      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel="Submit"
      />
    </form>
  );
}

const money = (value) => (Number(value) > 0 ? `₹${Number(value).toLocaleString("en-IN")}` : "");

// What the payment decision needs from earlier steps.
function importantDetails(row) {
  const kw = Number(row.kwWanted) || 0;
  const price = Number(row.dealAmount) || 0;
  const central = Number(row.quotationCentralSubsidy) || 0;
  const stateSubsidy = Number(row.quotationStateSubsidy) || 0;
  const subsidy = central + stateSubsidy || Number(row.quotationSubsidy) || 0;
  const survey = row.steps?.siteSurvey;
  return [
    ["Mobile", row.mobile],
    ["Address", [row.address || row.village, row.state].filter(Boolean).join(", ")],
    ["System", kw ? [`${kw} kW`, row.quotationGridType, row.quotationDcrType].filter(Boolean).join(" · ") : ""],
    ["System Price", money(price)],
    ["Subsidy", money(subsidy)],
    ["Cost After Subsidy", price ? money(Math.max(0, price - subsidy)) : ""],
    ["Payment Mode (lead / receive)", row.steps?.documentReceive?.paymentMode || row.preferredPaymentMode],
    ["PMSG Application No.", row.steps?.login?.applicationNo],
    ["Quotation", row.quotationReference],
    ["Survey List", survey?.status === "done" ? "Completed" : "Pending (needed before Dispatch)"],
  ];
}
