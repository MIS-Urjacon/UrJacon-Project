"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import FileUpload from "@/components/FileUpload";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { HOLD_REASONS, PROCESS_CONFIG, RECEIPT_STATUS } from "@/lib/processConfig";

export default function ReferenceStepForm({ stepKey, row, readOnly, onSubmit, onCancel }) {
  const config = PROCESS_CONFIG[stepKey];
  const previous = row.steps?.[stepKey];
  const [form, setForm] = useState(() => ({
    workStatus: config.noStatus ? "Done" : previous?.workStatus ?? "",
    receiptStatus: previous?.receiptStatus ?? "",
    holdCode: previous?.holdCode ?? "",
    retryDate: previous?.retryDate ?? "",
    remark: previous?.remark ?? "",
    ...Object.fromEntries(config.fields.map((item) => [item.key, initialFieldValue(row, previous, item)])),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const receipt = Boolean(config.receiptStatus); // Accounts Cash Receipt: Receipt Status replaces Status + Hold Reason Code
  const hold = receipt ? form.receiptStatus === RECEIPT_STATUS.BELOW : form.workStatus === "Not Done";
  const optionalFields = receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT; // cash details may stay empty
  const remarkRequired = hold || (receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const message = await onSubmit(receipt ? { ...form, workStatus: hold ? "Not Done" : "Done", holdCode: hold ? "H11" : "" } : form);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      <CaseDetails items={importantDetails(row, stepKey)} />
      {["dispatch", "cashDispatch"].includes(stepKey) && row.steps?.siteSurvey?.status !== "done" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          The survey is not completed for this case. Dispatch is blocked until the survey report is filled on the Survey List page.
        </div>
      )}
      <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-700">
        <b>Owner:</b> {config.owner} · {config.subtitle}
      </div>
      {receipt && (
        <fieldset disabled={readOnly}>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt result</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Receipt Status" required value={form.receiptStatus} options={Object.values(RECEIPT_STATUS)} onChange={(value) => set("receiptStatus", value)} />
            {hold && <Field label="Retry / Follow-up Date" type="date" value={form.retryDate} onChange={(value) => set("retryDate", value)} />}
          </div>
          {form.receiptStatus === RECEIPT_STATUS.BELOW && <p className="mt-2 text-xs text-amber-700">The case stays in Pending on hold until the 90% cash is received.</p>}
          {form.receiptStatus === RECEIPT_STATUS.WITHOUT && <p className="mt-2 text-xs text-amber-700">The case moves on to Dispatch. The cash details below are optional; write who approved this in the remark.</p>}
        </fieldset>
      )}
      {!config.noStatus && !receipt && <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Step result</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" required value={form.workStatus} options={["Done", "Not Done"]} onChange={(value) => set("workStatus", value)} />
          {hold && config.holds?.length > 0 && <Select label="Hold Reason Code" required value={form.holdCode} options={config.holds.map((code) => [code, `${code} · ${HOLD_REASONS[code]}`])} onChange={(value) => set("holdCode", value)} />}
          {hold && <Field label="Retry / Follow-up Date" type="date" value={form.retryDate} onChange={(value) => set("retryDate", value)} />}
        </div>
      </fieldset>}
      <fieldset disabled={readOnly || hold}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Required details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((item) => item.type === "files" ? (
            <div key={item.key} className="sm:col-span-2">
              <Label required={item.required && !optionalFields}>{item.label}</Label>
              <FileUpload files={form[item.key]} onChange={(files) => set(item.key, files)} max={item.max ?? 5} readOnly={readOnly || hold} />
              {item.autoFrom && form[item.key]?.length > 0 && <AutoHint>{item.autoFrom}</AutoHint>}
            </div>
          ) : item.type === "select" ? (
            <Select key={item.key} label={item.label} required={item.required && !optionalFields} value={form[item.key]} options={item.options} onChange={(value) => set(item.key, value)} hint={form[item.key] ? item.autoFrom : ""} />
          ) : (
            <Field key={item.key} label={item.label} required={item.required && !optionalFields} type={item.type} value={form[item.key]} onChange={(value) => set(item.key, value)} hint={form[item.key] !== "" ? item.autoFrom : ""} />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <Label required={remarkRequired}>Remark</Label>
        <textarea className="field !h-auto py-2.5" rows={3} disabled={readOnly} value={form.remark} onChange={(event) => set("remark", event.target.value)} placeholder={hold ? "Explain the hold and next action" : receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT ? "Who approved dispatch without cash or down payment, and when the payment is expected" : "Optional remark"} />
      </label>
      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={error} submitLabel={hold ? "Save on Hold" : "Complete Step"} />
    </form>
  );
}

function initialFieldValue(row, previous, item) {
  const saved = previous?.[item.key];
  if (hasValue(saved)) return saved;
  if (item.defaultSources?.length && item.type === "files") {
    const files = item.defaultSources.flatMap(({ step, key }) => row.steps?.[step]?.[key] ?? []);
    if (files.length) return [...new Map(files.map((file) => [file.url, file])).values()].slice(0, item.max ?? 5);
  }
  if (item.defaultStep) {
    const value = row.steps?.[item.defaultStep]?.[item.defaultKey];
    if (hasValue(value)) return value;
  }
  if (item.defaultRow && hasValue(row[item.defaultRow])) return row[item.defaultRow];
  if (item.defaultByState && hasValue(item.defaultByState[row.state])) return item.defaultByState[row.state];
  if (item.defaultCalculation === "priceMinusSubsidy") {
    return Math.max(0, Number(row.dealAmount || 0) - Number(row.quotationSubsidy || 0)) || "";
  }
  return item.type === "files" ? [] : "";
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
}

function AutoHint({ children }) {
  return <div className="mt-1.5 text-xs font-medium text-brand-dark">Auto-filled from {children}</div>;
}

function Field({ label, required, type = "text", value, onChange, hint }) {
  return <label className="block"><Label required={required}>{label}</Label><input className="field" required={required} type={type} min={type === "number" ? 0 : undefined} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />{hint && <AutoHint>{hint}</AutoHint>}</label>;
}

function Select({ label, required, value, options, onChange, hint }) {
  return <label className="block"><Label required={required}>{label}</Label><DropSelect className="field" required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => { const [key, text] = Array.isArray(option) ? option : [option, option]; return <option key={key} value={key}>{text}</option>; })}</DropSelect>{hint && <AutoHint>{hint}</AutoHint>}</label>;
}
