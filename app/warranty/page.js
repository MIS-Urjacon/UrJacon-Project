"use client";

import StepPage from "@/components/StepPage";
import WarrantyForm from "@/components/steps/WarrantyForm";
import { CustomerCell } from "@/components/ui";
import { OUT, CARRY, Stack } from "@/components/stepColumns";

const columns = [
  { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
  { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
  { label: "Village / Product", cell: (row) => <Stack top={row.village} bottom={row.productCode} /> },
  ...CARRY.warranty,
];

export default function WarrantyPage() {
  return (
    <StepPage
      stepKey="warranty"
      title="Warranty & Handover"
      subtitle="Closure · Step 31 · Clear the customer balance, complete the warranty by panel make and hand over the final document kit."
      columns={columns}
      historyColumns={OUT.warranty}
      Form={WarrantyForm}
      modalTitle="Warranty & Handover"
      modalWidth="max-w-4xl"
    />
  );
}
