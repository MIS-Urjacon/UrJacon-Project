"use client";
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";

export default function LoginForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.login;
  const [loginCheck, setLoginCheck] = useState(prev?.loginCheck ?? "");
  const [images, setImages] = useState(prev?.images ?? []);
  const [remark, setRemark] = useState(prev?.remark ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!loginCheck) return setErr("Select the Login Check in PMSG result");
    setSaving(true);
    const msg = await onSubmit({ loginCheck, images, remark });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <CaseSummary row={row} />
      {prev?.status === "hold" && !readOnly && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Previously put on hold: {prev.remark}
        </div>
      )}
      <label className="block">
        <Label required>Login Check in PMSG</Label>
        <select
          className="field"
          disabled={readOnly}
          value={loginCheck}
          onChange={(e) => setLoginCheck(e.target.value)}
        >
          <option value="">Select result</option>
          <option>Login Done</option>
          <option>Login Hold</option>
        </select>
      </label>
      <div>
        <Label>Image upload</Label>
        <FileUpload files={images} onChange={setImages} max={5} readOnly={readOnly} />
      </div>
      <label className="block">
        <Label required={loginCheck === "Login Hold"}>Remark</Label>
        <textarea
          rows={3}
          className="field !h-auto py-2.5"
          disabled={readOnly}
          placeholder="Add a remark (required if login is on hold)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </label>
      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel={loginCheck === "Login Hold" ? "Save as hold" : "Submit & send to Site Survey"}
      />
    </form>
  );
}
