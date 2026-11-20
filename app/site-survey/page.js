"use client";
import StepPage from "@/components/StepPage";
import SiteSurveyForm from "@/components/steps/SiteSurveyForm";
import { CustomerCell } from "@/components/ui";
import { OUT, CARRY } from "@/components/stepColumns";
import { surveyOpen } from "@/lib/workflow";

const columns = [
  { label: "BP SC Number", cell: (r) => r.bpScNumber, mono: true },
  { label: "Customer Name", cell: (r) => <CustomerCell row={r} /> },
  { label: "Village", cell: (r) => r.village },
  { label: "Product Code", cell: (r) => r.productCode },
  ...CARRY.siteSurvey,
];

export default function SiteSurveyPage() {
  return (
    <StepPage
      stepKey="siteSurvey"
      title="Survey List"
      subtitle="Step 8 · Opens as soon as Login PMSG is done and runs alongside Payment Work Start. It must be completed before Dispatch; the survey report is the material list used at Dispatch."
      columns={columns}
      historyColumns={OUT.siteSurvey}
      Form={SiteSurveyForm}
      modalTitle="Survey List"
      isPending={surveyOpen}
    />
  );
}
