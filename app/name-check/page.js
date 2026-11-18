"use client";
import StepPage from "@/components/StepPage";
import NameCheckForm from "@/components/steps/NameCheckForm";
import { CustomerCell, RoutePill } from "@/components/ui";
import { Stack, money, OUT, CARRY } from "@/components/stepColumns";

const columns = [
  { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
  { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
  { label: "Village / Branch", cell: (row) => <Stack top={row.village} bottom={row.branch} /> },
  { label: "Product / Amount", cell: (row) => <Stack top={row.productCode} bottom={money(row.dealAmount)} /> },
  { label: "Quotation / Payment", cell: (row) => <Stack top={row.quotationReference} bottom={row.preferredPaymentMode} /> },
  { label: "Dealer / Liaisoning", cell: (row) => <Stack top={row.dealer} bottom={row.liaisoning} /> },
  { label: "Route", cell: (row) => <RoutePill route={row.route} /> },
  ...CARRY.nameCheck,
];

export default function NameCheckPage() {
  return (
    <StepPage
      stepKey="nameCheck"
      title="Document Verification & Name Check"
      subtitle="Steps 4–6 · After documents are received, verify and save all four files, mark Tata or Non-Tata, and record any name, owner or PAN correction. Only verified cases move to Login PMSG."
      columns={columns}
      historyColumns={OUT.nameCheck}
      Form={NameCheckForm}
      modalTitle="Document Verification & Name Check"
      modalWidth="max-w-3xl"
    />
  );
}
