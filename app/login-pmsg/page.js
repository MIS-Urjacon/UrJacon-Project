"use client";
import StepPage from "@/components/StepPage";
import LoginForm from "@/components/steps/LoginForm";
import LoginMisTab from "@/components/steps/LoginMisTab";
import { CustomerCell } from "@/components/ui";
import { Stack, OUT, CARRY } from "@/components/stepColumns";

const columns = [
  { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
  { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
  { label: "Village", cell: (row) => row.village },
  { label: "Product Code", cell: (row) => row.productCode },
  { label: "Branch / Route", cell: (row) => <Stack top={row.branch} bottom={row.route} /> },
  ...CARRY.login,
];

export default function LoginPmsgPage() {
  return (
    <StepPage
      stepKey="login"
      title="Login PMSG"
      subtitle="Step 7 · Log in to PMSG with the consumer OTP after document verification. Submit sends the case to the Agreement; if the document needs it, use Name Correction or Owner Change first (the Agreement follows)."
      columns={columns}
      historyColumns={OUT.login}
      Form={LoginForm}
      modalTitle="Login Check in PMSG"
      extraTab={{ key: "mis", label: "Upload MIS", Component: LoginMisTab }}
    />
  );
}
