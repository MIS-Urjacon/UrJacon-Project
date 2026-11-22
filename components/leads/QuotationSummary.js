"use client";

import { useRef } from "react";
import { FileText, Printer } from "lucide-react";
import ProposalFrame from "@/components/leads/ProposalFrame";
import { Pill } from "@/components/ui";
import { quotationNumber } from "@/lib/quotation";
import { QDOC_CSS, QDOC_PAGE_CSS, quotationDocument } from "@/lib/quotationFormat";

function normalize(quotation) {
  const snapshot = quotation?.number || Object.hasOwn(quotation ?? {}, "price");
  return snapshot ? {
    number: quotation.number || quotation.reference,
    revision: quotation.revision || 0,
    revisionReason: quotation.revisionReason,
    status: quotation.status,
    entity: quotation.entity,
    customerName: quotation.customerName,
    mobile: quotation.mobile,
    email: quotation.email,
    address: quotation.address,
    village: quotation.village,
    branch: quotation.branch,
    state: quotation.state,
    systemType: quotation.systemType,
    dcrType: quotation.dcrType,
    gridType: quotation.gridType,
    kwWanted: quotation.kwWanted,
    price: quotation.price,
    subsidy: quotation.subsidy,
    centralSubsidy: quotation.centralSubsidy,
    stateSubsidy: quotation.stateSubsidy,
    panelCount: quotation.panelCount,
    panelWp: quotation.panelWp,
    panelBrand: quotation.panelBrand,
    inverter: quotation.inverter,
    included: quotation.included,
    meter: quotation.meter,
    preparedBy: quotation.preparedBy,
    preparedByRole: quotation.preparedByRole,
    productCode: quotation.productCode,
    paymentMode: quotation.paymentMode,
    validityDays: quotation.validityDays,
    notes: quotation.notes,
    terms: quotation.terms,
    files: quotation.files,
    createdAt: quotation.createdAt,
    sentAt: quotation.sentAt,
    sentBy: quotation.sentBy,
    proposal: quotation.proposal,
  } : {
    number: quotationNumber(quotation),
    revision: quotation.quotationRevision || 0,
    revisionReason: quotation.quotationRevisionReason,
    status: quotation.quotationStatus,
    entity: quotation.quotationEntity,
    customerName: quotation.customerName,
    mobile: quotation.mobile,
    email: quotation.email,
    address: quotation.address,
    village: quotation.village,
    branch: quotation.branch,
    state: quotation.state,
    systemType: quotation.quotationSystemType,
    dcrType: quotation.quotationDcrType,
    gridType: quotation.quotationGridType,
    kwWanted: quotation.kwWanted,
    price: quotation.dealAmount,
    subsidy: quotation.quotationSubsidy,
    centralSubsidy: quotation.quotationCentralSubsidy,
    stateSubsidy: quotation.quotationStateSubsidy,
    panelCount: quotation.quotationPanelCount,
    panelWp: quotation.quotationPanelWp,
    panelBrand: quotation.quotationPanelBrand || quotation.brand,
    inverter: quotation.quotationInverter,
    included: quotation.quotationIncluded,
    meter: quotation.quotationMeter,
    preparedBy: quotation.quotationPreparedBy || quotation.dealer || quotation.agent,
    preparedByRole: quotation.quotationPreparedByRole,
    productCode: quotation.productCode,
    paymentMode: quotation.paymentMode || quotation.preferredPaymentMode,
    validityDays: quotation.quotationValidityDays || 15,
    notes: quotation.quotationNotes,
    terms: quotation.quotationTerms,
    files: quotation.quotationFiles,
    createdAt: quotation.quotationCreatedAt,
    sentAt: quotation.quotationSentAt,
    sentBy: quotation.quotationSentBy,
    proposal: quotation.quotationProposal,
  };
}

