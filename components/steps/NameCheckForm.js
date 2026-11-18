"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CheckCircle2, XCircle, Copy } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { NAME_DOCS, STAGE_LABEL, normName } from "@/lib/workflow";
import QuotationSummary from "@/components/leads/QuotationSummary";

export default function NameCheckForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.nameCheck;
  const [docs, setDocs] = useState(() =>
    Object.fromEntries(
      NAME_DOCS.map(([k]) => [k, {
        name: prev?.[k]?.name ?? "",
        files: prev?.[k]?.files ?? [],
        reviewStatus: prev?.[k]?.reviewStatus
          ?? prev?.documentReviews?.[k]
          ?? (prev?.[k] ? (prev[k].matched ? "Proper" : "Correction Required") : ""),
      }])
    )
  );
  const [systemType, setSystemType] = useState(prev?.systemType ?? "");
  const [correctionType, setCorrectionType] = useState(prev?.correctionType ?? "");
  const [correctionReason, setCorrectionReason] = useState(prev?.correctionReason ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const ref = normName(row.customerName);
  const state = (k) =>
    !docs[k].name.trim() ? "empty" : normName(docs[k].name) === ref ? "match" : "mismatch";
  const needsCorrection = (k) =>
    state(k) === "mismatch" || docs[k].reviewStatus === "Correction Required";
  const allProper = NAME_DOCS.every(
    ([k]) => state(k) === "match" && docs[k].reviewStatus === "Proper"
  );
  const anyCorrection = NAME_DOCS.some(([k]) => needsCorrection(k));
  const correctionDocuments = NAME_DOCS.filter(([k]) => needsCorrection(k)).map(([, label]) => label);

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
    const missingFile = NAME_DOCS.find(([k]) => docs[k].files.length === 0);
    if (missingFile) return setErr(`Upload the received ${missingFile[1]}`);
    const unreviewed = NAME_DOCS.find(([k]) => !docs[k].reviewStatus);
    if (unreviewed) return setErr(`Mark the ${unreviewed[1]} as proper or correction required`);
    if (!systemType) return setErr("Select Tata or Non-Tata system type");
    if (anyCorrection && !correctionType) return setErr("Select the required correction type");
    if (anyCorrection && !correctionReason.trim()) return setErr("Enter the correction reason");
    setSaving(true);
    const msg = await onSubmit({
      ...docs,
      systemType,
      correctionType: anyCorrection ? correctionType : "",
      correctionReason: anyCorrection ? correctionReason : "",
    });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <CaseSummary row={row} />
      {row.issue?.open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="font-semibold">Issue reported from {row.issue.fromLabel}: {row.issue.type}</div>
          <div className="mt-1">{row.issue.description}</div>
          <div className="mt-1 text-xs text-rose-600">By {row.issue.reportedBy} · {new Date(row.issue.reportedAt).toLocaleString("en-IN")}</div>
          {row.issue.files?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-3 text-xs">
              {row.issue.files.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="font-semibold underline">{f.name}</a>
              ))}
            </div>
          )}
          <div className="mt-1 text-xs">Resolve it here; the case then returns to {STAGE_LABEL[row.issue.fromStep]}.</div>
        </div>
      )}
      <QuotationSummary quotation={row} title="Quotation Received from Lead Management" />
      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Verification details
        </legend>
        <label className="block max-w-sm">
          <Label required>System Type</Label>
          <DropSelect className="field" value={systemType} onChange={(event) => setSystemType(event.target.value)}>
            <option value="">Select</option>
            <option value="Tata">Tata</option>
            <option value="Non-Tata">Non-Tata</option>
          </DropSelect>
        </label>
        <p className="mt-2 text-xs text-slate-500">
          The reference process requires the system to be marked Tata or Non-Tata during document verification.
        </p>
      </fieldset>
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

      {anyCorrection && (
        <fieldset disabled={readOnly} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Correction required
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label required>Correction Type</Label>
              <DropSelect className="field" value={correctionType} onChange={(event) => setCorrectionType(event.target.value)}>
                <option value="">Select</option>
                <option value="Document Correction">Document Correction</option>
                <option value="Name Correction">Name Correction</option>
                <option value="Owner Change">Owner Change</option>
                <option value="New PAN">New PAN</option>
              </DropSelect>
            </label>
            <label>
              <Label required>Correction Reason</Label>
              <input className="field" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
            </label>
          </div>
          <p className="mt-3 text-xs text-amber-700">
            Correction needed in: <b>{correctionDocuments.join(", ")}</b>. The case stays here until
            corrected documents are received and every document is marked proper.
          </p>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {NAME_DOCS.map(([k, label]) => {
          const s = state(k);
          const correction = needsCorrection(k);
          return (
            <div
              key={k}
              className={`rounded-xl border p-4 ${
                s === "match" && docs[k].reviewStatus === "Proper"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : correction
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{label}</span>
                {s === "match" && docs[k].reviewStatus === "Proper" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={14} /> Proper
                  </span>
                )}
                {correction && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                    <XCircle size={14} /> Correction required
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
              <fieldset disabled={readOnly} className="mt-3">
                <Label required>Document Check</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Proper", "Correction Required"].map((value) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                        docs[k].reviewStatus === value
                          ? value === "Proper"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${k}-review-status`}
                        value={value}
                        checked={docs[k].reviewStatus === value}
                        onChange={() => set(k, { reviewStatus: value })}
                        className="accent-[var(--color-brand)]"
                      />
                      {value === "Proper" ? "Proper" : "Needs correction"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            allProper
              ? "bg-emerald-50 text-emerald-800"
              : anyCorrection
              ? "bg-amber-50 text-amber-800"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          {allProper
            ? row.issue?.open
              ? `All 4 documents are proper. The issue will be resolved and the case returns to ${STAGE_LABEL[row.issue.fromStep]}.`
              : "All 4 documents are proper. This case will move to Login PMSG."
            : anyCorrection
            ? `Correction required for ${correctionDocuments.join(", ")}. Record the details; the case will remain here.`
            : "Upload each received document, enter its printed name, and complete the document check."}
        </div>
      )}

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel={allProper ? (row.issue?.open ? "Resolve issue & return" : "Submit & send to Login PMSG") : "Save correction required (hold)"}
      />
    </form>
  );
}
