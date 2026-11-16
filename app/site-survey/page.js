"use client";
import StepPage from "@/components/StepPage";
import SiteSurveyForm from "@/components/steps/SiteSurveyForm";
import { CustomerCell } from "@/components/ui";
import { OUT, CARRY } from "@/components/stepColumns";

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
      title="Site Survey"
      subtitle="Step 4 · Record the survey for cases that finished the login."
      columns={columns}
      historyColumns={OUT.siteSurvey}
      Form={SiteSurveyForm}
      modalTitle="Site Survey"
    />
  );
}
