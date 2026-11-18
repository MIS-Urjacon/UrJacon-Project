"use client";

import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { CalendarClock, History, IndianRupee, Mail, MapPin, Phone, UserRound, Zap } from "lucide-react";
import { Avatar, DateCell, Pill } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import { LEAD_STAGE_LABEL } from "@/lib/leadConstants";
import QuotationSummary from "@/components/leads/QuotationSummary";
import DocumentPacket, { validatePacket } from "@/components/leads/DocumentPacket";

const RESPONSES = ["Call back later", "Send quotation", "Not interested"];
// Once the quotation is sent, the customer's answer is recorded here.
const QUOTED_RESPONSES = ["Call back later", "Document given", "Not interested"];
const TEMPERATURE_COLOR = { Hot: "red", Warm: "amber", Cold: "blue" };

export default function CallTrackerForm({ row, onComplete, onCancel }) {
  const [contactType, setContactType] = useState("Call");
  const [response, setResponse] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState(row.nextFollowUp ?? "");
  const [temperature, setTemperature] = useState(row.temperature ?? "Warm");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const quoted = row.quotationStatus === "sent";
  const [packet, setPacket] = useState(() => ({ ...row, documents: { ...(row.documents ?? {}) } }));
  const [masters, setMasters] = useState({});
  const setField = (key, value) => setPacket((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (quoted) fetch("/api/masters").then((r) => r.ok ? r.json() : {}).then(setMasters).catch(() => {});
  }, [quoted]);

  async function submit(event) {
    event.preventDefault();
    if (response === "Call back later" && !nextFollowUp) return setError("Choose the next call date and time");
    if (response === "Not interested" && !remark.trim()) return setError("Record the reason the customer is not interested");
    const givesDocuments = response === "Document given";
    if (givesDocuments) {
      const packetError = validatePacket(packet);
      if (packetError) return setError(packetError);
    }
    setSaving(true);
    const movesToQuotation = response === "Send quotation";
    const action = response === "Not interested" ? "lost" : "save";
    const body = {
      ...row, ...(givesDocuments ? packet : {}), action, lostReason: action === "lost" ? remark : "",
      leadStage: movesToQuotation ? "quotation" : givesDocuments ? "documentsReady" : "contacted",
      nextFollowUp: response === "Call back later" ? nextFollowUp : "",
      temperature, outcome: response,
      followUp: { type: contactType, outcome: response, remark },
    };
    const apiResponse = await fetch(`/api/leads/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await apiResponse.json();
    if (!apiResponse.ok) { setSaving(false); return setError(result.error ?? "Could not update the call"); }
    if (givesDocuments) {
      const conversion = await fetch(`/api/leads/${row.id}/convert`, { method: "POST" });
      const converted = await conversion.json();
      setSaving(false);
      if (!conversion.ok) return setError(converted.error ?? "Could not send the record to Document Verification");
      return onComplete(`${row.id} confirmed. Case ${converted.case.id} is now in Document Verification.`);
    }
    setSaving(false);
    onComplete(action === "lost" ? `${row.id} marked as lost.` : movesToQuotation ? `${row.id} sent to Quotation.` : `Follow-up saved for ${row.id}.`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-brand-50 via-white to-sky-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.customerName} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-900">{row.customerName}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">Lead ID: {row.id} · Created <InlineDate value={row.timestamp} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill color={TEMPERATURE_COLOR[row.temperature]}>{row.temperature || "Warm"}</Pill>
            <Pill color="blue">{LEAD_STAGE_LABEL[row.leadStage] ?? "Open lead"}</Pill>
          </div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <Detail icon={Phone} label="Mobile" value={row.mobile} href={row.mobile ? `tel:${row.mobile}` : undefined} />
          <Detail icon={Mail} label="Email" value={row.email} href={row.email ? `mailto:${row.email}` : undefined} />
          <Detail icon={MapPin} label="Location" value={[row.village, row.state].filter(Boolean).join(", ")} sub={row.address} />
          <Detail icon={UserRound} label="Source / Owner" value={row.source} sub={row.agent} />
          <Detail icon={Zap} label="Requirement" value={row.kwWanted ? `${row.kwWanted} kW` : "Not decided"} sub={row.productCode || row.paymentMode} />
          <Detail icon={IndianRupee} label="Monthly Bill" value={row.monthlyBill ? `₹${Number(row.monthlyBill).toLocaleString("en-IN")}` : "Not provided"} />
          <Detail icon={CalendarClock} label="Next Follow-up" value={<DateCell value={row.nextFollowUp} />} />
          <Detail icon={History} label="Last Outcome" value={row.outcome || "No interaction yet"} sub={`${row.followUps?.length ?? 0} interaction${row.followUps?.length === 1 ? "" : "s"} recorded`} />
        </div>
      </section>

      {quoted && <QuotationSummary quotation={row} title={Number(row.quotationRevision) > 0 ? `Latest Quotation (R${row.quotationRevision})` : "Quotation sent"} />}

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <legend className="px-2 text-sm font-bold text-slate-800">Record new interaction</legend>
        <p className="mb-5 text-sm text-slate-500">Select how the customer was contacted and record the final response from this interaction.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Contact Type" value={contactType} options={["Call", "Visit", "WhatsApp"]} onChange={setContactType} />
          <Select label="Customer Response" required value={response} options={quoted ? QUOTED_RESPONSES : RESPONSES} onChange={setResponse} />
          <Select label="Lead Temperature" required value={temperature} options={["Hot", "Warm", "Cold"]} onChange={setTemperature} />
          {response === "Call back later" && <Field label="Next Call Date & Time" required type="datetime-local" value={nextFollowUp} onChange={setNextFollowUp} />}
          <TextArea className={response === "Call back later" ? "sm:col-span-1 lg:col-span-2" : "sm:col-span-2 lg:col-span-3"} label={response === "Not interested" ? "Lost Reason" : "Conversation Remark"} required={response === "Not interested"} value={remark} onChange={setRemark} />
        </div>
      </fieldset>

      {response === "Document given" && <DocumentPacket form={packet} setForm={setPacket} set={setField} masters={masters} />}

      <FormActions onCancel={onCancel} saving={saving} error={error} submitLabel={response === "Document given" ? "Send to Document Verification" : "Save call outcome"} />
    </form>
  );
}

function Detail({ icon: Icon, label, value, sub, href }) {
  const content = typeof value === "string" && href ? <a className="hover:text-brand-dark hover:underline" href={href}>{value}</a> : value;
  return <div className="min-h-24 bg-white p-4"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Icon size={13} />{label}</div><div className="mt-2 break-words text-sm font-semibold text-slate-800">{content || "-"}</div>{sub && <div className="mt-1 break-words text-xs text-slate-500">{sub}</div>}</div>;
}

function InlineDate({ value }) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, required, type = "text", value, onChange }) {
  return <label className="block"><Label required={required}>{label}</Label><input className="field bg-white" type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextArea({ className = "", label, required, value, onChange }) {
  return <label className={`block ${className}`}><Label required={required}>{label}</Label><textarea className="field min-h-24 resize-y bg-white" required={required} value={value} placeholder="Write the important points discussed with the customer..." onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, required, value, options, onChange }) {
  return <label className="block"><Label required={required}>{label}</Label><DropSelect className="field bg-white" required={required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</DropSelect></label>;
}
