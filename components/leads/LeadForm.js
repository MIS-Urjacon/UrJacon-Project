"use client";

import { useEffect, useState } from "react";
import { DateCell } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";

const SOURCES = ["CSEB / Bought Data", "Field Visit", "Agent", "Office Connection / Referral"];
const DOCS = [
  ["aadhaar", "Aadhaar Card"],
  ["pan", "PAN Card"],
  ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill"],
  ["terracePhoto", "Terrace Geotag Photo"],
];

const EMPTY = {
  customerName: "",
  mobile: "",
  village: "",
  address: "",
  bpScNumber: "",
  source: "",
  agent: "",
  monthlyBill: "",
  kwWanted: "",
  productCode: "",
  paymentMode: "",
  temperature: "Warm",
  nextFollowUp: "",
  outcome: "",
  quotationReference: "",
  commission: "",
  branch: "",
  dealer: "",
  liaisoning: "",
  route: "",
  dealAmount: "",
  leadStage: "new",
  documents: Object.fromEntries(DOCS.map(([key]) => [key, false])),
};

function initialValue(lead) {
  if (!lead) return EMPTY;
  return {
    ...EMPTY,
    ...lead,
    documents: { ...EMPTY.documents, ...(lead.documents ?? {}) },
  };
}

export default function LeadForm({ lead, readOnly = false, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialValue(lead));
  const [action, setAction] = useState(lead?.status === "lost" ? "reopen" : "save");
  const [lostReason, setLostReason] = useState(lead?.lostReason ?? "");
  const [followUp, setFollowUp] = useState({ type: "Call", outcome: "", remark: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [masters, setMasters] = useState({});

  useEffect(() => {
    let active = true;
    fetch("/api/masters")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => { if (active) setMasters(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const message = await onSubmit({ ...form, action, lostReason, followUp });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Customer and source
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer Name" required value={form.customerName} onChange={(v) => set("customerName", v)} />
          <Field label="Mobile Number" required type="tel" value={form.mobile} onChange={(v) => set("mobile", v)} />
          <Select label="Lead Source" required value={form.source} options={SOURCES} onChange={(v) => set("source", v)} />
          <Field label="Village" value={form.village} onChange={(v) => set("village", v)} />
          <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
          <Field label="Agent / Field Staff" value={form.agent} onChange={(v) => set("agent", v)} />
        </div>
      </fieldset>

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Requirement and quotation
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Monthly Bill" type="number" value={form.monthlyBill} onChange={(v) => set("monthlyBill", v)} />
          <Field label="Required System (kW)" type="number" step="0.1" value={form.kwWanted} onChange={(v) => set("kwWanted", v)} />
          <Field label="Product Code" value={form.productCode} suggestions={masters.productCode} onChange={(v) => set("productCode", v)} />
          <Select label="Expected Payment Mode" value={form.paymentMode} options={["Cash", "Loan"]} onChange={(v) => set("paymentMode", v)} />
          <Field label="Deal Amount" type="number" value={form.dealAmount} onChange={(v) => set("dealAmount", v)} />
          <Field label="Quotation Reference" value={form.quotationReference} onChange={(v) => set("quotationReference", v)} />
          <Field label="Agent Commission" type="number" value={form.commission} onChange={(v) => set("commission", v)} />
          <Select label="Lead Temperature" required value={form.temperature} options={["Hot", "Warm", "Cold"]} onChange={(v) => set("temperature", v)} />
          <Select
            label="Lead Stage"
            value={form.leadStage}
            options={[
              ["new", "New lead"],
              ["contacted", "Contacted"],
              ["quotation", "Quotation sent"],
              ["documentsReady", "Documents ready"],
            ]}
            onChange={(v) => set("leadStage", v)}
          />
        </div>
      </fieldset>

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Follow-up
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Next Follow-up" type="datetime-local" value={form.nextFollowUp} onChange={(v) => set("nextFollowUp", v)} />
          <Field label="Latest Outcome" value={form.outcome} onChange={(v) => set("outcome", v)} />
          {lead && <Select label="Contact Type" value={followUp.type} options={["Call", "Visit", "WhatsApp"]} onChange={(v) => setFollowUp({ ...followUp, type: v })} />}
          {lead && <Field label="Follow-up Outcome" value={followUp.outcome} onChange={(v) => setFollowUp({ ...followUp, outcome: v })} />}
          {lead && <Field label="Follow-up Remark" value={followUp.remark} onChange={(v) => setFollowUp({ ...followUp, remark: v })} />}
        </div>
      </fieldset>

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Document packet and process handover
        </legend>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map(([key, label], index) => (
              <label key={key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]"
                  checked={form.documents[key]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      documents: { ...form.documents, [key]: event.target.checked },
                    })
                  }
                />
                {label}{index < 4 && <span className="text-rose-500">*</span>}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            The first four documents and BP SC Number are compulsory before a lead can enter the process.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="BP SC Number" value={form.bpScNumber} onChange={(v) => set("bpScNumber", v)} />
          <Field label="Branch" value={form.branch} suggestions={masters.branch} onChange={(v) => set("branch", v)} />
          <Field label="Dealer" value={form.dealer} suggestions={masters.dealer} onChange={(v) => set("dealer", v)} />
          <Field label="Liaisoning" value={form.liaisoning} suggestions={masters.liaisoning} onChange={(v) => set("liaisoning", v)} />
          <Field label="Route" value={form.route} onChange={(v) => set("route", v)} />
        </div>
      </fieldset>

      {lead && !readOnly && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lead decision
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Action"
              value={action}
              options={lead.status === "lost"
                ? [["reopen", "Reopen lead"]]
                : [["save", "Keep active"], ["lost", "Mark as lost"], ["convert", "Confirmed - start process"]]}
              onChange={setAction}
            />
            {action === "lost" && (
              <Field label="Lost Reason" required value={lostReason} onChange={setLostReason} />
            )}
          </div>
          {action === "convert" && (
            <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-dark">
              Confirmation creates a case in Name Check. The Cash/Loan choice remains editable at Payment Work Start.
            </div>
          )}
        </fieldset>
      )}

      {lead?.followUps?.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Follow-up history
          </legend>
          <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {[...lead.followUps].reverse().map((item, index) => (
              <div key={`${item.at}-${index}`} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[120px_1fr_1fr]">
                <DateCell value={item.at} />
                <div><span className="font-semibold text-slate-700">{item.type}</span> · {item.outcome || "No outcome"}</div>
                <div className="text-slate-500">{item.remark || "-"} <span className="text-xs text-slate-400">({item.by})</span></div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={error}
        submitLabel={!lead ? "Add lead" : action === "convert" ? "Confirm and start process" : action === "lost" ? "Mark lost" : action === "reopen" ? "Reopen lead" : "Save lead"}
      />
    </form>
  );
}

function Field({ label, required, type = "text", value, onChange, step, suggestions = [] }) {
  const listId = suggestions.length ? `lead-${label.toLowerCase().replaceAll(" ", "-")}` : undefined;
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      <input
        className="field"
        type={type}
        min={type === "number" ? 0 : undefined}
        step={step}
        required={required}
        list={listId}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {listId && <datalist id={listId}>{suggestions.map((option) => <option key={option} value={option} />)}</datalist>}
    </label>
  );
}

function Select({ label, required, value, options, onChange }) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      <select className="field" required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => {
          const [valueOption, labelOption] = Array.isArray(option) ? option : [option, option];
          return <option key={valueOption} value={valueOption}>{labelOption}</option>;
        })}
      </select>
    </label>
  );
}