export default function QuotationSummary({ quotation, title = "Generated Quotation", printable = true }) {
  const proposalFrame = useRef(null);
  if (!quotation?.quotationReference && !quotation?.reference && !quotation?.number) return null;
  const quote = normalize(quotation);
  const status = quote.status === "sent" || quote.sentAt ? "Sent" : "Draft";
  const hasProposal = Boolean(quote.proposal?.state);

  function printQuotation(event) {
    if (hasProposal) return proposalFrame.current?.print();
    const documentNode = event.currentTarget.closest("section")?.querySelector("[data-quotation-document]");
    if (!documentNode) return;
    const popup = window.open("", "_blank", "width=900,height=900");
    if (!popup) return;
    const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=Poppins:wght@700;800&display=swap">';
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${quote.number || "Quotation"}</title>${fonts}<style>${QDOC_PAGE_CSS}${QDOC_CSS}</style></head><body>${documentNode.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    popup.document.close();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800"><FileText size={17} className="text-brand-dark" />{title}</div>
        <div className="flex items-center gap-2"><Pill color={status === "Sent" ? "green" : "amber"}>{status}</Pill>{printable && <button type="button" onClick={printQuotation} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand-dark"><Printer size={14} />Print / Save PDF</button>}</div>
      </div>

      {hasProposal ? (
        <ProposalFrame ref={proposalFrame} proposal={quote.proposal} height={680} />
      ) : (
        <>
          <style>{QDOC_CSS}</style>
          <div data-quotation-document className="bg-[#EFEEE8] p-3 sm:p-5">
            <QuotationDocument q={quotationDocument(quote)} />
          </div>
        </>
      )}

      {quote.files?.length > 0 && <div className="no-print border-t border-slate-200 bg-slate-50 px-5 py-4"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supporting images / documents</div><div className="flex flex-wrap gap-2">{quote.files.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-brand-dark hover:border-brand"><FileText size={15} />{file.name || "View attachment"}</a>)}</div></div>}
    </section>
  );
}

// The owner's quotation format (URJ/Q/26-27/0107): header, prepared for / by, system, price,
// payment terms and signatures.
function QuotationDocument({ q }) {
  const urjacon = !/tuskin/i.test(q.entity);
  const entityName = urjacon ? "UrjaCon" : q.entity;
  return (
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
            <div className="q-title" style={{ textAlign: "left" }}>{entityName}</div>
          )}
          <div className="q-ent">{entityName}, registered vendor under PM Surya Ghar: Muft Bijli Yojana</div>
        </div>
        <div className="q-meta">
          <div className="q-title">Quotation</div>
          <dl>
            <dt>Ref.</dt><dd>{q.reference || "-"}</dd>
            <dt>Date</dt><dd>{q.date}</dd>
            <dt>Valid till</dt><dd>{q.validTill}</dd>
          </dl>
        </div>
      </div>

      <div className="q-to">
        <div>
          <span>Prepared for</span><b>{q.customerName || "-"}</b>
          {q.place && <div>{q.place}</div>}
          {q.mobile && <div>Mobile {q.mobile}</div>}
        </div>
        <div>
          <span>Prepared by</span><b>{q.preparedBy || "-"}</b>
          {q.preparedByRole && <div>{q.preparedByRole}</div>}
        </div>
      </div>

      <h4>System</h4>
      <table className="q-t"><tbody>
        <tr><td>Capacity</td><td>{q.capacity || "-"}</td></tr>
        <tr><td>Solar panels</td><td>{q.panels || "-"}</td></tr>
        <tr><td>Inverter</td><td>{q.inverter || "-"}</td></tr>
        <tr><td>Included</td><td>{q.included}</td></tr>
        <tr><td>Meter</td><td>{q.meter}</td></tr>
      </tbody></table>

      <h4>Price</h4>
      <table className="q-t q-price"><tbody>
        <tr><td>System price (including GST)</td><td>{q.price}</td></tr>
        <tr><td>Central subsidy</td><td>{q.centralSubsidy}</td></tr>
        <tr><td>State subsidy</td><td>{q.stateSubsidy}</td></tr>
        <tr className="q-net"><td>Your cost after subsidy</td><td>{q.net}</td></tr>
      </tbody></table>

      {q.terms.length > 0 && (
        <>
          <h4>Payment terms{q.termsTitle ? ` (${q.termsTitle})` : ""}</h4>
          <ul className="q-ul">{q.terms.map((line) => <li key={line}>{line}</li>)}</ul>
        </>
      )}

      <div className="q-sign"><div>Customer signature</div><div>For {entityName}</div></div>
    </div>
  );
}
