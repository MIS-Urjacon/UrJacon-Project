"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";

export default function WarrantyForm({ row, readOnly, onSubmit, onCancel }) {
  const previous = row.steps?.warranty;
  const clearance = row.steps?.balanceClearance;
  const [form, setForm] = useState({
    balanceStatus: previous?.balanceStatus ?? (clearance?.status === "done" ? "Cleared" : ""),
    balanceDue: previous?.balanceDue ?? clearance?.balanceDue ?? "",
    balanceRecovered: previous?.balanceRecovered ?? clearance?.balanceRecovered ?? "",
    warrantyType: previous?.warrantyType ?? docData(row)?.systemType ?? "",
    tataWarrantyReference: previous?.tataWarrantyReference ?? "",
    panelWarrantyDcr: previous?.panelWarrantyDcr ?? "",
    inverterRegistration: previous?.inverterRegistration ?? "",
    warrantyDate: previous?.warrantyDate ?? "",
    handoverKitGiven: previous?.handoverKitGiven ?? "",
    remark: previous?.remark ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cleared = form.balanceStatus === "Cleared";

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
      <CaseDetails items={importantDetails(row, "warranty")} />

      <fieldset disabled={readOnly || clearance?.status === "done"}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Balance clearance
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Balance Status" required value={form.balanceStatus} options={["Cleared", "Pending"]} onChange={(value) => set("balanceStatus", value)} />
          <Field label="Balance Due Before Recovery (₹)" required type="number" value={form.balanceDue} onChange={(value) => set("balanceDue", value)} />
          <Field label="Amount Recovered (₹)" required type="number" value={form.balanceRecovered} onChange={(value) => set("balanceRecovered", value)} />
        </div>
      </fieldset>

      {!readOnly && form.balanceStatus === "Pending" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Balance pending: warranty and document handover are blocked. This case will stay in Pending.
        </div>
      )}

      <fieldset disabled={readOnly || !cleared}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Warranty processing
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Warranty Type" required={cleared} value={form.warrantyType} options={["Tata", "Non-Tata"]} onChange={(value) => set("warrantyType", value)} />
          <Field label="Warranty Date" required={cleared} type="date" value={form.warrantyDate} onChange={(value) => set("warrantyDate", value)} />

          {form.warrantyType === "Tata" && (
            <Field label="Tata Warranty Reference" required={cleared} value={form.tataWarrantyReference} onChange={(value) => set("tataWarrantyReference", value)} />
          )}
          {form.warrantyType === "Non-Tata" && (
            <>
              <Select label="Panel Warranty through DCR" required={cleared} value={form.panelWarrantyDcr} options={["Done", "Pending"]} onChange={(value) => set("panelWarrantyDcr", value)} />
              <Select label="Inverter Online Registration" required={cleared} value={form.inverterRegistration} options={["Done", "Pending"]} onChange={(value) => set("inverterRegistration", value)} />
            </>
          )}
          <Select label="Customer Handover Kit Given" required={cleared} value={form.handoverKitGiven} options={["Yes", "No"]} onChange={(value) => set("handoverKitGiven", value)} />
        </div>
        {docData(row)?.systemType && <p className="mt-2 text-xs font-medium text-brand-dark">Warranty Type auto-filled from Document Verification.</p>}
        <p className="mt-3 text-xs text-slate-500">
          Handover kit includes warranty documents, invoice and the consumer-vendor agreement.
        </p>
      </fieldset>

      <label className="block">
        <Label required={form.balanceStatus === "Pending"}>Remark</Label>
        <textarea
          rows={3}
          className="field !h-auto py-2.5"
          disabled={readOnly}
          placeholder={form.balanceStatus === "Pending" ? "Explain the pending balance" : "Optional closing remark"}
          value={form.remark}
          onChange={(event) => set("remark", event.target.value)}
        />
      </label>

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={error}
        submitLabel={form.balanceStatus === "Pending" ? "Save as Balance Pending" : "Complete Warranty"}
      />
    </form>
  );
}

function Field({ label, required, type = "text", value, onChange }) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      <input
        className="field"
        type={type}
        min={type === "number" ? 0 : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({ label, required, value, options, onChange }) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      <DropSelect className="field" required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </DropSelect>
    </label>
  );
}
