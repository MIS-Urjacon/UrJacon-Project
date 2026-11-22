"use client";
import StepPage from "@/components/StepPage";
import DocumentReceiveForm from "@/components/steps/DocumentReceiveForm";
import { CustomerCell, Pill } from "@/components/ui";
import { Stack, money, OUT } from "@/components/stepColumns";

const columns = [
  { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
  { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
  { label: "Village / Branch", cell: (row) => <Stack top={row.village} bottom={row.branch} /> },
  { label: "Product / Amount", cell: (row) => <Stack top={row.productCode} bottom={money(row.dealAmount)} /> },
  { label: "Quotation / Payment", cell: (row) => <Stack top={row.quotationReference} bottom={row.preferredPaymentMode} /> },
  { label: "Dealer / Liaisoning", cell: (row) => <Stack top={row.dealer} bottom={row.liaisoning} /> },
  { label: "Route", cell: (row) => row.route },
  {
    label: "Issue Report",
    cell: (row) =>
      row.issue ? (
        // One compact line: the full description is in the Update popup (and in the tooltip here).
        <div className="max-w-48 leading-tight" title={`${row.issue.type} · ${row.issue.fromLabel}
${row.issue.description}
By ${row.issue.reportedBy}`}>
          <Pill color={row.issue.open ? "red" : "green"}>{row.issue.open ? "Issue open" : "Resolved"}</Pill>
          <div className="mt-1 truncate text-xs font-semibold text-slate-700">{row.issue.type} · {row.issue.fromLabel}</div>
        </div>
      ) : (
        "-"
      ),
  },
];

export default function DocumentReceivePage() {
  return (
    <StepPage
      stepKey="documentReceive"
      title="Document Receive"
      subtitle="Step 4 · Receive Aadhaar, PAN, Passbook and Bijli Bill, record the name on each, mark Tata or Non-Tata and any correction. Reported issues also come back here. Only proper documents move to Document Verification."
      columns={columns}
      historyColumns={OUT.documentReceive}
      Form={DocumentReceiveForm}
      modalTitle="Document Receive"
      modalWidth="max-w-5xl"
    />
  );
}
