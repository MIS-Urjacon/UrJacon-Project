"use client";

import { useEffect, useState } from "react";
import { MessageCircle, PencilLine, Save } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import QuotationSummary from "@/components/leads/QuotationSummary";
import FileUpload from "@/components/FileUpload";

const DOCS = [
  ["aadhaar", "Aadhaar Card"], ["pan", "PAN Card"], ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill"], ["terracePhoto", "Terrace Geotag Photo"],
];
const RESPONSES = [["callback", "Call Back Later"], ["documents", "Document Given"], ["notInterested", "Not Interested"]];

export default function QuotationForm({ row, onComplete, onRefresh, onCancel, readOnly = false }) {
  const [form, setForm] = useState(() => ({
    quotationRevision: 0,
    quotationValidityDays: 15,
    quotationNotes: "Supply and installation of rooftop solar system as per approved site survey and technical specification.",
    quotationTerms: "Final scope is subject to site feasibility.\nSubsidy is subject to prevailing government rules and portal approval.\nTaxes, payment milestones and delivery schedule will be as mutually agreed.",
    ...row,
    documents: { ...(row.documents ?? {}) },
  }));
  const [sent, setSent] = useState(row.quotationStatus === "sent");
  const [decision, setDecision] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState(row.nextFollowUp ?? "");
  const [reason, setReason] = useState("");
  const [masters, setMasters] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    fetch("/api/masters").then((response) => response.ok ? response.json() : {}).then(setMasters).catch(() => {});
  }, []);

  function validateForSend() {
    if (!form.quotationReference?.trim()) return "Enter the quotation reference";
    if (!form.quotationEntity) return "Select Urjacon or Tuskin quotation entity";
    if (!form.quotationSystemType?.trim()) return "Enter the quotation system type";
    if (!form.quotationDcrType) return "Select DCR or NDCR";
    if (!form.quotationGridType) return "Select On-grid or Hybrid";
    if (!(Number(form.kwWanted) > 0)) return "Enter the system size in kW";
    if (!(Number(form.dealAmount) > 0)) return "Enter the quotation price";
    return null;
  }

  async function startRevision() {
    setError("");
    if (!revisionReason.trim()) return setError("Enter what needs to change in this revision");
    setSaving(true);
    const response = await fetch(`/api/leads/${row.id}/revise-quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: revisionReason }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error ?? "Could not start the quotation revision");
    setForm(result);
    setSent(false);
    setShowRevision(false);
    setRevisionReason("");
    setNotice(`Revision R${result.quotationRevision} started. Update the fields and send the revised quotation.`);
    onRefresh?.();
  }

  async function saveQuotation(mode) {
    setError("");
    setNotice("");
    const validation = mode === "send" ? validateForSend() : null;
    if (validation) return setError(validation);
    setSaving(true);
    const now = new Date().toISOString();
    const update = await fetch(`/api/leads/${row.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        action: "save",
        leadStage: "quotation",
        quotationStatus: "draft",
        quotationCreatedAt: form.quotationCreatedAt || now,
        outcome: "Quotation created",
      }),
    });
    const updated = await update.json();
    if (!update.ok) { setSaving(false); return setError(updated.error ?? "Could not save the quotation"); }
    if (mode === "draft") {
      setSaving(false);
      setForm(updated);
      setNotice(`Quotation draft saved for ${row.id}.`);
      onRefresh?.();
      return;
    }

    const send = await fetch(`/api/leads/${row.id}/send-quotation`, { method: "POST" });
    const result = await send.json();
    setSaving(false);
    if (!send.ok) return setError(result.error ?? "Could not mark the quotation as sent");
    setForm(result.lead);
    setSent(true);
    setError("");
    setNotice(`Quotation ${result.lead.quotationReference} has been marked as sent.`);
    onRefresh?.();
  }

  async function submitResponse(event) {
    event.preventDefault();
    setError("");
    if (!sent) return setError("Send the quotation before recording the customer response");
    if (!decision) return setError("Select the customer response after quotation");
    if (decision === "callback" && !nextFollowUp) return setError("Choose the callback date and time");
    if (decision === "notInterested" && !reason.trim()) return setError("Enter why the customer is not interested");
    if (decision === "documents") {
      if (!form.bpScNumber?.trim()) return setError("BP SC Number is required for Document Verification");
      if (!form.state) return setError("Select Chhattisgarh or Odisha before handover");
      if (!form.email?.trim()) return setError("Email ID is required in the handover packet");
      if (!form.productCode?.trim()) return setError("Product Code is required in the handover packet");
      if (!(Number(form.kwWanted) > 0)) return setError("System size in kW is required in the handover packet");
      if (!form.paymentMode) return setError("Select the expected payment mode");
      if (form.source === "Agent" && !(Number(form.commission) > 0)) return setError("Agent Commission is required for an agent case");
      const missing = DOCS.find(([key]) => !form.documents?.[key]);
      if (missing) return setError(`${missing[1]} is required before Document Verification`);
    }

    const outcome = decision === "callback" ? "Call back later" : decision === "documents" ? "Documents given" : "Not interested";
    const action = decision === "notInterested" ? "lost" : "save";
    setSaving(true);
    const update = await fetch(`/api/leads/${row.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form, action, lostReason: action === "lost" ? reason : "",
        leadStage: decision === "documents" ? "documentsReady" : decision === "callback" ? "contacted" : "quotation",
        nextFollowUp: decision === "callback" ? nextFollowUp : "", outcome,
        followUp: { type: "Quotation", outcome, remark: reason },
      }),
    });
    const updated = await update.json();
    if (!update.ok) { setSaving(false); return setError(updated.error ?? "Could not save the quotation response"); }
    if (decision === "documents") {
      const conversion = await fetch(`/api/leads/${row.id}/convert`, { method: "POST" });
      const converted = await conversion.json();
      setSaving(false);
      if (!conversion.ok) return setError(converted.error ?? "Could not send the record to Document Verification");
      return onComplete(`${row.id} handed over. Case ${converted.case.id} is now in Document Verification.`);
    }
    setSaving(false);
    if (decision === "callback") return onComplete(`${row.id} sent back to Call Tracker for the scheduled callback.`);
    onComplete(`${row.id} marked as Not Interested. The lead will not move forward.`);
  }

  if (readOnly) {
    return <div className="space-y-5"><QuotationSummary quotation={form} title="Latest Quotation" /><RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} /><div className="flex justify-end"><Button variant="ghost" type="button" onClick={onCancel}>Close</Button></div></div>;
  }

  return (
    <form onSubmit={submitResponse} className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation status</div><div className="mt-1 flex items-center gap-2"><Pill color={sent ? "green" : form.quotationStatus === "draft" ? "amber" : "gray"}>{sent ? "Sent" : form.quotationStatus === "draft" ? "Draft" : "Not created"}</Pill><span className="text-xs font-semibold text-slate-500">Version {Number(form.quotationRevision) > 0 ? `R${form.quotationRevision}` : "Original"}</span></div></div>
        {sent && <div className="flex items-center gap-3"><div className="text-right text-xs text-slate-500"><div>{form.quotationSentAt ? new Date(form.quotationSentAt).toLocaleString("en-IN") : "Sent"}</div><div>{form.quotationChannel}</div></div><Button variant="outline" type="button" onClick={() => setShowRevision((value) => !value)}><PencilLine size={15} />Revise Quotation</Button></div>}
      </div>

      {showRevision && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="font-semibold text-amber-900">Create a revised quotation</div><p className="mt-1 text-sm text-amber-700">The sent version will remain locked in revision history. Enter the change reason before editing the new version.</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input className="field bg-white" value={revisionReason} placeholder="Example: Price changed after customer discussion" onChange={(event) => setRevisionReason(event.target.value)} /><Button type="button" disabled={saving} onClick={startRevision}>{saving ? "Starting..." : "Start Revision"}</Button></div>{error && <div className="mt-2 text-sm font-medium text-rose-600">{error}</div>}</div>}

      <fieldset disabled={sent}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Create quotation</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Quotation Reference" required value={form.quotationReference} onChange={(v) => set("quotationReference", v)} />
          <Select label="Entity" required value={form.quotationEntity} options={["Urjacon", "Tuskin"]} onChange={(v) => set("quotationEntity", v)} />
          <Field label="System Type" required value={form.quotationSystemType} onChange={(v) => set("quotationSystemType", v)} />
          <Select label="DCR / NDCR" required value={form.quotationDcrType} options={["DCR", "NDCR"]} onChange={(v) => set("quotationDcrType", v)} />
          <Select label="Grid Type" required value={form.quotationGridType} options={["On-grid", "Hybrid"]} onChange={(v) => set("quotationGridType", v)} />
          <Field label="System Size (kW)" required type="number" step="0.1" value={form.kwWanted} onChange={(v) => set("kwWanted", v)} />
          <Field label="Quotation Price" required type="number" value={form.dealAmount} onChange={(v) => set("dealAmount", v)} />
          <Field label="Subsidy Shown" type="number" value={form.quotationSubsidy} onChange={(v) => set("quotationSubsidy", v)} />
          <Field label="Validity (Days)" required type="number" value={form.quotationValidityDays} onChange={(v) => set("quotationValidityDays", v)} />
          <Field label="Product Code" value={form.productCode} suggestions={masters.productCode} onChange={(v) => set("productCode", v)} />
          <Select label="Expected Payment Mode" value={form.paymentMode} options={form.state === "Odisha" ? ["Cash", "Loan", "Subsidy Cheque"] : ["Cash", "Loan"]} onChange={(v) => set("paymentMode", v)} />
          <Field label="Agent Commission" type="number" value={form.commission} onChange={(v) => set("commission", v)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextArea label="Scope / Notes" value={form.quotationNotes} onChange={(v) => set("quotationNotes", v)} />
          <TextArea label="Commercial Terms" value={form.quotationTerms} onChange={(v) => set("quotationTerms", v)} />
        </div>
        <div className="mt-4">
          <Label>Supporting Images / Documents (Optional)</Label>
          <FileUpload files={form.quotationFiles ?? []} onChange={(files) => set("quotationFiles", files)} max={3} />
          <p className="mt-1.5 text-xs text-slate-500">Quotation is generated from the fields above. Any uploaded site/product image or supporting PDF is stored separately and retained with this revision.</p>
        </div>
      </fieldset>

      {form.quotationStatus && <QuotationSummary quotation={form} />}
      <RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} />

      {notice && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}

      {!sent && <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-700">Send Quotation records the send now. When WhatsApp is integrated, the same button will dispatch the quotation message through WhatsApp before marking it sent.</div>}

      {!sent ? (
        <div className="flex items-center justify-end gap-3 pt-2">
          {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
          <Button variant="outline" type="button" disabled={saving} onClick={() => saveQuotation("draft")}><Save size={15} />Save Draft</Button>
          <Button type="button" disabled={saving} onClick={() => saveQuotation("send")}><MessageCircle size={15} />{saving ? "Sending..." : "Send Quotation"}</Button>
        </div>
      ) : (
        <>
          <fieldset>
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Customer response after quotation</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select label="Response" required value={decision} options={RESPONSES} onChange={setDecision} />
              {decision === "callback" && <Field label="Next Call Date & Time" required type="datetime-local" value={nextFollowUp} onChange={setNextFollowUp} />}
              {decision === "notInterested" && <Field label="Not Interested Reason" required value={reason} onChange={setReason} />}
            </div>
          </fieldset>

          {decision === "documents" && <DocumentPacket form={form} setForm={setForm} set={set} masters={masters} />}
          <FormActions onCancel={onCancel} saving={saving} error={error} submitLabel={decision === "documents" ? "Send to Document Verification" : decision === "callback" ? "Send to Call Tracker" : decision === "notInterested" ? "Stop lead here" : "Save response"} />
        </>
      )}
    </form>
  );
}

function DocumentPacket({ form, setForm, set, masters }) {
  return <fieldset><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lead handover packet</legend><div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{DOCS.map(([key, label]) => <label key={key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]" checked={Boolean(form.documents?.[key])} onChange={(event) => setForm((current) => ({ ...current, documents: { ...current.documents, [key]: event.target.checked } }))} />{label}<span className="text-rose-500">*</span></label>)}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="BP SC Number" value={form.bpScNumber} onChange={(v) => set("bpScNumber", v)} /><Field label="Branch" value={form.branch} suggestions={masters.branch} onChange={(v) => set("branch", v)} /><Field label="Dealer" value={form.dealer} suggestions={masters.dealer} onChange={(v) => set("dealer", v)} /><Field label="Liaisoning" value={form.liaisoning} suggestions={masters.liaisoning} onChange={(v) => set("liaisoning", v)} /><Field label="Route" value={form.route} onChange={(v) => set("route", v)} /></div></fieldset>;
}

function Field({ label, required, type = "text", value, onChange, step, suggestions = [] }) {
  const listId = suggestions.length ? `quote-${label.toLowerCase().replaceAll(" ", "-")}` : undefined;
  return <label><Label required={required}>{label}</Label><input className="field" type={type} min={type === "number" ? 0 : undefined} step={step} required={required} list={listId} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />{listId && <datalist id={listId}>{suggestions.map((option) => <option key={option} value={option} />)}</datalist>}</label>;
}

function TextArea({ label, value, onChange }) {
  return <label className="block"><Label>{label}</Label><textarea className="field min-h-28 resize-y" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

function RevisionHistory({ revisions = [], currentRevision }) {
  const previous = revisions.filter((item) => Number(item.revision) !== Number(currentRevision));
  if (!previous.length) return null;
  return <details className="rounded-xl border border-slate-200 bg-slate-50/70"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Previous quotation versions ({previous.length})</summary><div className="space-y-4 border-t border-slate-200 p-4">{[...previous].reverse().map((revision) => <QuotationSummary key={`${revision.revision}-${revision.sentAt}`} quotation={revision} title={revision.revision > 0 ? `Revision R${revision.revision}` : "Original Quotation"} printable />)}</div></details>;
}

function Select({ label, required, value, options, onChange }) {
  return <label className="block"><Label required={required}>{label}</Label><select className="field" required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => { const [v, text] = Array.isArray(option) ? option : [option, option]; return <option key={v} value={v}>{text}</option>; })}</select></label>;
}
