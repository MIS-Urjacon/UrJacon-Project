"use client";
import StepPage from "@/components/StepPage";
import LoginForm from "@/components/steps/LoginForm";
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
      subtitle="Step 7 · Log in to PMSG with the consumer OTP only after document verification and any required correction are complete."
      columns={columns}
      historyColumns={OUT.login}
      Form={LoginForm}
      modalTitle="Login Check in PMSG"
    />
  );
}
