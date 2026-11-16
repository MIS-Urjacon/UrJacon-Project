"use client";
import StepPage from "@/components/StepPage";
import { makeSimpleForm } from "@/components/steps/SimpleStepForm";
import PaymentReceivedForm from "@/components/steps/PaymentReceivedForm";
import { CustomerCell } from "@/components/ui";
import { EXTRA_FIELDS } from "@/lib/loanFields";
import { OUT, CARRY } from "@/components/stepColumns";

const baseColumns = [
  { label: "Customer", cell: (r) => <CustomerCell row={r} /> },
  { label: "BP SC Number", cell: (r) => r.bpScNumber, mono: true },
  { label: "Village", cell: (r) => r.village },
  { label: "Product Code", cell: (r) => r.productCode },
];

// Build each form once (module level) so its identity stays stable across renders.
const FORMS = {
  cashAskPayment: makeSimpleForm({ stepKey: "cashAskPayment" }),
  cashPaymentReceived: PaymentReceivedForm,
  cashApproval: makeSimpleForm({ stepKey: "cashApproval", extra: EXTRA_FIELDS.cashApproval }),
  cashDispatch: makeSimpleForm({ stepKey: "cashDispatch" }),
};

// One page of the Cash process. Each route file just names its step.
// Same table rules as every step: see components/stepColumns.js (OUT / CARRY).
export default function CashStepPage({ stepKey, title, subtitle }) {
  return (
    <StepPage
      stepKey={stepKey}
      title={title}
      subtitle={subtitle}
      columns={[...baseColumns, ...CARRY[stepKey]]}
      historyColumns={OUT[stepKey]}
      Form={FORMS[stepKey]}
      modalTitle={title}
    />
  );
}
