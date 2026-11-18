"use client";

import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { MessageCircle, PencilLine, Save } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { Label } from "@/components/steps/shared";
import QuotationSummary from "@/components/leads/QuotationSummary";
import FileUpload from "@/components/FileUpload";

export default function QuotationForm({ row, onComplete, onRefresh, onCancel, readOnly = false }) {
  const [form, setForm] = useState(() => ({
    quotationRevision: 0,
    quotationValidityDays: 15,
    quotationNotes: "Supply and installation of rooftop solar system as per approved site survey and technical specification.",
    quotationTerms: "Final scope is subject to site feasibility.\nSubsidy is subject to prevailing government rules and portal approval.\nTaxes, payment milestones and delivery schedule will be as mutually agreed.",
    ...row,
    documents: { ...(row.documents ?? {}) },
  }));
  const [masters, setMasters] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    onComplete(`Revision R${result.quotationRevision} started for ${row.id}. Update and send it from the Pending tab; Call Tracker updates after it is sent.`);
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
    onComplete(`Quotation ${result.lead.quotationReference} sent. ${row.id} is back in Call Tracker for the customer response.`);
  }

  if (readOnly) {
    const canRevise = row.status === "open" && row.quotationStatus === "sent" && ["quotation", "contacted"].includes(row.leadStage);
    return <div className="space-y-5"><QuotationSummary quotation={form} title="Latest Quotation" />{canRevise && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="font-semibold text-amber-900">Revise this quotation</div><p className="mt-1 text-sm text-amber-700">The sent version stays locked in revision history. Enter the change reason, edit the new version in Pending and send it; Call Tracker then shows the revised quotation.</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input className="field bg-white" value={revisionReason} placeholder="Example: Price changed after customer discussion" onChange={(event) => setRevisionReason(event.target.value)} /><Button type="button" disabled={saving} onClick={startRevision}><PencilLine size={15} />{saving ? "Starting..." : "Start Revision"}</Button></div>{error && <div className="mt-2 text-sm font-medium text-rose-600">{error}</div>}</div>}<RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} /><div className="flex justify-end"><Button variant="ghost" type="button" onClick={onCancel}>Close</Button></div></div>;
  }

  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation status</div><div className="mt-1 flex items-center gap-2"><Pill color={form.quotationStatus === "draft" ? "amber" : "gray"}>{form.quotationStatus === "draft" ? "Draft" : "Not created"}</Pill><span className="text-xs font-semibold text-slate-500">Version {Number(form.quotationRevision) > 0 ? `R${form.quotationRevision}` : "Original"}</span></div></div>
      </div>


      <fieldset>
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

      <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-700">Send Quotation records the send now. When WhatsApp is integrated, the same button will dispatch the quotation message through WhatsApp before marking it sent. After sending, the lead returns to Call Tracker.</div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" type="button" disabled={saving} onClick={() => saveQuotation("draft")}><Save size={15} />Save Draft</Button>
        <Button type="button" disabled={saving} onClick={() => saveQuotation("send")}><MessageCircle size={15} />{saving ? "Sending..." : "Send Quotation"}</Button>
      </div>
    </form>
  );
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
  return <label className="block"><Label required={required}>{label}</Label><DropSelect className="field" required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => { const [v, text] = Array.isArray(option) ? option : [option, option]; return <option key={v} value={v}>{text}</option>; })}</DropSelect></label>;
}
