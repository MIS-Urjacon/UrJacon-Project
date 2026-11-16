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
// The sheet calls the remark column "Working Remarks" for some steps.
const FORMS = {
  assignInstaller: makeSimpleForm({
    stepKey: "assignInstaller",
    extra: EXTRA_FIELDS.assignInstaller,
    remarkLabel: "Working Remarks",
  }),
  inspectionFile: makeSimpleForm({ stepKey: "inspectionFile" }),
  meterInspection: makeSimpleForm({ stepKey: "meterInspection", remarkLabel: "Working Remarks" }),
  generationWifi: makeSimpleForm({ stepKey: "generationWifi", remarkLabel: "Working Remarks" }),
  tariffCheck: makeSimpleForm({ stepKey: "tariffCheck" }),
};

// One page of the Installation process (after Dispatch). Each route file just names its step.
export default function InstallStepPage({ stepKey, title, subtitle }) {
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
