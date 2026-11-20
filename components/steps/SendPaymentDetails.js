"use client";
import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { paymentMessage } from "@/lib/caseDetails";

// Ask 90% Payment: sends the payment details to the customer's mobile. Today this records the send and
// opens WhatsApp with the message ready; once the WhatsApp integration is connected the same endpoint
// will send it directly.
export default function SendPaymentDetails({ row, readOnly }) {
  const [sent, setSent] = useState(row.paymentDetailsSent ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const last = sent.at(-1);
  const mobile = String(row.mobile ?? "").replace(/\D/g, "").slice(-10);

  async function send() {
    setError("");
    setBusy(true);
    const tab = window.open("", "_blank"); // opened on the click so the browser allows it
    const res = await fetch(`/api/cases/${row.id}/send-payment-details`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      tab?.close();
      return setError(j.error ?? "Could not send the payment details");
    }
    setSent((list) => [...list, j.entry]);
    if (tab) tab.location.href = j.whatsappUrl;
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment details for the customer</div>
          <div className="mt-0.5 text-sm text-slate-500">
            {mobile.length === 10 ? <>To <b className="text-slate-800">{row.customerName}</b> · {mobile}</> : "Customer mobile number is missing"}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={send}
            disabled={busy || mobile.length !== 10}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            <Send size={15} />
            {busy ? "Sending..." : last ? "Send again" : "Send payment details to customer"}
          </button>
        )}
      </div>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs leading-5 text-slate-600">{paymentMessage(row)}</pre>
      {last && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={14} />
          Sent {sent.length > 1 ? `${sent.length} times · ` : ""}last on {new Date(last.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} by {last.by}
        </div>
      )}
      {error && <div className="mt-2 text-sm font-medium text-rose-600">{error}</div>}
    </section>
  );
}
