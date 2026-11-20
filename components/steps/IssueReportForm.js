"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { ISSUE_TYPES } from "@/lib/issues";
import { STAGE_LABEL } from "@/lib/workflow";

// Popup to report a problem on any step after Document Verification. `onSubmit(data)`
// returns an error string or null; the case then moves to Document Verification.
export default function IssueReportForm({ row, stepKey, count = 1, stageLabel, notice, onSubmit, onCancel }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!type) return setErr("Select the issue type");
    if (!description.trim()) return setErr("Describe the issue");
    setSaving(true);
    const msg = await onSubmit({ type, description, files });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <CaseSummary row={row} />
      {count > 1 && <div className="-mt-3 text-sm font-medium text-slate-600">This issue will be reported for all {count} selected {stageLabel ? "leads" : "cases"}.</div>}
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Reported from <b>{stageLabel ?? STAGE_LABEL[stepKey]}</b>.{" "}
        {notice ?? `The case will move to Document Receive with these details. After it is fixed and verified, it returns to ${STAGE_LABEL[stepKey]}.`}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <Label required>Issue Type</Label>
          <DropSelect className="field" required value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Select</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </DropSelect>
        </label>
        <label className="block sm:col-span-2">
          <Label required>Issue Details</Label>
          <textarea
            className="field min-h-24 resize-y"
            placeholder="Explain what is not working, e.g. customer login is not happening on PMSG portal..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <div>
        <Label>Screenshots / Documents (optional)</Label>
        <FileUpload files={files} onChange={setFiles} max={3} />
      </div>
      <FormActions onCancel={onCancel} saving={saving} error={err} submitLabel="Report issue" />
    </form>
  );
}
