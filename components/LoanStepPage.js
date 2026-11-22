"use client";
import StepPage from "@/components/StepPage";
import { makeSimpleForm } from "@/components/steps/SimpleStepForm";
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
  bankFileReady: makeSimpleForm({ stepKey: "bankFileReady", extra: EXTRA_FIELDS.bankFileReady }),
  loanIssue: makeSimpleForm({ stepKey: "loanIssue" }),
  fileSubmission: makeSimpleForm({ stepKey: "fileSubmission", extra: EXTRA_FIELDS.fileSubmission, noRemark: true }),
  firstInstallment: makeSimpleForm({ stepKey: "firstInstallment", withAmount: true, amountLabel: "Bank 70% Amount Received (₹)" }),
  receiveDp: makeSimpleForm({ stepKey: "receiveDp", withAmount: true, amountLabel: "Down Payment Received (₹)" }),
  dispatch: makeSimpleForm({ stepKey: "dispatch" }),
};

// One page of the Loan process. Each route file just names its step.
// Pending and History show earlier steps' important data (CARRY); History also
// shows this step's own submitted data (OUT). See components/stepColumns.js.
export default function LoanStepPage({ stepKey, title, subtitle }) {
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
