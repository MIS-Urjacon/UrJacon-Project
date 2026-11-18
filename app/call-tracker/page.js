"use client";
import { useCallback } from "react";
import LeadPipelinePage from "@/components/leads/LeadPipelinePage";
import CallTrackerForm from "@/components/leads/CallTrackerForm";

export default function CallTrackerPage() {
  // A lead with a sent quotation (or a ready packet) is back here for the customer's answer.
  const filter = useCallback((row) => ["new", "contacted", "documentsReady"].includes(row.leadStage) || (row.leadStage === "quotation" && row.quotationStatus === "sent"), []);
  return <LeadPipelinePage title="Call Tracker" subtitle="Step 2 · Call or visit each lead. Send Quotation moves the lead to Quotation; once the quotation is sent it returns here, where you confirm Document Given to go to Document Verification." filter={filter} Form={CallTrackerForm} modalTitle="Record call outcome" />;
}
