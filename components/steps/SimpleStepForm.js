"use client";
import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import CaseDetails from "@/components/steps/CaseDetails";
import { importantDetails } from "@/lib/caseDetails";
import SendPaymentDetails from "@/components/steps/SendPaymentDetails";
import { FormActions, Label } from "./shared";

// Popup for the loan steps: Status (Done / Not Done), an optional amount for
// the "receive" steps, and a remark. Build one form per step with makeSimpleForm.
export function makeSimpleForm({ stepKey, withAmount = false, extra = [], remarkLabel = "Remark", statuses = ["Done", "Not Done"], noRemark = false, amountLabel = "Amount Received (₹)" }) {
  return function SimpleStepForm({ row, readOnly, onSubmit, onCancel }) {
    const prev = row.steps?.[stepKey];
    const [f, setF] = useState({
      workStatus: "Done", // no Status field: submitting completes the step
      amount: prev?.amount ?? "",
      remark: prev?.remark ?? "",
      ...Object.fromEntries(extra.map((x) => [x.key, prev?.[x.key] ?? (x.type === "files" ? [] : x.fromRow ? row[x.fromRow] ?? "" : x.today ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "")])),
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const notDone = f.workStatus === "Not Done";
    // Dropdown values that come from Settings > System Masters (e.g. Responsible Person).
    const [masters, setMasters] = useState({});
    useEffect(() => {
      if (!extra.some((x) => x.master)) return;
      fetch("/api/masters").then((r) => (r.ok ? r.json() : {})).then(setMasters).catch(() => {});
    }, []);
    // Dropdown of employees (e.g. Approver).
    const [staff, setStaff] = useState([]);
    useEffect(() => {
      if (!extra.some((x) => x.staff)) return;
      fetch("/api/staff").then((r) => (r.ok ? r.json() : [])).then((list) => setStaff(list.map((person) => person.name))).catch(() => {});
    }, []);
    const staffOptions = (current) => (current && !staff.includes(current) ? [...staff, current] : staff);
    const masterOptions = (key, current) => {
      const list = masters[key] ?? [];
      return current && !list.includes(current) ? [...list, current] : list;
    };

    async function submit(e) {
      e.preventDefault();
      setErr("");
      const missingFile = extra.find((x) => x.type === "files" && x.required && f[x.key].length === 0);
      if (missingFile) return setErr(`Upload ${missingFile.label}`);
      setSaving(true);
      const msg = await onSubmit(f);
      setSaving(false);
      if (msg) setErr(msg);
    }

    return (
      <form onSubmit={submit} className="space-y-6">
        <CaseSummary row={row} />
        <CaseDetails items={importantDetails(row, stepKey)} />
        {stepKey === "cashAskPayment" && <SendPaymentDetails row={row} readOnly={readOnly} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {withAmount && (
            <label className="block">
              <Label required={!notDone}>{amountLabel}</Label>
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
          {extra.filter((x) => x.type === "files").map((x) => (
            <div key={x.key} className="sm:col-span-2">
              <Label required={x.required}>{x.label}</Label>
              <FileUpload files={f[x.key]} onChange={(files) => setF({ ...f, [x.key]: files })} max={x.max ?? 3} readOnly={readOnly} />
            </div>
          ))}
          {extra.filter((x) => x.type !== "files").map((x) => (
            <label key={x.key} className="block">
              <Label required={!notDone}>
                {x.label}
                {x.currency ? " (₹)" : ""}
              </Label>
              {x.type === "select" ? (
                <DropSelect
                  className="field"
                  disabled={readOnly}
                  value={f[x.key]}
                  onChange={(e) => setF({ ...f, [x.key]: e.target.value })}
                >
                  <option value="">Select</option>
                  {(x.master ? masterOptions(x.master, f[x.key]) : x.staff ? staffOptions(f[x.key]) : x.options).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </DropSelect>
              ) : (
                <input
                  className="field"
                  type={x.type === "number" ? "number" : x.type === "date" ? "date" : "text"}
                  min={x.type === "number" ? 0 : undefined}
                  disabled={readOnly}
                  placeholder={x.type === "date" ? undefined : x.label}
                  value={f[x.key]}
                  onChange={(e) => setF({ ...f, [x.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          {!noRemark && (
          <label className="block sm:col-span-2">
            <Label>{remarkLabel}</Label>
            <textarea
              rows={3}
              className="field !h-auto py-2.5"
              disabled={readOnly}
              placeholder="Add a remark (optional)"
              value={f.remark}
              onChange={(e) => setF({ ...f, remark: e.target.value })}
            />
          </label>
          )}
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
