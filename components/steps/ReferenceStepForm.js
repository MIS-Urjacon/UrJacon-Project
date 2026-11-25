"use client";

import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import FileUpload from "@/components/FileUpload";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";
import { materialDefault, materialItems } from "@/lib/materials";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { HOLD_REASONS, PROCESS_CONFIG, RECEIPT_STATUS } from "@/lib/processConfig";

// Steps whose "no" answer sends the case to Document Receive as an issue.
const SEND_BACK = {
  jeInspection: { key: "jeApproval", value: "Rejected", earlier: "Earlier JE rejection", placeholder: "Why the JE rejected the site inspection (required)", button: "Reject & send to Document Receive" },
  portalInspectionApproval: { key: "portalStatus", value: "Revert", earlier: "Earlier portal revert", placeholder: "Why the portal reverted the inspection (required)", button: "Revert & send to Document Receive" },
};

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
    // A JE rejection is shown above; the approval and remark start empty so the new result is recorded fresh.
    ...(SEND_BACK[stepKey] && previous?.[SEND_BACK[stepKey].key] === SEND_BACK[stepKey].value ? { [SEND_BACK[stepKey].key]: "", remark: "" } : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Dropdowns that read Settings > System Masters (e.g. Installer); a saved value that left the list stays selectable.
  const [masters, setMasters] = useState({});
  useEffect(() => {
    if (!config.fields.some((item) => item.master)) return;
    fetch("/api/masters").then((r) => (r.ok ? r.json() : {})).then(setMasters).catch(() => {});
  }, [config.fields]);
  const optionsOf = (item) => {
    if (!item.master) return item.options;
    const list = masters[item.master] ?? [];
    const current = form[item.key];
    return current && !list.includes(current) ? [...list, current] : list;
  };
  const visible = (item) => !item.hidden && (!item.showWhen || form[item.showWhen.key] === item.showWhen.value);
  const receipt = Boolean(config.receiptStatus); // Accounts Cash Receipt: Receipt Status replaces Status + Hold Reason Code
  const hold = receipt ? form.receiptStatus === RECEIPT_STATUS.BELOW : form.workStatus === "Not Done";
  const optionalFields = receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT; // cash details may stay empty
  // Rejected / reverted: the remark is mandatory and the case goes to Document Receive as an issue.
  const sendBack = SEND_BACK[stepKey];
  const jeRejected = Boolean(sendBack) && form[sendBack.key] === sendBack.value;
  const remarkRequired = hold || jeRejected || (receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT);
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
      {sendBack && previous?.[sendBack.key] === sendBack.value && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="font-semibold">{sendBack.earlier}{previous.jeVisitDate ? ` (${previous.jeVisitDate})` : ""}</div>
          <div className="mt-1">{previous.remark}</div>
          <div className="mt-1 text-xs">{row.issue?.fromStep === stepKey && !row.issue.open ? "The issue was fixed in Document Receive. Record the result again." : "Record the result again."}</div>
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
          {config.fields.filter(visible).map((item) => item.type === "files" ? (
            <div key={item.key} className="sm:col-span-2">
              <Label required={item.required && !optionalFields}>{item.label}</Label>
              <FileUpload files={form[item.key]} onChange={(files) => set(item.key, files)} max={item.max ?? 5} readOnly={readOnly || hold} />
              {item.autoFrom && form[item.key]?.length > 0 && <AutoHint>{item.autoFrom}</AutoHint>}
            </div>
          ) : item.type === "materials" ? (
            <div key={item.key} className="sm:col-span-2">
              <MaterialEditor value={form[item.key]} onChange={(text) => set(item.key, text)} readOnly={readOnly || hold} />
            </div>
          ) : item.type === "select" ? (
            <Select key={item.key} label={item.label} required={item.required && !optionalFields} value={form[item.key]} options={optionsOf(item)} onChange={(value) => set(item.key, value)} hint={form[item.key] ? item.autoFrom : ""} />
          ) : (
            <Field key={item.key} label={item.label} required={(item.required || Boolean(item.showWhen)) && !optionalFields} type={item.type} value={form[item.key]} onChange={(value) => set(item.key, value)} hint={form[item.key] !== "" ? item.autoFrom : ""} />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <Label required={remarkRequired}>Remark</Label>
        <textarea className="field !h-auto py-2.5" rows={3} disabled={readOnly} value={form.remark} onChange={(event) => set("remark", event.target.value)} placeholder={hold ? "Explain the hold and next action" : jeRejected ? sendBack?.placeholder : receipt && form.receiptStatus === RECEIPT_STATUS.WITHOUT ? "Who approved dispatch without cash or down payment, and when the payment is expected" : "Optional remark"} />
      </label>
      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={error} submitLabel={hold ? "Save on Hold" : jeRejected ? sendBack.button : "Complete Step"} />
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
  if (item.defaultCalculation === "materialList") return materialDefault(row);
  if (item.defaultRow && hasValue(row[item.defaultRow])) return row[item.defaultRow];
  if (item.defaultByState && hasValue(item.defaultByState[row.state])) return item.defaultByState[row.state];
  if (item.defaultCalculation === "priceMinusSubsidy") {
    return Math.max(0, Number(row.dealAmount || 0) - Number(row.quotationSubsidy || 0)) || "";
  }
  return item.type === "files" ? [] : "";
}

// The material list of a dispatch in one place: item and quantity per row, filled from the system and the
// survey report. Quantities (and items) can be corrected; it is saved as "Item — qty" lines.
const parseMaterials = (text) =>
  String(text ?? "").split("\n").filter((line) => line.trim()).map((line) => {
    const at = line.lastIndexOf(" — ");
    return at > 0 ? { item: line.slice(0, at), qty: line.slice(at + 3) } : { item: line, qty: "" };
  });
const joinMaterials = (rows) => rows.filter((row) => row.item.trim()).map((row) => (row.qty.trim() ? `${row.item.trim()} — ${row.qty.trim()}` : row.item.trim())).join("\n");

function MaterialEditor({ value, onChange, readOnly }) {
  const rows = parseMaterials(value);
  const update = (index, patch) => onChange(joinMaterials(rows.map((row, i) => (i === index ? { ...row, ...patch } : row))));
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Material list <span className="text-rose-500">*</span></div>
        <div className="text-[11px] text-slate-400">From the survey report. Change a quantity if needed.</div>
      </div>
      {/* Two items per row (item + its own quantity); a long note takes the whole row. */}
      <div className="grid grid-cols-2 gap-x-px bg-slate-100">
        {rows.map((row, index) => (
          <div key={index} className={`flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-1 ${row.item.length > 38 ? "col-span-2" : ""}`}>
            <input className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-slate-700 outline-none" disabled={readOnly} value={row.item} onChange={(event) => update(index, { item: event.target.value })} />
            <input className="w-20 shrink-0 rounded-md border border-slate-200 px-2 py-1 text-right text-[13px] font-semibold text-slate-800 outline-none focus:border-brand" disabled={readOnly} value={row.qty} onChange={(event) => update(index, { qty: event.target.value })} />
            {!readOnly && <button type="button" aria-label="Remove item" onClick={() => onChange(joinMaterials(rows.filter((_, i) => i !== index)))} className="text-slate-300 hover:text-rose-500">×</button>}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button type="button" onClick={() => onChange(`${joinMaterials(rows)}${rows.length ? "\n" : ""}New item — `)} className="w-full border-t border-slate-100 px-4 py-1.5 text-left text-xs font-semibold text-brand-dark hover:bg-slate-50">
          + Add item
        </button>
      )}
    </section>
  );
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
