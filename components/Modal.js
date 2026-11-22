"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
  bodyClass = "px-7 py-6",
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Lock the page behind the popup without the page jumping sideways when its scrollbar disappears.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`anim-pop flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-5">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto overscroll-contain ${bodyClass}`}>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-7 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
