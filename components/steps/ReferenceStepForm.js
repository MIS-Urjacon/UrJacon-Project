"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { HOLD_REASONS, PROCESS_CONFIG } from "@/lib/processConfig";

export default function ReferenceStepForm({ stepKey, row, readOnly, onSubmit, onCancel }) {
  const config = PROCESS_CONFIG[stepKey];
  const previous = row.steps?.[stepKey];
  const [form, setForm] = useState(() => ({
    workStatus: previous?.workStatus ?? "",
    holdCode: previous?.holdCode ?? "",
    retryDate: previous?.retryDate ?? "",
    remark: previous?.remark ?? "",
    ...Object.fromEntries(config.fields.map((item) => [item.key, initialFieldValue(row, previous, item)])),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hold = form.workStatus === "Not Done";
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const message = await onSubmit(form);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-700">
        <b>Owner:</b> {config.owner} · {config.subtitle}
      </div>
      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Step result</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" required value={form.workStatus} options={["Done", "Not Done"]} onChange={(value) => set("workStatus", value)} />
          {hold && config.holds?.length > 0 && <Select label="Hold Reason Code" required value={form.holdCode} options={config.holds.map((code) => [code, `${code} · ${HOLD_REASONS[code]}`])} onChange={(value) => set("holdCode", value)} />}
          {hold && <Field label="Retry / Follow-up Date" type="date" value={form.retryDate} onChange={(value) => set("retryDate", value)} />}
        </div>
      </fieldset>
      <fieldset disabled={readOnly || hold}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Required details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((item) => item.type === "files" ? (
            <div key={item.key} className="sm:col-span-2">
              <Label required={item.required}>{item.label}</Label>
              <FileUpload files={form[item.key]} onChange={(files) => set(item.key, files)} max={item.max ?? 5} readOnly={readOnly || hold} />
              {item.autoFrom && form[item.key]?.length > 0 && <AutoHint>{item.autoFrom}</AutoHint>}
            </div>
          ) : item.type === "select" ? (
            <Select key={item.key} label={item.label} required={item.required} value={form[item.key]} options={item.options} onChange={(value) => set(item.key, value)} hint={form[item.key] ? item.autoFrom : ""} />
          ) : (
            <Field key={item.key} label={item.label} required={item.required} type={item.type} value={form[item.key]} onChange={(value) => set(item.key, value)} hint={form[item.key] !== "" ? item.autoFrom : ""} />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <Label required={hold}>Remark</Label>
        <textarea className="field !h-auto py-2.5" rows={3} disabled={readOnly} value={form.remark} onChange={(event) => set("remark", event.target.value)} placeholder={hold ? "Explain the hold and next action" : "Optional remark"} />
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
