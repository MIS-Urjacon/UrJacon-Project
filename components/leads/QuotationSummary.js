"use client";

import { FileText, Printer } from "lucide-react";
import { Pill } from "@/components/ui";
import { quotationNumber } from "@/lib/quotation";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

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
    state: quotation.state,
    systemType: quotation.systemType,
    dcrType: quotation.dcrType,
    gridType: quotation.gridType,
    kwWanted: quotation.kwWanted,
    price: quotation.price,
    subsidy: quotation.subsidy,
    productCode: quotation.productCode,
    paymentMode: quotation.paymentMode,
    validityDays: quotation.validityDays,
    notes: quotation.notes,
    terms: quotation.terms,
    files: quotation.files,
    createdAt: quotation.createdAt,
    sentAt: quotation.sentAt,
    sentBy: quotation.sentBy,
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
    state: quotation.state,
    systemType: quotation.quotationSystemType,
    dcrType: quotation.quotationDcrType,
    gridType: quotation.quotationGridType,
    kwWanted: quotation.kwWanted,
    price: quotation.dealAmount,
    subsidy: quotation.quotationSubsidy,
    productCode: quotation.productCode,
    paymentMode: quotation.paymentMode || quotation.preferredPaymentMode,
    validityDays: quotation.quotationValidityDays || 15,
    notes: quotation.quotationNotes,
    terms: quotation.quotationTerms,
    files: quotation.quotationFiles,
    createdAt: quotation.quotationCreatedAt,
    sentAt: quotation.quotationSentAt,
    sentBy: quotation.quotationSentBy,
  };
}

export default function QuotationSummary({ quotation, title = "Generated Quotation", printable = true }) {
  if (!quotation?.quotationReference && !quotation?.reference && !quotation?.number) return null;
  const quote = normalize(quotation);
  const status = quote.status === "sent" || quote.sentAt ? "Sent" : "Draft";
  const netPayable = Math.max(0, Number(quote.price || 0) - Number(quote.subsidy || 0));

  function printQuotation(event) {
    const documentNode = event.currentTarget.closest("section")?.querySelector("[data-quotation-document]");
    if (!documentNode) return;
    const popup = window.open("", "_blank", "width=900,height=900");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>Quotation</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:28px;background:#f1f5f9}.paper{max-width:800px;margin:auto;background:white;border:1px solid #dbe3ea;border-radius:16px;overflow:hidden}.head{background:#0f766e;color:white;padding:28px}.head h1{margin:0;font-size:28px}.head p{margin:6px 0 0}.content{padding:26px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.label{font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.08em}.value{font-weight:600;margin-top:4px}.table{width:100%;border-collapse:collapse;margin-top:24px}.table th,.table td{padding:12px;border:1px solid #e2e8f0;text-align:left}.table th{background:#f8fafc;font-size:11px;text-transform:uppercase}.totals{margin:22px 0 0 auto;width:330px}.totals div{display:flex;justify-content:space-between;padding:7px 0}.totals .net{font-size:18px;font-weight:700;border-top:2px solid #0f766e}.block{margin-top:22px;padding:16px;background:#f8fafc;border-radius:10px;white-space:pre-wrap}.footer{padding-top:28px;margin-top:28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}@media print{body{padding:0;background:white}.paper{border:0}}</style></head><body><div class="paper">${documentNode.innerHTML}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
    popup.document.title = quote.number || "Quotation";
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800"><FileText size={17} className="text-brand-dark" />{title}</div>
        <div className="flex items-center gap-2"><Pill color={status === "Sent" ? "green" : "amber"}>{status}</Pill>{printable && <button type="button" onClick={printQuotation} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand-dark"><Printer size={14} />Print / Save PDF</button>}</div>
      </div>

      <div data-quotation-document className="quotation-document">
        <div className="head bg-gradient-to-r from-brand-dark to-brand px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-6"><div><div className="text-2xl font-bold tracking-tight">{quote.entity || "Urjacon"}</div><p className="mt-1 text-sm text-white/75">Rooftop Solar Solutions</p></div><div className="text-right"><h1 className="text-2xl font-bold">QUOTATION</h1><p className="mt-1 text-sm text-white/80">{quote.number || "Draft reference"}</p>{Number(quote.revision) > 0 && <p className="mt-1 text-xs text-white/70">Revision {quote.revision}</p>}</div></div>
        </div>

        <div className="content p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <QuoteBlock label="Quotation for" value={quote.customerName} lines={[quote.mobile, quote.email, [quote.address || quote.village, quote.state].filter(Boolean).join(", ")]} />
            <QuoteBlock label="Quotation details" value={quote.number} lines={[`Created: ${date(quote.createdAt)}`, `Valid for: ${quote.validityDays || 15} days`, quote.paymentMode ? `Payment mode: ${quote.paymentMode}` : ""]} />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="table w-full min-w-[600px] border-collapse text-left text-sm">
              <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><th className="border border-slate-200 px-3 py-3">System</th><th className="border border-slate-200 px-3 py-3">Configuration</th><th className="border border-slate-200 px-3 py-3">Product</th><th className="border border-slate-200 px-3 py-3 text-right">Amount</th></tr></thead>
              <tbody><tr><td className="border border-slate-200 px-3 py-4 font-semibold">{quote.kwWanted ? `${quote.kwWanted} kW` : "-"} {quote.systemType}</td><td className="border border-slate-200 px-3 py-4">{[quote.dcrType, quote.gridType].filter(Boolean).join(" · ") || "-"}</td><td className="border border-slate-200 px-3 py-4">{quote.productCode || "As per approved specification"}</td><td className="border border-slate-200 px-3 py-4 text-right font-semibold">{money(quote.price)}</td></tr></tbody>
            </table>
          </div>

          <div className="totals ml-auto mt-5 max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Quotation price</span><b>{money(quote.price)}</b></div><div className="flex justify-between"><span className="text-slate-500">Expected subsidy</span><b className="text-emerald-700">− {money(quote.subsidy)}</b></div><div className="net flex justify-between border-t-2 border-brand pt-3 text-lg"><span>Effective cost</span><b>{money(netPayable)}</b></div></div>

          {quote.notes && <TextBlock title="Scope / Notes" value={quote.notes} />}
          {quote.terms && <TextBlock title="Commercial Terms" value={quote.terms} />}
          {quote.revisionReason && Number(quote.revision) > 0 && <TextBlock title="Revision reason" value={quote.revisionReason} />}

          <div className="footer mt-7 border-t border-slate-200 pt-5 text-xs text-slate-500"><div>This system-generated quotation is based on the details recorded in the Urjacon Process System.</div>{quote.sentAt && <div className="mt-1">Sent: {date(quote.sentAt)}{quote.sentBy ? ` by ${quote.sentBy}` : ""}</div>}</div>
        </div>
      </div>

      {quote.files?.length > 0 && <div className="no-print border-t border-slate-200 bg-slate-50 px-5 py-4"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supporting images / documents</div><div className="flex flex-wrap gap-2">{quote.files.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-brand-dark hover:border-brand"><FileText size={15} />{file.name || "View attachment"}</a>)}</div></div>}
    </section>
  );
}

function QuoteBlock({ label, value, lines }) {
  return <div><div className="label text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="value mt-1 font-bold text-slate-800">{value || "-"}</div>{lines.filter(Boolean).map((line) => <div key={line} className="mt-0.5 text-sm text-slate-500">{line}</div>)}</div>;
}

function TextBlock({ title, value }) {
  return <div className="block mt-5 rounded-xl bg-slate-50 p-4"><div className="label text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value}</div></div>;
}

function date(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
