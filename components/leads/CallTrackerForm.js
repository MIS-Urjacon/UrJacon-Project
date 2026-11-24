"use client";

import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { History, MapPin } from "lucide-react";
import { Avatar, Pill } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import { visitHistory } from "@/lib/leadConstants";
import QuoteButton from "@/components/steps/QuoteButton";
import DocumentPacket, { validatePacket } from "@/components/leads/DocumentPacket";

const LEAD_TEMPERATURES = ["Interested", "Not Interested", "Follow up Required"];
// Document given sends the lead straight to Document Receive; quotations are made separately on the Quotation page.
const RESPONSES = ["Call back later", "Visit required", "Document given", "Not interested"];
const TEMPERATURE_COLOR = { Interested: "green", "Not Interested": "red", "Follow up Required": "amber" };

export default function CallTrackerForm({ row, onComplete, onCancel }) {
  // A lead waiting for a visit opens with Contact Type = Visit, ready to record how the visit went.
  const [contactType, setContactType] = useState(row.visitBy ? "Visit" : "Call");
  const [visitBy, setVisitBy] = useState("");
  const [staff, setStaff] = useState([]);
  const [response, setResponse] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState(row.nextFollowUp ?? "");
  const [temperature, setTemperature] = useState(LEAD_TEMPERATURES.includes(row.temperature) ? row.temperature : "");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const quotationSent = row.quotationStatus === "sent";
  const revision = Number(row.quotationRevision) > 0 ? ` (R${row.quotationRevision})` : "";
  const [packet, setPacket] = useState(() => ({ ...row, documents: { ...(row.documents ?? {}) } }));
  const [masters, setMasters] = useState({});
  const setField = (key, value) => setPacket((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    fetch("/api/staff").then((r) => (r.ok ? r.json() : [])).then(setStaff).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/masters").then((r) => r.ok ? r.json() : {}).then(setMasters).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (response === "Call back later" && !nextFollowUp) return setError("Choose the next call date and time");
    if (response === "Visit required" && !nextFollowUp) return setError("Choose the visit date and time");
    if (response === "Visit required" && !visitBy) return setError("Select who is going for the visit");
    if (response === "Not interested" && !remark.trim()) return setError("Record the reason the customer is not interested");
    const givesDocuments = response === "Document given";
    if (givesDocuments) {
      const packetError = validatePacket(packet);
      if (packetError) return setError(packetError);
    }
    setSaving(true);
    const action = response === "Not interested" ? "lost" : "save";
    const body = {
      ...row, ...(givesDocuments ? packet : {}), action, lostReason: action === "lost" ? remark : "",
      leadStage: givesDocuments ? "documentsReady" : "contacted",
      nextFollowUp: response === "Call back later" || response === "Visit required" ? nextFollowUp : "",
      // Not asked when the documents are given: the lead keeps its last temperature.
      temperature: givesDocuments ? (temperature || row.temperature || "") : temperature, outcome: response,
      visitBy: response === "Visit required" ? visitBy : "",
      followUp: { type: contactType, outcome: response, remark, ...(response === "Visit required" ? { visitBy } : {}) },
    };
    const apiResponse = await fetch(`/api/leads/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await apiResponse.json();
    if (!apiResponse.ok) { setSaving(false); return setError(result.error ?? "Could not update the call"); }
    if (givesDocuments) {
      const conversion = await fetch(`/api/leads/${row.id}/convert`, { method: "POST" });
      const converted = await conversion.json();
      setSaving(false);
      if (!conversion.ok) return setError(converted.error ?? "Could not send the record to Document Verification");
      return onComplete(`${row.id} confirmed. Case ${converted.case.id} is now in Document Receive.`);
    }
    setSaving(false);
    onComplete(action === "lost" ? `${row.id} marked as lost.` : `Follow-up saved for ${row.id}.`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-brand-50 via-white to-sky-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.customerName} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-900">{row.customerName}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">Lead ID: {row.id} · Created <InlineDate value={row.timestamp} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {row.temperature && <Pill color={TEMPERATURE_COLOR[row.temperature]}>{row.temperature}</Pill>}
            {/* Quotation status (read only): once sent, the icon opens the quotation. */}
            {quotationSent ? <Pill color="green">Quotation sent{revision}</Pill> : <Pill color="gray">Quotation not sent</Pill>}
            {quotationSent && <QuoteButton iconOnly row={row} title={revision ? `Latest Quotation${revision}` : "Quotation sent"} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-slate-100 px-5 py-3 text-sm">
          <Item label="BP SC Number" value={row.bpScNumber} mono />
          <Item label="System" value={row.kwWanted ? `${row.kwWanted} kW` : ""} />
          <Item label="Next Follow-up" value={row.nextFollowUp ? <InlineDate value={row.nextFollowUp} /> : ""} />
          <Item label="Quotation" value={quotationSent ? <>Sent{revision}{row.quotationSentAt ? <> · <InlineDate value={row.quotationSentAt} /></> : null}</> : "Not sent"} />
          <Item label="Last Outcome" value={row.outcome || "No interaction yet"} />
          {row.visitBy && <Item label="Visit By" value={row.visitBy} />}
        </div>
        {row.followUps?.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-dark"><History size={12} />Interaction history ({row.followUps.length})</div>
            <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {[...row.followUps].reverse().map((item, index) => (
                <li key={`${item.at}-${index}`} className="flex items-baseline gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-brand" />
                  <span className="font-semibold text-slate-700">{item.type}{item.outcome ? ` · ${item.outcome}` : ""}{item.visitBy ? ` · Visit by ${item.visitBy}` : ""}</span>
                  <span className="text-slate-400">{item.by ? `${item.by} · ` : ""}<InlineDate value={item.at} /></span>
                  {item.remark && <span className="min-w-0 truncate" title={item.remark}>{item.remark}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {visitHistory(row).length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-dark"><MapPin size={12} />Visit history ({visitHistory(row).length})</div>
            <div className="max-h-44 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-3 py-2">#</th><th className="px-3 py-2">Visit By</th><th className="px-3 py-2">Planned For</th><th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Result</th></tr></thead>
                <tbody>
                  {[...visitHistory(row)].reverse().map((visit, index, all) => (
                    <tr key={`${visit.assignedAt}-${index}`} className="border-t border-slate-100 text-slate-600">
                      <td className="px-3 py-2 text-slate-400">{all.length - index}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{visit.visitBy}</td>
                      <td className="px-3 py-2"><InlineDate value={visit.plannedFor} /></td>
                      <td className="px-3 py-2">{visit.assignedBy ? `${visit.assignedBy} · ` : ""}<InlineDate value={visit.assignedAt} /></td>
                      <td className="px-3 py-2">{visit.result ? <span title={visit.resultRemark}><span className="font-semibold text-slate-700">{visit.result}</span>{visit.resultRemark ? ` · ${visit.resultRemark}` : ""}</span> : <span className="font-semibold text-amber-700">Pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {row.issue?.open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="font-semibold">Issue reported from {row.issue.fromLabel}: {row.issue.type}</div>
          <div className="mt-1">{row.issue.description}</div>
          <div className="mt-1 text-xs text-rose-600">By {row.issue.reportedBy} · Recording this call clears the issue.</div>
        </div>
      )}

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <legend className="px-2 text-sm font-bold text-slate-800">Record new interaction</legend>
        <p className="mb-5 text-sm text-slate-500">Select how the customer was contacted and record the final response from this interaction.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Contact Type" value={contactType} options={["Call", "Visit", "WhatsApp"]} onChange={setContactType} />
          <Select label="Customer Response" required value={response} options={RESPONSES} onChange={setResponse} />
          {response !== "Document given" && <Select label="Lead Temperature" required value={temperature} options={LEAD_TEMPERATURES} onChange={setTemperature} />}
          {response === "Visit required" && <Select label="Visit By (who is going)" required value={visitBy} options={staff.map((person) => person.name)} onChange={setVisitBy} />}
          {(response === "Call back later" || response === "Visit required") && <Field label={response === "Visit required" ? "Visit Date & Time" : "Next Call Date & Time"} required type="datetime-local" value={nextFollowUp} onChange={setNextFollowUp} />}
          <TextArea className={response === "Call back later" || response === "Visit required" ? "sm:col-span-1 lg:col-span-2" : "sm:col-span-2 lg:col-span-3"} label={response === "Not interested" ? "Lost Reason" : "Conversation Remark"} required={response === "Not interested"} value={remark} onChange={setRemark} />
        </div>
      </fieldset>

      {response === "Document given" && <DocumentPacket form={packet} setForm={setPacket} set={setField} masters={masters} />}

      <FormActions onCancel={onCancel} saving={saving} error={error} submitLabel={response === "Document given" ? "Send to Document Receive" : "Save call outcome"} />
    </form>
  );
}

function Item({ label, value, mono }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`font-semibold text-slate-800 ${mono ? "font-mono text-[13px]" : ""}`}>{value || <span className="font-normal text-slate-300">-</span>}</span>
    </div>
  );
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
