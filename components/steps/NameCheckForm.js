"use client";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { CaseSummary, Pill } from "@/components/ui";
import { FormActions, Label } from "./shared";
import QuoteButton from "@/components/steps/QuoteButton";
import { NAME_DOCS, STAGE_LABEL, docData } from "@/lib/workflow";

// Document Verification: only verifies the documents that were received. The documents,
// names and Tata / Non-Tata choice are entered at Document Receive.
export default function NameCheckForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.nameCheck;
  const src = docData(row);
  const [verified, setVerified] = useState(() =>
    Object.fromEntries(NAME_DOCS.map(([k]) => [k, Boolean(prev?.verified?.[k])]))
  );
  const [remark, setRemark] = useState(prev?.remark ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const pending = NAME_DOCS.filter(([k]) => !verified[k]).map(([, label]) => label);
  const all = pending.length === 0;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!all && !remark.trim()) return setErr("Enter a remark for the documents not verified");
    setSaving(true);
    const msg = await onSubmit({ verified, remark });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <CaseSummary row={row} />
        </div>
        <QuoteButton row={row} />
      </div>

      {row.issue?.open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="font-semibold">Issue reported from {row.issue.fromLabel}: {row.issue.type}</div>
          <div className="mt-1">{row.issue.description}</div>
          <div className="mt-1 text-xs">Once verified, the case returns to {STAGE_LABEL[row.issue.fromStep]}.</div>
        </div>
      )}

      {src ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>Received through <b className="text-slate-800">{src.receivedThrough || "-"}</b></span>
          <span>Received on <b className="text-slate-800">{src.receivedDate || "-"}</b></span>
          <span>System <b className="text-slate-800">{src.systemType || "-"}</b></span>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">No received-document details are saved for this case. Verify the documents directly.</div>
      )}

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Verify documents</legend>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {NAME_DOCS.map(([k, label]) => {
            const d = src?.[k];
            const review = d?.reviewStatus ?? src?.documentReviews?.[k];
            return (
              <label key={k} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]"
                  checked={verified[k]}
                  onChange={(e) => setVerified({ ...verified, [k]: e.target.checked })}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{label}</div>
                  <div className="truncate text-xs text-slate-500">{d?.name ? `Name: ${d.name}` : "No details saved"}</div>
                </div>
                {review && <Pill color={review === "Proper" ? "green" : "amber"}>{review === "Proper" ? "Proper" : "Needs correction"}</Pill>}
                {d?.files?.[0] && (
                  <a
                    href={d.files[0].url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
                  >
                    <Paperclip size={13} /> View
                  </a>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {src?.terracePhotoFiles?.length > 0 && (
        <section>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Terrace geotag photo</div>
          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 p-3">
            {src.terracePhotoFiles.map((file) => (
              <a key={file.url} href={file.url} target="_blank" rel="noreferrer" title={file.name} className="group block w-40">
                <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {file.url.endsWith(".pdf") ? (
                    <Paperclip size={26} className="text-slate-400" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.name || "Terrace geotag photo"} className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </div>
                <div className="mt-1 truncate text-xs font-medium text-brand-dark group-hover:underline">{file.name || "View photo"}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <fieldset disabled={readOnly}>
        <label className="block">
          <Label required={!all}>Remark</Label>
          <input
            className="field"
            placeholder={all ? "Optional" : "Which documents are not verified and why"}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </fieldset>

      {!readOnly && (
        <div className={`rounded-lg px-4 py-3 text-sm ${all ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {all
            ? row.issue?.open
              ? `All documents verified. The issue will be resolved and the case returns to ${STAGE_LABEL[row.issue.fromStep]}.`
              : "All documents verified. This case will move to Login PMSG."
            : `Not verified: ${pending.join(", ")}. The case stays here on hold.`}
        </div>
      )}

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel={all ? (row.issue?.open ? "Verify & resolve issue" : "Verify & send to Login PMSG") : "Save verification pending (hold)"}
      />
    </form>
  );
}
