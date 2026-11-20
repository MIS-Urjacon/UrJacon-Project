"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { Label } from "@/components/steps/shared";
import QuotationSummary from "@/components/leads/QuotationSummary";
import { DEFAULT_INCLUDED, DEFAULT_PANEL_WP, QDOC_CSS, defaultInverter, defaultMeter, defaultPanelCount, defaultPaymentTerms, paymentModeLabel } from "@/lib/quotationFormat";

// Inputs inside the quotation document: look like filled-in blanks of the printed format.
const QEDIT_CSS = `.qdoc .qin{font:inherit;color:inherit;background:#FFFBEB;border:0;border-bottom:1.5px dashed #E8C66A;border-radius:4px 4px 0 0;padding:1px 6px;outline:none}.qdoc .qin:focus{background:#FFF3CC;border-bottom-color:#F6B02B}.qdoc .qin::placeholder{color:#B4AC94}.qdoc select.qin{cursor:pointer}.qdoc textarea.qin{display:block;line-height:1.5}.qdoc input[type=number].qin{-moz-appearance:textfield}`;

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
  const [masters, setMasters] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [today, setToday] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the date must not be read while prerendering
  useEffect(() => { setToday(new Date().toISOString()); }, []);
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
        action: "save",
        leadStage: "quotation",
        quotationStatus: "draft",
        quotationCreatedAt: revision.quotationCreatedAt || form.quotationCreatedAt || now,
        // The quotation shows central and state subsidy; the total stays in quotationSubsidy.
        quotationSubsidy: Number(form.quotationCentralSubsidy || 0) + Number(form.quotationStateSubsidy || 0) || Number(form.quotationSubsidy || 0),
        quotationTerms: form.quotationTerms?.trim() ? form.quotationTerms : defaultPaymentTerms(form.paymentMode),
        productCode: form.productCode || (Number(form.kwWanted) > 0 ? `PMSG-${Number(form.kwWanted)}KW` : ""),
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
    onComplete(revising
      ? `Revision R${result.lead.quotationRevision} of ${result.lead.quotationReference} sent. Call Tracker shows the latest quotation.`
      : `Quotation ${result.lead.quotationReference} sent. ${row.id} is back in Call Tracker for the customer response.`);
  }

  if (readOnly) {
    return <div className="space-y-5"><QuotationSummary quotation={form} title="Latest Quotation" /><RevisionHistory revisions={form.quotationRevisions} currentRevision={form.quotationRevision} /><div className="flex justify-end"><Button variant="ghost" type="button" onClick={onCancel}>Close</Button></div></div>;
  }

  const modeOptions = form.state === "Odisha" ? ["Cash", "Loan", "Subsidy Cheque"] : ["Cash", "Loan"];
  const changeMode = (mode) => setForm((current) => ({
    ...current,
    paymentMode: mode,
    // Standard terms follow the payment mode until someone edits them.
    quotationTerms: !current.quotationTerms?.trim() || current.quotationTerms === defaultPaymentTerms(current.paymentMode) ? defaultPaymentTerms(mode) : current.quotationTerms,
  }));
  // Today's date is set after mount (no new Date() while prerendering).
  const issued = form.quotationCreatedAt && !revising ? form.quotationCreatedAt : today;
  const validTill = issued ? new Date(new Date(issued).getTime() + (Number(form.quotationValidityDays) || 15) * 86400000) : null;
  const day = (value) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const net = Math.max(0, Number(form.dealAmount || 0) - Number(form.quotationCentralSubsidy || 0) - Number(form.quotationStateSubsidy || 0));
  const place = [[form.village, form.branch].filter(Boolean).join(", "), form.state ? `(${form.state})` : ""].filter(Boolean).join(" ");
  const urjacon = !/tuskin/i.test(form.quotationEntity || "Urjacon");

  return (
    <form onSubmit={(event) => event.preventDefault()} inert={idle} className={`space-y-5 ${idle ? "opacity-60" : ""}`}>
      {revising && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-900">Revising the sent quotation (R{Number(form.quotationRevision || 0) + 1})</div>
          <p className="mt-1 text-sm text-amber-700">Correct the quotation below and Submit. The current version is kept in revision history; Call Tracker and every page then show the revised quotation.</p>
          <label className="mt-3 block"><Label required>Revision Reason</Label><input className="field bg-white" value={revisionReason} placeholder="Example: Price changed after customer discussion" onChange={(event) => setRevisionReason(event.target.value)} /></label>
        </div>
      )}

      {/* The quotation itself, in the owner's format: edit the values in place. */}
      <style>{QDOC_CSS + QEDIT_CSS}</style>
      <div className="rounded-2xl bg-[#EFEEE8] p-3 sm:p-6">
        <div className="qdoc">
          <div className="q-head">
            <div>
              {urjacon ? (
                <svg className="wordmark q-logo" viewBox="0 0 226 100" role="img" aria-label="UrjaCon">
                  <g fill="none" stroke="#F6B02B" strokeWidth="7" strokeLinecap="round">
                    <path d="M70 46 A18 18 0 0 1 106 46" />
                    <path d="M52 46 H61" /><path d="M115 46 H124" /><path d="M88 15 V24" /><path d="M63.5 21.5 L69.9 27.9" /><path d="M112.5 21.5 L106.1 27.9" />
                  </g>
                  <text x="113" y="94" textAnchor="middle" fontFamily="Poppins, 'Hanken Grotesk', sans-serif" fontWeight="800" fontSize="51" letterSpacing="-1.2" fill="#141414">UrjaCon</text>
                </svg>
              ) : (
                <div className="q-title" style={{ textAlign: "left" }}>Tuskin</div>
              )}
              <div className="q-ent">
                <select className="qin" aria-label="Entity" value={form.quotationEntity || "Urjacon"} onChange={(event) => set("quotationEntity", event.target.value)}>
                  <option value="Urjacon">UrjaCon</option>
                  <option value="Tuskin">Tuskin</option>
                </select>
                , registered vendor under PM Surya Ghar: Muft Bijli Yojana
              </div>
            </div>
            <div className="q-meta">
              <div className="q-title">Quotation</div>
              <dl>
                <dt>Ref.</dt><dd><input className="qin w-44" aria-label="Quotation reference" placeholder="URJ/Q/26-27/0107" value={form.quotationReference ?? ""} onChange={(event) => set("quotationReference", event.target.value)} /></dd>
                <dt>Date</dt><dd>{day(issued)}</dd>
                <dt>Valid till</dt><dd>{day(validTill)} <span className="font-normal text-[#5F5F5A]">(<input className="qin w-12 text-center" type="number" min={1} aria-label="Validity in days" value={form.quotationValidityDays ?? ""} onChange={(event) => set("quotationValidityDays", event.target.value)} /> days)</span></dd>
              </dl>
            </div>
          </div>

          <div className="q-to">
            <div>
              <span>Prepared for</span><b>{form.customerName || "-"}</b>
              {place && <div>{place}</div>}
              {form.mobile && <div>Mobile {form.mobile}</div>}
            </div>
            <div>
              <span>Prepared by</span>
              <input className="qin w-full text-base font-bold" list="quote-prepared-by" aria-label="Prepared by" placeholder="Name" value={form.quotationPreparedBy ?? ""} onChange={(event) => set("quotationPreparedBy", event.target.value)} />
              <datalist id="quote-prepared-by">{(masters.dealer ?? []).map((name) => <option key={name} value={name} />)}</datalist>
              <input className="qin mt-1 w-full" aria-label="Prepared by role" placeholder="Field marketing" value={form.quotationPreparedByRole ?? ""} onChange={(event) => set("quotationPreparedByRole", event.target.value)} />
            </div>
          </div>

          <h4>System</h4>
          <table className="q-t"><tbody>
            <tr><td>Capacity</td><td>
              <input className="qin w-16 text-center" type="number" min={0} step="0.1" aria-label="System size in kW" value={form.kwWanted ?? ""} onChange={(event) => set("kwWanted", event.target.value)} /> kW{" "}
              <input className="qin w-32" aria-label="System type" placeholder="rooftop solar" value={form.quotationSystemType ?? ""} onChange={(event) => set("quotationSystemType", event.target.value)} />,{" "}
              <select className="qin" aria-label="Grid type" value={form.quotationGridType ?? ""} onChange={(event) => set("quotationGridType", event.target.value)}>
                <option value="">grid type</option><option value="On-grid">on-grid</option><option value="Hybrid">hybrid</option>
              </select>
            </td></tr>
            <tr><td>Solar panels</td><td>
              <input className="qin w-14 text-center" type="number" min={0} aria-label="Number of panels" placeholder={String(defaultPanelCount(form.kwWanted, form.quotationPanelWp) || "")} value={form.quotationPanelCount || ""} onChange={(event) => set("quotationPanelCount", event.target.value)} /> ×{" "}
              <input className="qin w-16 text-center" type="number" min={0} aria-label="Panel wattage" placeholder={String(DEFAULT_PANEL_WP)} value={form.quotationPanelWp || ""} onChange={(event) => set("quotationPanelWp", event.target.value)} /> Wp{" "}
              <input className="qin w-28 uppercase" list="quote-panel-brand" aria-label="Panel brand" placeholder="BRAND" value={form.quotationPanelBrand ?? ""} onChange={(event) => set("quotationPanelBrand", event.target.value)} />{" "}
              <datalist id="quote-panel-brand">{(masters.brand ?? []).map((name) => <option key={name} value={name} />)}</datalist>
              <select className="qin" aria-label="DCR or NDCR" value={form.quotationDcrType ?? ""} onChange={(event) => set("quotationDcrType", event.target.value)}>
                <option value="">DCR / NDCR</option><option value="DCR">DCR (made in India cells)</option><option value="NDCR">NDCR</option>
              </select>
            </td></tr>
            <tr><td>Inverter</td><td><input className="qin w-full" aria-label="Inverter" placeholder={defaultInverter(form.kwWanted, form.quotationGridType) || "4 kW hybrid inverter with battery support"} value={form.quotationInverter ?? ""} onChange={(event) => set("quotationInverter", event.target.value)} /></td></tr>
            <tr><td>Included</td><td><textarea className="qin w-full resize-y" rows={2} aria-label="Included" placeholder={DEFAULT_INCLUDED} value={form.quotationIncluded ?? ""} onChange={(event) => set("quotationIncluded", event.target.value)} /></td></tr>
            <tr><td>Meter</td><td><input className="qin w-full" aria-label="Meter" placeholder={defaultMeter(form.state)} value={form.quotationMeter ?? ""} onChange={(event) => set("quotationMeter", event.target.value)} /></td></tr>
          </tbody></table>

          <h4>Price</h4>
          <table className="q-t q-price"><tbody>
            <tr><td>System price (including GST)</td><td>₹ <input className="qin w-32 text-right" type="number" min={0} aria-label="System price" value={form.dealAmount ?? ""} onChange={(event) => set("dealAmount", event.target.value)} /></td></tr>
            <tr><td>Central subsidy</td><td>− ₹ <input className="qin w-32 text-right" type="number" min={0} aria-label="Central subsidy" value={form.quotationCentralSubsidy || ""} onChange={(event) => set("quotationCentralSubsidy", event.target.value)} /></td></tr>
            <tr><td>State subsidy</td><td>− ₹ <input className="qin w-32 text-right" type="number" min={0} aria-label="State subsidy" value={form.quotationStateSubsidy || ""} onChange={(event) => set("quotationStateSubsidy", event.target.value)} /></td></tr>
            <tr className="q-net"><td>Your cost after subsidy</td><td>₹{net.toLocaleString("en-IN")}</td></tr>
          </tbody></table>

          <h4>
            Payment terms (
            <select className="qin" aria-label="Payment mode" value={form.paymentMode ?? ""} onChange={(event) => changeMode(event.target.value)}>
              <option value="">payment mode</option>
              {modeOptions.map((mode) => <option key={mode} value={mode}>{paymentModeLabel(mode) || mode}</option>)}
            </select>
            )
          </h4>
          <textarea className="qin w-full resize-y" rows={4} aria-label="Payment terms, one per line" placeholder={defaultPaymentTerms(form.paymentMode) || "Select the payment mode to fill the standard terms"} value={form.quotationTerms ?? ""} onChange={(event) => set("quotationTerms", event.target.value)} />

          <div className="q-sign"><div>Customer signature</div><div>For {urjacon ? "UrjaCon" : "Tuskin"}</div></div>
        </div>
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

