import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { getSession } from "@/lib/session";
import { canSubmitStep } from "@/lib/access";
import { canSeeRecord } from "@/lib/defaultAssignees";
import { ninetyPercent, paymentMessage } from "@/lib/caseDetails";

// Ask 90% Payment: send the payment details to the customer. This is the single integration point for
// delivery: today it records the send and returns a WhatsApp link with the message ready; when the
// WhatsApp integration is connected, dispatch the message here before recording it.
export async function POST(_request, { params }) {
  const { id } = await params;
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canSubmitStep(me, "cashAskPayment")) {
    return NextResponse.json({ error: "Your role cannot send payment details" }, { status: 403 });
  }
  const row = await getCase(id);
  if (!row || !(await canSeeRecord(me, row))) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!["cashAskPayment", "cashPaymentReceived"].includes(row.stage)) {
    return NextResponse.json({ error: "Payment details can be sent while the case is at Ask 90% Payment" }, { status: 409 });
  }
  const mobile = String(row.mobile ?? "").replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return NextResponse.json({ error: "The customer's mobile number is missing or invalid" }, { status: 400 });
  if (!(Number(row.dealAmount) > 0)) return NextResponse.json({ error: "The system price is missing, so the 90% amount cannot be calculated" }, { status: 400 });

  const message = paymentMessage(row);
  const entry = {
    at: new Date().toISOString(),
    by: me.name ?? "Unknown",
    channel: "WhatsApp link (integration pending)",
    mobile,
    amount: ninetyPercent(row),
    message,
  };
  row.paymentDetailsSent = [...(row.paymentDetailsSent ?? []), entry];
  await saveCase(row);
  return NextResponse.json({ entry, whatsappUrl: `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}` });
}
