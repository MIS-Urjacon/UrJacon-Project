"use client";
import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import { FormActions, Label } from "./shared";
import { MapPin } from "lucide-react";
import { defaultInverter, defaultPanelCount, DEFAULT_PANEL_WP } from "@/lib/quotationFormat";

export default function SiteSurveyForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.siteSurvey;
  const [f, setF] = useState({
    customerName: prev?.customerName ?? row.customerName ?? "",
    contactNumber: prev?.contactNumber ?? row.mobile ?? "",
    village: prev?.village ?? row.village ?? "",
    surveyDate: prev?.surveyDate ?? "",
    surveyorName: prev?.surveyorName ?? "",
    smartMeterPresent: prev?.smartMeterPresent ?? "",
    materialNeeded: prev?.materialNeeded ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [staff, setStaff] = useState([]); // employees for the Surveyor dropdown
  useEffect(() => {
    fetch("/api/staff").then((r) => (r.ok ? r.json() : [])).then((list) => setStaff(list.map((person) => person.name))).catch(() => {});
  }, []);
  const surveyors = f.surveyorName && !staff.includes(f.surveyorName) ? [...staff, f.surveyorName] : staff;
  const today = new Date().toISOString().slice(0, 10);
  const set = (k, v) => setF({ ...f, [k]: v });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const msg = await onSubmit(f);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <CaseSummary row={row} />
      <ImportantDetails row={row} />

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Customer details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>Customer Name</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              placeholder="Customer Name"
              value={f.customerName}
              onChange={(e) => set("customerName", e.target.value)}
            />
          </label>
          <label className="block"><Label required>Smart Meter Present?</Label><DropSelect className="field" required disabled={readOnly} value={f.smartMeterPresent} onChange={(e) => set("smartMeterPresent", e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></DropSelect></label>
          <label className="block sm:col-span-2"><Label required>Material Needed / Survey Report</Label><textarea rows={3} className="field !h-auto py-2.5" required disabled={readOnly} value={f.materialNeeded} onChange={(e) => set("materialNeeded", e.target.value)} /></label>
          <label className="block">
            <Label required>Contact Number</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              inputMode="numeric"
              maxLength={10}
              pattern="\d{10}"
              title="10 digit mobile number"
              placeholder="10 digit mobile number"
              value={f.contactNumber}
              onChange={(e) => set("contactNumber", e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="block sm:col-span-2">
            <Label required>Village (address)</Label>
            <input
              className="field"
              required
              disabled={readOnly}
              placeholder="Village / address"
              value={f.village}
              onChange={(e) => set("village", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Survey details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>Survey Date</Label>
            <input
              type="date"
              className="field"
              required
              max={today}
              disabled={readOnly}
              value={f.surveyDate}
              onChange={(e) => set("surveyDate", e.target.value)}
            />
          </label>
          <label className="block">
            <Label required>Surveyor Name</Label>
            <DropSelect className="field" required disabled={readOnly} value={f.surveyorName} onChange={(e) => set("surveyorName", e.target.value)}>
              <option value="">Select surveyor</option>
              {surveyors.map((name) => <option key={name}>{name}</option>)}
            </DropSelect>
          </label>
        </div>
      </fieldset>

      <FormActions
        readOnly={readOnly}
        onCancel={onCancel}
        saving={saving}
        error={err}
        submitLabel="Submit"
      />
    </form>
  );
}

const money = (value) => (Number(value) > 0 ? `₹${Number(value).toLocaleString("en-IN")}` : "");

// Only what the surveyor needs from earlier steps; empty items are left out.
function ImportantDetails({ row }) {
  const kw = Number(row.kwWanted) || 0;
  const wp = Number(row.quotationPanelWp) || DEFAULT_PANEL_WP;
  const panels = Number(row.quotationPanelCount) || defaultPanelCount(kw, wp);
  const login = row.steps?.login;
  const place = [row.address || row.village, row.state].filter(Boolean).join(", ");
  const items = [
    ["Mobile", row.mobile],
    ["Address", place],
    ["Branch / Route", [row.branch, row.route].filter(Boolean).join(" / ")],
    ["System", kw ? [`${kw} kW`, row.quotationGridType, row.quotationDcrType].filter(Boolean).join(" · ") : ""],
    ["Panels", panels ? `${panels} × ${wp} Wp${row.quotationPanelBrand ? ` ${row.quotationPanelBrand}` : ""}` : ""],
    ["Inverter", row.quotationInverter || defaultInverter(kw, row.quotationGridType)],
    ["Payment Mode", row.steps?.paymentWorkStart?.cashOrLoan || row.steps?.documentReceive?.paymentMode || row.preferredPaymentMode],
    ["System Price", money(row.dealAmount)],
    ["PMSG Application No.", login?.applicationNo],
    ["Quotation", row.quotationReference],
  ].filter(([, value]) => value);
  const hasLocation = row.latitude != null && row.longitude != null;
  if (!items.length && !hasLocation) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Important details</div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800" title={value}>{value}</div>
          </div>
        ))}
        {hasLocation && (
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Customer Location</div>
            <a href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline">
              <MapPin size={14} /> Open in Maps
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
