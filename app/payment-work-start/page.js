"use client";
import StepPage from "@/components/StepPage";
import PaymentWorkStartForm from "@/components/steps/PaymentWorkStartForm";
import { CustomerCell } from "@/components/ui";
import { OUT, CARRY } from "@/components/stepColumns";

const columns = [
  { label: "Customer", cell: (r) => <CustomerCell row={r} /> },
  { label: "BP SC Number", cell: (r) => r.bpScNumber, mono: true },
  { label: "Village", cell: (r) => r.village },
  { label: "Product Code", cell: (r) => r.productCode },
  ...CARRY.paymentWorkStart,
];

export default function PaymentWorkStartPage() {
  return (
    <StepPage
      stepKey="paymentWorkStart"
      title="Payment Work Start"
      subtitle="After Site Survey · Start the payment process by confirming Cash or Loan, work status and corridor."
      columns={columns}
      historyColumns={OUT.paymentWorkStart}
      Form={PaymentWorkStartForm}
      modalTitle="Payment Work Start"
    />
  );
}
