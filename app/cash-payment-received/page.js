"use client";
import CashStepPage from "@/components/CashStepPage";

export default function CashPaymentReceivedPage() {
  return (
    <CashStepPage
      stepKey="cashPaymentReceived"
      title="90% Payment Received?"
      subtitle="Cash · Step 2 · Ankita confirms in the Finance Group. Yes goes to Dispatch, No goes to Check for Approval."
    />
  );
}
