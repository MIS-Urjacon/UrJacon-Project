"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";

export default function SiteSurveyForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.siteSurvey;
  const [f, setF] = useState({
    customerName: prev?.customerName ?? row.customerName ?? "",
    contactNumber: prev?.contactNumber ?? row.mobile ?? "",
    village: prev?.village ?? row.village ?? "",
    surveyDate: prev?.surveyDate ?? "",
    surveyorName: prev?.surveyorName ?? "",
    smartMeterPresent: prev?.smartMeterPresent ?? "",
    materialNeeded: prev?.materialNeeded ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const set = (k, v) => setF({ ...f, [k]: v });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const msg = await onSubmit(f);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <CaseSummary row={row} />

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Customer details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>Customer Name</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              placeholder="Customer Name"
              value={f.customerName}
              onChange={(e) => set("customerName", e.target.value)}
            />
          </label>
          <label className="block"><Label required>Smart Meter Present?</Label><DropSelect className="field" required disabled={readOnly} value={f.smartMeterPresent} onChange={(e) => set("smartMeterPresent", e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></DropSelect></label>
          <label className="block sm:col-span-2"><Label required>Material Needed / Survey Report</Label><textarea rows={3} className="field !h-auto py-2.5" required disabled={readOnly} value={f.materialNeeded} onChange={(e) => set("materialNeeded", e.target.value)} /></label>
          <label className="block">
            <Label required>Contact Number</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              inputMode="numeric"
              maxLength={10}
              pattern="\d{10}"
              title="10 digit mobile number"
              placeholder="10 digit mobile number"
              value={f.contactNumber}
              onChange={(e) => set("contactNumber", e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="block sm:col-span-2">
            <Label required>Village (address)</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              placeholder="Village / address"
              value={f.village}
              onChange={(e) => set("village", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Survey details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>Survey Date</Label>
            <input
              type="date"
              className="field"
              required
              max={today}
              disabled={readOnly}
              value={f.surveyDate}
              onChange={(e) => set("surveyDate", e.target.value)}
            />
          </label>
          <label className="block">
            <Label required>Surveyor Name</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              placeholder="Surveyor Name"
              value={f.surveyorName}
              onChange={(e) => set("surveyorName", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

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
