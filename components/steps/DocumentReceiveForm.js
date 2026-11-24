"use client";
import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { CheckCircle2, XCircle, Copy, ChevronDown } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { NAME_DOCS, STAGE_LABEL, normName } from "@/lib/workflow";
import QuoteButton from "@/components/steps/QuoteButton";
import DocumentPricing from "@/components/steps/DocumentPricing";

export default function DocumentReceiveForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.documentReceive;
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
  const [receivedThrough, setReceivedThrough] = useState(prev?.receivedThrough ?? "");
  // Cash / Loan chosen here is picked up by Payment Work Start (which keeps its own field).
  const [paymentMode, setPaymentMode] = useState(prev?.paymentMode ?? row.preferredPaymentMode ?? "");
  const [terracePhoto, setTerracePhoto] = useState(prev?.terracePhotoFiles ?? []);
  // The case price comes from the price list here (not from a quotation).
  const [pricing, setPricing] = useState(() => ({
    kw: prev?.pricing?.kw ?? row.kwWanted ?? "",
    price: prev?.pricing?.price ?? (Number(row.dealAmount) || ""),
    centralSubsidy: prev?.pricing?.centralSubsidy ?? "",
    stateSubsidy: prev?.pricing?.stateSubsidy ?? "",
    productCode: prev?.pricing?.productCode ?? row.productCode ?? "",
    gridType: prev?.pricing?.gridType ?? (row.productInterested === "Hybrid" ? "Hybrid" : "On-grid"),
    dcrType: prev?.pricing?.dcrType ?? "DCR",
    panelBrand: prev?.pricing?.panelBrand ?? row.brand ?? "",
  }));
  // Pricing and the other details filled at Lead / Quotation (older cases are read from their lead).
  const [lead, setLead] = useState(null);
  useEffect(() => {
    if (!row.leadId) return;
    fetch("/api/leads").then((r) => (r.ok ? r.json() : [])).then((list) => setLead(list.find((l) => l.id === row.leadId) ?? null)).catch(() => {});
  }, [row.leadId]);
  const pick = (key) => row[key] || lead?.[key];
  // Already filled on the Lead page: not asked again here.
  const known = {
    kw: Number(pick("kwWanted")) > 0 ? pick("kwWanted") : "",
    productCode: pick("productCode") || "",
    panelBrand: pick("brand") || "",
    gridType: pick("productInterested") === "Hybrid" ? "Hybrid" : pick("productInterested") === "On-grid" ? "On-grid" : "",
  };
  const [receivedDate, setReceivedDate] = useState(prev?.receivedDate ?? new Date().toISOString().slice(0, 10));

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
    if (!receivedThrough) return setErr("Select how the documents were received");
    if (!receivedDate) return setErr("Select the received date");
    if (!systemType) return setErr("Select Tata or Non-Tata system type");
    if (!(Number(pricing.kw || known.kw) > 0)) return setErr("Enter the system size in kW");
    if (!(Number(pricing.price) > 0)) return setErr("Enter the system price");
    if (anyCorrection && !correctionType) return setErr("Select the required correction type");
    if (anyCorrection && !correctionReason.trim()) return setErr("Enter the correction reason");
    setSaving(true);
    const msg = await onSubmit({
      ...docs,
      receivedThrough,
      receivedDate,
      systemType,
      paymentMode,
      terracePhotoFiles: terracePhoto,
      pricing: { ...pricing, kw: pricing.kw || known.kw, productCode: pricing.productCode || known.productCode, panelBrand: pricing.panelBrand || known.panelBrand, gridType: known.gridType || pricing.gridType },
      correctionType: anyCorrection ? correctionType : "",
      correctionReason: anyCorrection ? correctionReason : "",
    });
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
          <div className="mt-1 text-xs text-rose-600">By {row.issue.reportedBy} · {new Date(row.issue.reportedAt).toLocaleString("en-IN")}</div>
          {row.issue.files?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-3 text-xs">
              {row.issue.files.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="font-semibold underline">{f.name}</a>
              ))}
            </div>
          )}
          <div className="mt-1 text-xs">Fix it here; the case then goes to Document Verification and returns to {STAGE_LABEL[row.issue.fromStep]} once verified.</div>
        </div>
      )}
      <LeadDetails row={row} pick={pick} />
      <DocumentPricing value={pricing} onChange={setPricing} known={known} readOnly={readOnly} />

      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <Label required>Received Through</Label>
          <DropSelect className="field" value={receivedThrough} onChange={(e) => setReceivedThrough(e.target.value)}>
            <option value="">Select</option>
            {["WhatsApp", "Email", "Physical / Courier", "Field visit"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </DropSelect>
        </label>
        <label className="block">
          <Label required>Received Date</Label>
          <input className="field" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
        </label>
        <label className="block">
          <Label required>System Type</Label>
          <DropSelect className="field" value={systemType} onChange={(event) => setSystemType(event.target.value)}>
            <option value="">Select</option>
            <option value="Tata">Tata</option>
            <option value="Non-Tata">Non-Tata</option>
          </DropSelect>
        </label>
        <label className="block">
          <Label>Payment Mode (Cash / Loan)</Label>
          <DropSelect className="field" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
            <option value="">Select</option>
            {(row.state === "Odisha" ? ["Cash", "Loan", "Subsidy Cheque"] : ["Cash", "Loan"]).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </DropSelect>
        </label>
      </fieldset>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Documents</div>
            <p className="mt-1 text-sm text-slate-500">
              The name on every document must match <b className="text-slate-800">{row.customerName}</b>.
            </p>
          </div>
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

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_230px] gap-4 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
            <span>Document</span>
            <span>Name on document <span className="text-rose-500">*</span></span>
            <span>File <span className="text-rose-500">*</span></span>
            <span>Check <span className="text-rose-500">*</span></span>
          </div>
          {NAME_DOCS.map(([k, label]) => {
            const s = state(k);
            const proper = s === "match" && docs[k].reviewStatus === "Proper";
            const correction = needsCorrection(k);
            return (
              <div
                key={k}
                className="grid items-center gap-3 border-t border-slate-100 px-4 py-3 lg:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_230px] lg:gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      proper ? "bg-emerald-50 text-emerald-600" : correction ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {correction ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{label}</div>
                    <div className={`text-[11px] font-medium ${proper ? "text-emerald-600" : correction ? "text-rose-600" : "text-slate-400"}`}>
                      {proper ? "Proper" : correction ? (s === "mismatch" ? "Name does not match" : "Correction required") : "Pending"}
                    </div>
                  </div>
                </div>
                <input
                  className={`field ${s === "mismatch" ? "border-rose-300" : ""}`}
                  disabled={readOnly}
                  placeholder="Name as printed"
                  aria-label={`Name on ${label}`}
                  value={docs[k].name}
                  onChange={(e) => set(k, { name: e.target.value })}
                />
                <FileUpload files={docs[k].files} onChange={(files) => set(k, { files })} max={1} readOnly={readOnly} compact />
                <fieldset disabled={readOnly} className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-semibold">
                  {["Proper", "Correction Required"].map((value) => (
                    <label
                      key={value}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 transition first:border-r first:border-slate-200 ${
                        docs[k].reviewStatus === value
                          ? value === "Proper"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${k}-review-status`}
                        value={value}
                        checked={docs[k].reviewStatus === value}
                        onChange={() => set(k, { reviewStatus: value })}
                        className="sr-only"
                      />
                      {value === "Proper" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {value === "Proper" ? "Proper" : "Needs correction"}
                    </label>
                  ))}
                </fieldset>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Terrace geotag photo (optional)</div>
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <FileUpload files={terracePhoto} onChange={setTerracePhoto} max={1} readOnly={readOnly} compact />
        </div>
      </section>

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
            ? "All 4 documents are proper. This case will move to Document Verification."
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
        submitLabel={allProper ? "Submit & send to Document Verification" : "Save correction required (hold)"}
      />
    </form>
  );
}

const money = (value) => (Number(value) > 0 ? `₹${Number(value).toLocaleString("en-IN")}` : "");

// The details filled at Lead, shown for reference. The price is set below.
function LeadDetails({ row, pick }) {
  const kw = pick("kwWanted");
  const items = [
    ["Requirement", kw ? `${kw} kW` : ""],
    ["Brand", pick("brand") || pick("quotationPanelBrand")],
    ["Product Interested", pick("productInterested")],
    ["Pricing", pick("pricing")],
    ["Payment Mode (lead)", pick("paymentMode") || pick("preferredPaymentMode")],
    ["Lead Source", pick("leadSource") ?? pick("source")],
    ["Dealer", pick("dealer")],
    ["Liaisoning", pick("liaisoning")],
    ["Branch / Route", [pick("branch"), pick("route")].filter(Boolean).join(" / ")],
    ["Mobile", pick("mobile")],
    ["Email", pick("email")],
    ["State", pick("state")],
    ["Remark", pick("remark")],
  ];
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50/60" open>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Lead details
        <ChevronDown size={15} className="transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-x-6 gap-y-3 border-t border-slate-200 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={value}>{value}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
