"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { HOLD_REASONS } from "@/lib/processConfig";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";

export default function LoginForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.login;
  const [loginCheck, setLoginCheck] = useState(prev?.loginCheck ?? "");
  const [remark, setRemark] = useState(prev?.remark ?? "");
  const [applicationNo, setApplicationNo] = useState(prev?.applicationNo ?? "");
  const [holdCode, setHoldCode] = useState(prev?.holdCode ?? "");
  const [retryDate, setRetryDate] = useState(prev?.retryDate ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!loginCheck) return setErr("Select the Login Check in PMSG result");
    if (loginCheck === "Login Done" && !applicationNo.trim()) return setErr("Enter the PMSG Application No.");
    if (loginCheck === "Login Hold" && !holdCode) return setErr("Select the hold reason");
    setSaving(true);
    const msg = await onSubmit({ loginCheck, applicationNo, holdCode, retryDate, remark });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <CaseSummary row={row} />
      <CaseDetails items={importantDetails(row, "login")} />
      {prev?.status === "hold" && !readOnly && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Previously put on hold: {prev.remark}
        </div>
      )}
      <label className="block">
        <Label required>Login Check in PMSG</Label>
        <DropSelect
          className="field"
          disabled={readOnly}
          value={loginCheck}
          onChange={(e) => setLoginCheck(e.target.value)}
        >
          <option value="">Select result</option>
          <option>Login Done</option>
          <option>Login Hold</option>
        </DropSelect>
      </label>
      {loginCheck === "Login Done" && <label className="block"><Label required>PMSG Application No.</Label><input className="field" disabled={readOnly} value={applicationNo} onChange={(event) => setApplicationNo(event.target.value)} /></label>}
      {loginCheck === "Login Hold" && (
        <div className="space-y-4">
          <label className="block">
            <Label required>Hold Reason</Label>
            <DropSelect className="field" disabled={readOnly} value={holdCode} onChange={(event) => setHoldCode(event.target.value)}>
              <option value="">Select</option>
              {["H02", "H03"].map((code) => <option key={code} value={code}>{`${code} · ${HOLD_REASONS[code]}`}</option>)}
            </DropSelect>
          </label>
          <label className="block sm:max-w-xs">
            <Label>Retry Date</Label>
            <input type="date" className="field" disabled={readOnly} value={retryDate} onChange={(event) => setRetryDate(event.target.value)} />
          </label>
          {!readOnly && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">On Login Hold the case goes back to Document Receive with this reason. After the documents are corrected and verified it returns to Login PMSG.</div>}
        </div>
      )}
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
        submitLabel={loginCheck === "Login Hold" ? "Send back to Document Receive" : "Submit & send to Payment Work Start"}
      />
    </form>
  );
}
