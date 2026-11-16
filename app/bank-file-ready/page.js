"use client";
import LoanStepPage from "@/components/LoanStepPage";

export default function BankFileReadyPage() {
  return (
    <LoanStepPage
      stepKey="bankFileReady"
      title="Bank File Ready"
      subtitle="Loan · Step 1 · Loan cases from Payment Work Start arrive here. Mark the bank file as ready."
    />
  );
}
