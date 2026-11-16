"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, Copy } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { NAME_DOCS, normName } from "@/lib/workflow";

export default function NameCheckForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.nameCheck;
  const [docs, setDocs] = useState(() =>
    Object.fromEntries(
      NAME_DOCS.map(([k]) => [k, { name: prev?.[k]?.name ?? "", files: prev?.[k]?.files ?? [] }])
    )
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const ref = normName(row.customerName);
  const state = (k) =>
    !docs[k].name.trim() ? "empty" : normName(docs[k].name) === ref ? "match" : "mismatch";
  const allMatch = NAME_DOCS.every(([k]) => state(k) === "match");
  const anyMismatch = NAME_DOCS.some(([k]) => state(k) === "mismatch");

  const set = (k, patch) => setDocs({ ...docs, [k]: { ...docs[k], ...patch } });

  // Put the customer's name in every document field (keeps uploaded files).
  const fillSameName = () =>
    setDocs(
      Object.fromEntries(
        NAME_DOCS.map(([k]) => [k, { ...docs[k], name: row.customerName }])
      )
    );

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const missing = NAME_DOCS.find(([k]) => state(k) === "empty");
    if (missing) return setErr(`Enter the name on the ${missing[1]}`);
    setSaving(true);
    const msg = await onSubmit(docs);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <CaseSummary row={row} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          The name on every document must match <b className="text-slate-800">{row.customerName}</b>.
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={fillSameName}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand px-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-50"
          >
            <Copy size={15} /> Fill same name in all
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {NAME_DOCS.map(([k, label]) => {
          const s = state(k);
          return (
            <div
              key={k}
              className={`rounded-xl border p-4 ${
                s === "match"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : s === "mismatch"
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{label}</span>
                {s === "match" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={14} /> Matches
                  </span>
                )}
                {s === "mismatch" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                    <XCircle size={14} /> Mismatch
                  </span>
                )}
              </div>
              <label className="block">
                <Label required>Name on document</Label>
                <input
                  className="field"
                  disabled={readOnly}
                  placeholder="Name as printed"
                  value={docs[k].name}
                  onChange={(e) => set(k, { name: e.target.value })}
                />
              </label>
              <div className="mt-3">
                <FileUpload
                  files={docs[k].files}
                  onChange={(files) => set(k, { files })}
                  max={1}
                  readOnly={readOnly}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            allMatch
              ? "bg-emerald-50 text-emerald-800"
              : anyMismatch
              ? "bg-amber-50 text-amber-800"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          {allMatch
            ? "All 4 documents match. This case will move to Login PMSG."
            : anyMismatch
            ? "Name mismatch found. Submitting will keep the case on hold until it is corrected."
            : "Enter the name shown on each document."}
        </div>
      )}

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel={anyMismatch ? "Save as mismatch (hold)" : "Submit & send to Login PMSG"}
      />
    </form>
  );
}
