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
      subtitle="Step 5 · Confirm Cash or Loan, the work status and the corridor for cases that finished the site survey."
      columns={columns}
      historyColumns={OUT.paymentWorkStart}
      Form={PaymentWorkStartForm}
      modalTitle="Payment Work Start"
    />
  );
}
