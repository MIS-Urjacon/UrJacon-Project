"use client";
import { useRef, useState } from "react";
import { UploadCloud, X, FileText, Loader2 } from "lucide-react";

// Uploads to /api/upload and keeps a list of { url, name }.
export default function FileUpload({ files = [], onChange, max = 1, readOnly = false, compact = false, folder = "Others" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e) {
    const list = [...e.target.files].slice(0, max - files.length);
    e.target.value = "";
    if (!list.length) return;
    setErr("");
    setBusy(true);
    const added = [];
    for (const f of list) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error);
        break;
      }
      added.push(j);
    }
    setBusy(false);
    if (added.length) onChange([...files, ...added]);
  }

  if (readOnly && files.length === 0) {
    return <div className="text-sm text-slate-400">No file uploaded</div>;
  }

  // One-line version for table-style forms: a small file chip, or an Upload button.
  if (compact) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <span key={f.url} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2">
              <a href={f.url} target="_blank" rel="noreferrer" title={f.name} className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50">
                {f.url.endsWith(".pdf") ? (
                  <FileText size={16} className="text-slate-400" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                )}
              </a>
              <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-xs font-medium text-slate-600 hover:text-brand-dark">{f.name || "View file"}</a>
              {!readOnly && (
                <button type="button" aria-label="Remove file" onClick={() => onChange(files.filter((_, j) => j !== i))} className="shrink-0 text-slate-400 hover:text-rose-600">
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
          {!readOnly && files.length < max && (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={busy}
              title="JPG, PNG, WEBP, GIF or PDF, max 5 MB"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 text-sm text-slate-500 transition hover:border-brand hover:bg-brand-50 hover:text-brand-dark disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {busy ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
        <input ref={ref} type="file" hidden multiple={max > 1} accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={pick} />
        {err && <div className="mt-1 text-xs font-medium text-rose-600">{err}</div>}
      </div>
    );
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {files.map((f, i) => (
            <div key={f.url} className="group relative">
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                title={f.name}
                className="flex h-20 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {f.url.endsWith(".pdf") ? (
                  <FileText size={28} className="text-slate-400" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                )}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white opacity-0 shadow transition group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!readOnly && files.length < max && (
        <>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 py-4 text-sm text-slate-500 transition hover:border-brand hover:bg-brand-50 hover:text-brand-dark disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            {busy ? "Uploading..." : max > 1 ? `Click to upload images (up to ${max})` : "Click to upload image or PDF"}
          </button>
          <input
            ref={ref}
            type="file"
            hidden
            multiple={max > 1}
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={pick}
          />
          <div className="mt-1.5 text-xs text-slate-400">JPG, PNG, WEBP, GIF or PDF, max 5 MB each</div>
        </>
      )}
      {err && <div className="mt-2 text-sm font-medium text-rose-600">{err}</div>}
    </div>
  );
}
