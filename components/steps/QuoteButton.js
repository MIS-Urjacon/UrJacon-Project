"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import QuotationSummary from "@/components/leads/QuotationSummary";

// Compact quotation icon for step popups; the full quotation opens only when clicked.
export default function QuoteButton({ row, title = "Quotation Received from Lead Management", compact = false }) {
  const [open, setOpen] = useState(false);
  if (!row.quotationReference) return null;
  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`View quotation ${row.quotationReference}`}
          aria-label="View quotation"
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-100"
        >
          <FileText size={13} />
          {row.quotationReference}
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View quotation ${row.quotationReference}`}
        aria-label="View quotation"
        className="flex h-[74px] w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-brand-100 bg-brand-50 text-brand-dark transition hover:bg-brand-100"
      >
        <FileText size={20} />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Quote</span>
      </button>
      )}
      {open && <QuotationPopup row={row} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

// The full quotation is opened on demand instead of taking up space in the popup.
function QuotationPopup({ row, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); // close only this popup, not the Document Verification one
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" className="anim-pop flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold">Quotation</h3>
            <p className="mt-0.5 text-sm text-slate-400">{row.customerName} · {row.quotationReference}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-5">
          <QuotationSummary quotation={row} title={title} />
        </div>
      </div>
    </div>,
    document.body
  );
}
