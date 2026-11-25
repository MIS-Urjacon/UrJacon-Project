"use client";

import StepPage from "@/components/StepPage";
import ReferenceStepForm from "@/components/steps/ReferenceStepForm";
import BalanceClearanceForm from "@/components/steps/BalanceClearanceForm";
import { CustomerCell, Pill } from "@/components/ui";
import { CARRY, OUT, Stack } from "@/components/stepColumns";
import { HOLD_REASONS, PROCESS_CONFIG } from "@/lib/processConfig";

export default function ReferenceStepPage({ stepKey }) {
  const config = PROCESS_CONFIG[stepKey];
  const columns = [
    { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
    { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
    { label: "State / Village", cell: (row) => <Stack top={row.state} bottom={row.village} /> },
    ...(CARRY[stepKey] ?? []),
  ];
  // History: the result (done / hold reason / who submitted) plus every field the popup saved (OUT, built from the step config in stepColumns.js).
  const historyColumns = [
    {
      label: "Result",
      cell: (row) => {
        const entry = row.steps?.[stepKey];
        if (!entry) return "-";
        return (
          <div className="max-w-[240px] whitespace-normal leading-tight">
            <Pill color={entry.status === "done" ? "green" : "red"}>{entry.status === "done" ? "Completed" : entry.holdCode || "On hold"}</Pill>
            {entry.holdCode && <div className="mt-1 text-xs text-rose-600">{entry.holdCode} · {HOLD_REASONS[entry.holdCode]}</div>}
            {entry.submittedBy && <div className="mt-1 text-[11px] text-slate-400">By {entry.submittedBy}</div>}
          </div>
        );
      },
    },
    ...(OUT[stepKey] ?? []),
  ];
  const Form = stepKey === "balanceClearance" ? BalanceClearanceForm : ReferenceStepForm;
  return <StepPage stepKey={stepKey} title={config.title} subtitle={`${config.owner} · ${config.subtitle}`} columns={columns} historyColumns={historyColumns} Form={Form} modalTitle={config.title} modalWidth="max-w-3xl" />;
}
