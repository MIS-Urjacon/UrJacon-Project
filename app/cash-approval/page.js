"use client";
import CashStepPage from "@/components/CashStepPage";

export default function CashApprovalPage() {
  return (
    <CashStepPage
      stepKey="cashApproval"
      title="Check for Approval"
      subtitle="Cash · Step 3 · Only when payment is not received. Chaitan gets the Director's approval (register signed) to dispatch without payment."
    />
  );
}
