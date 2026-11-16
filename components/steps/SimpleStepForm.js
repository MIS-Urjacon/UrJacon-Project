"use client";
import { useState } from "react";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";

// Popup for the loan steps: Status (Done / Not Done), an optional amount for
// the "receive" steps, and a remark. Build one form per step with makeSimpleForm.
export function makeSimpleForm({ stepKey, withAmount = false, extra = [], remarkLabel = "Remark" }) {
  return function SimpleStepForm({ row, readOnly, onSubmit, onCancel }) {
    const prev = row.steps?.[stepKey];
    const [f, setF] = useState({
      workStatus: prev?.workStatus ?? "",
      amount: prev?.amount ?? "",
      remark: prev?.remark ?? "",
      ...Object.fromEntries(extra.map((x) => [x.key, prev?.[x.key] ?? ""])),
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const notDone = f.workStatus === "Not Done";

    async function submit(e) {
      e.preventDefault();
      setErr("");
      setSaving(true);
      const msg = await onSubmit(f);
      setSaving(false);
      if (msg) setErr(msg);
    }

    return (
      <form onSubmit={submit} className="space-y-6">
        <CaseSummary row={row} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>Status</Label>
            <select
              className="field"
              required
              disabled={readOnly}
              value={f.workStatus}
              onChange={(e) => setF({ ...f, workStatus: e.target.value })}
            >
              <option value="">Select</option>
              <option>Done</option>
              <option>Not Done</option>
            </select>
          </label>
          {withAmount && (
            <label className="block">
              <Label required={!notDone}>Amount Received (₹)</Label>
              <input
                className="field"
                type="number"
                min={0}
                disabled={readOnly}
                placeholder="Amount"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
              />
            </label>
          )}
          {extra.map((x) => (
            <label key={x.key} className="block">
              <Label required={!notDone}>
                {x.label}
                {x.currency ? " (₹)" : ""}
              </Label>
              {x.type === "select" ? (
                <select
                  className="field"
                  disabled={readOnly}
                  value={f[x.key]}
                  onChange={(e) => setF({ ...f, [x.key]: e.target.value })}
                >
                  <option value="">Select</option>
                  {x.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="field"
                  type={x.type === "number" ? "number" : "text"}
                  min={x.type === "number" ? 0 : undefined}
                  disabled={readOnly}
                  placeholder={x.label}
                  value={f[x.key]}
                  onChange={(e) => setF({ ...f, [x.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <label className="block sm:col-span-2">
            <Label required={notDone}>{remarkLabel}</Label>
            <textarea
              rows={3}
              className="field !h-auto py-2.5"
              disabled={readOnly}
              placeholder="Add a remark (required if Status is Not Done)"
              value={f.remark}
              onChange={(e) => setF({ ...f, remark: e.target.value })}
            />
          </label>
        </div>
        {!readOnly && notDone && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Status is Not Done. The case will stay in Pending until it is marked Done.
          </div>
        )}
        <FormActions
          readOnly={readOnly}
          onCancel={onCancel}
          saving={saving}
          error={err}
          submitLabel={notDone ? "Save as Not Done" : "Submit"}
        />
      </form>
    );
  };
}
