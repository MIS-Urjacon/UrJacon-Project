"use client";

import StepPage from "@/components/StepPage";
import ReferenceStepForm from "@/components/steps/ReferenceStepForm";
import BalanceClearanceForm from "@/components/steps/BalanceClearanceForm";
import { CustomerCell, Pill } from "@/components/ui";
import { CARRY, Stack } from "@/components/stepColumns";
import { HOLD_REASONS, PROCESS_CONFIG } from "@/lib/processConfig";

export default function ReferenceStepPage({ stepKey }) {
  const config = PROCESS_CONFIG[stepKey];
  const columns = [
    { label: "Customer", cell: (row) => <CustomerCell row={row} /> },
    { label: "BP SC Number", cell: (row) => row.bpScNumber, mono: true },
    { label: "State / Village", cell: (row) => <Stack top={row.state} bottom={row.village} /> },
    ...(CARRY[stepKey] ?? []),
  ];
  const historyColumns = [{
    label: "Result / Details",
    cell: (row) => {
      const entry = row.steps?.[stepKey];
      if (!entry) return "-";
      const first = config.fields.find((item) => entry[item.key] && item.type !== "files");
      return <div className="max-w-[240px] leading-tight"><Pill color={entry.status === "done" ? "green" : "red"}>{entry.status === "done" ? "Completed" : entry.holdCode || "On hold"}</Pill>{first && <div className="mt-1 text-xs text-slate-500">{first.label}: {entry[first.key]}</div>}{entry.holdCode && <div className="mt-1 text-xs text-rose-600">{HOLD_REASONS[entry.holdCode]}</div>}</div>;
    },
  }];
  const Form = stepKey === "balanceClearance" ? BalanceClearanceForm : ReferenceStepForm;
  return <StepPage stepKey={stepKey} title={config.title} subtitle={`${config.owner} · ${config.subtitle}`} columns={columns} historyColumns={historyColumns} Form={Form} modalTitle={config.title} modalWidth="max-w-3xl" />;
}
