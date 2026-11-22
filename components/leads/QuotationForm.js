"use client";

import { useDeferredValue, useRef, useState } from "react";
import { MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { Label } from "@/components/steps/shared";
import QuotationSummary from "@/components/leads/QuotationSummary";
import ProposalFrame from "@/components/leads/ProposalFrame";
import ProposalBuilder from "@/components/leads/ProposalBuilder";
import { initialProposal, leadFieldsFrom } from "@/lib/proposal/lead";
import { compute } from "@/lib/proposal/engine";
import { defaultPaymentTerms } from "@/lib/quotationFormat";

export default function QuotationForm({ row, onComplete, onRefresh, onCancel, readOnly = false, idle = false, revising = false }) {
  const [form, setForm] = useState(() => ({
    quotationRevision: 0,
    quotationValidityDays: 15,
    quotationNotes: "Supply and installation of rooftop solar system as per approved site survey and technical specification.",
    quotationPreparedByRole: "Field marketing",
    quotationEntity: "Urjacon",
    quotationSystemType: "rooftop solar",
    ...row,
    quotationEntity: row.quotationEntity || "Urjacon",
    quotationSystemType: row.quotationSystemType || "rooftop solar",
    quotationTerms: row.quotationTerms || defaultPaymentTerms(row.paymentMode),
    quotationPreparedBy: row.quotationPreparedBy || row.dealer || row.agent || "",
    quotationPanelBrand: row.quotationPanelBrand || row.brand || "",
    // Grid type comes from the Product Interested chosen on the Lead page.
    quotationGridType: row.quotationGridType || row.productInterested || "",
    documents: { ...(row.documents ?? {}) },
  }));
  // The quotation is the UrjaCon proposal (11 pages): builder answers + two uploaded pictures.
  const [proposal, setProposal] = useState(() => initialProposal(row));
  const preview = useDeferredValue(proposal);
  const frame = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function validateForSend() {
    const ps = proposal.state;
    if (!ps.ref?.trim()) return "Enter the quotation Ref. No.";
    if (!ps.cust?.trim()) return "Enter the customer name";
    if (!ps.dcr) return "Select DCR or NDCR";
    const c = compute(ps);
    if (!(c.kw > 0)) return "Enter the system size in kW";
    if (!(c.grand > 0)) return "Enter the quotation price";
    return null;
  }

  async function saveQuotation(mode) {
    setError("");
    setNotice("");
    const validation = mode === "send" ? validateForSend() : null;
    if (validation) return setError(validation);
    if (revising && !revisionReason.trim()) return setError("Enter the reason for this revision");
    setSaving(true);
    const now = new Date().toISOString();
    // Revision: the sent version is archived first (R1, R2, ...), then the corrected one is sent.
    let revision = {};
    if (revising) {
      const response = await fetch(`/api/leads/${row.id}/revise-quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revisionReason }),
      });
      const started = await response.json();
      if (!response.ok) { setSaving(false); return setError(started.error ?? "Could not start the quotation revision"); }
      revision = {
        quotationRevision: started.quotationRevision, quotationRevisionReason: started.quotationRevisionReason,
        quotationRevisions: started.quotationRevisions, quotationCreatedAt: started.quotationCreatedAt,
        quotationSentAt: "", quotationSentBy: "", quotationChannel: "",
      };
    }
    const update = await fetch(`/api/leads/${row.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ...revision,
        ...leadFieldsFrom(proposal.state, proposal.media, form),
        paymentMode: form.paymentMode,
        action: "save",
        quotationStatus: "draft",
        quotationCreatedAt: revision.quotationCreatedAt || form.quotationCreatedAt || now,
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
    onComplete(revising
      ? `Revision R${result.lead.quotationRevision} of ${result.lead.quotationReference} sent.`
      : `Quotation ${result.lead.quotationReference} sent.`);
  }

  if (readOnly) {
    return <div className="space-y-5"><QuotationSummary quotation={form} title="Latest Quotation" /><RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} /><div className="flex justify-end"><Button variant="ghost" type="button" onClick={onCancel}>Close</Button></div></div>;
  }

  const modeOptions = form.state === "Odisha" ? ["Cash", "Loan", "Subsidy Cheque"] : ["Cash", "Loan"];
  const changeMode = (mode) => setForm((current) => ({
    ...current,
    paymentMode: mode,
    quotationTerms: !current.quotationTerms?.trim() || current.quotationTerms === defaultPaymentTerms(current.paymentMode) ? defaultPaymentTerms(mode) : current.quotationTerms,
  }));

  return (
    <form onSubmit={(event) => event.preventDefault()} inert={idle} className={`space-y-5 ${idle ? "opacity-60" : ""}`}>
      {revising && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-900">Revising the sent quotation (R{Number(form.quotationRevision || 0) + 1})</div>
          <p className="mt-1 text-sm text-amber-700">Correct the quotation below and Submit. The current version is kept in revision history; Call Tracker and every page then show the revised quotation.</p>
          <label className="mt-3 block"><Label required>Revision Reason</Label><input className="field bg-white" value={revisionReason} placeholder="Example: Price changed after customer discussion" onChange={(event) => setRevisionReason(event.target.value)} /></label>
        </div>
      )}

      {/* Same as the Proposal Studio: values on the left, the template on the right. */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(380px,440px)_minmax(0,1fr)]">
        <ProposalBuilder proposal={proposal} setProposal={setProposal} paymentMode={form.paymentMode ?? ""} modeOptions={modeOptions} onPaymentMode={changeMode} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="font-semibold text-slate-800">Proposal preview <span className="ml-1 text-xs font-normal text-slate-400">11 pages, updates as you type</span></div>
            <button type="button" onClick={() => frame.current?.print()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand-dark"><Printer size={14} />Print / Save PDF</button>
          </div>
          <ProposalFrame ref={frame} proposal={preview} height="calc(100vh - 8.5rem)" />
        </section>
      </div>

      {form.source === "Agent" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
          <span className="font-medium text-slate-600">Agent commission (not printed)</span>
          <input className="field w-40 bg-white" type="number" min={0} value={form.commission ?? ""} onChange={(event) => set("commission", event.target.value)} />
        </div>
      )}

      <RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} />

      {notice && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={() => saveQuotation("send")}><MessageCircle size={15} />{saving ? "Submitting..." : "Submit"}</Button>
      </div>
    </form>
  );
}



function RevisionHistory({ revisions = [], currentRevision }) {
  const previous = revisions.filter((item) => Number(item.revision) !== Number(currentRevision));
  if (!previous.length) return null;
  return <details className="rounded-xl border border-slate-200 bg-slate-50/70"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Previous quotation versions ({previous.length})</summary><div className="space-y-4 border-t border-slate-200 p-4">{[...previous].reverse().map((revision) => <QuotationSummary key={`${revision.revision}-${revision.sentAt}`} quotation={revision} title={revision.revision > 0 ? `Revision R${revision.revision}` : "Original Quotation"} printable />)}</div></details>;
}

