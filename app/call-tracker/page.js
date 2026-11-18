"use client";
import { useCallback } from "react";
import LeadPipelinePage from "@/components/leads/LeadPipelinePage";
import CallTrackerForm from "@/components/leads/CallTrackerForm";

export default function CallTrackerPage() {
  const filter = useCallback((row) => ["new", "contacted"].includes(row.leadStage), []);
  return <LeadPipelinePage title="Call Tracker" subtitle="Step 2 · Call or visit each lead. A callback stays here, Not Interested stops, and Send Quotation moves the lead to Quotation." filter={filter} Form={CallTrackerForm} modalTitle="Record call outcome" />;
}
