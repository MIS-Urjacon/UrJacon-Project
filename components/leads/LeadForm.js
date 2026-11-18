"use client";

import { useState } from "react";
import DropSelect from "@/components/Select";
import { LocateFixed } from "lucide-react";
import { FormActions, Label } from "@/components/steps/shared";
import { useMe } from "@/lib/useMe";

const SOURCES = ["CSEB / Bought Data", "Field Visit", "Agent", "Office Connection / Referral"];
const EMPTY = {
  customerName: "", mobile: "", email: "", village: "", address: "", state: "", latitude: null, longitude: null,
  locationAccuracy: null, locationCapturedAt: "", bpScNumber: "", source: "", agent: "",
  monthlyBill: "", kwWanted: "", productCode: "", paymentMode: "", temperature: "Warm",
  nextFollowUp: "", outcome: "", quotationReference: "", commission: "", branch: "", dealer: "",
  liaisoning: "", route: "", dealAmount: "", leadStage: "new",
  documents: { aadhaar: false, pan: false, passbook: false, bill: false, terracePhoto: false },
};

function initialValue(lead) {
  return lead ? { ...EMPTY, ...lead, documents: { ...EMPTY.documents, ...(lead.documents ?? {}) } } : EMPTY;
}

export default function LeadForm({ lead, readOnly = false, onSubmit, onCancel }) {
  const me = useMe();
  const [form, setForm] = useState(() => initialValue(lead));
  const [action, setAction] = useState(lead?.status === "lost" ? "reopen" : "save");
  const [lostReason, setLostReason] = useState(lead?.lostReason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function captureLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Live location is not supported on this device or browser");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: Number(coords.latitude.toFixed(7)),
          longitude: Number(coords.longitude.toFixed(7)),
          locationAccuracy: Math.round(coords.accuracy),
          locationCapturedAt: new Date().toISOString(),
        }));
        setLocationLoading(false);
      },
      (locationFailure) => {
        setLocationError(locationFailure.code === 1
          ? "Location permission was denied"
          : "Current location could not be captured. Please try again");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const message = await onSubmit({ ...form, action, lostReason });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Customer and source</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer Name" required value={form.customerName} onChange={(v) => set("customerName", v)} />
          <Field label="Mobile Number" required type="tel" value={form.mobile} onChange={(v) => set("mobile", v)} />
          <Field label="Email ID" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Select label="Lead Source" required value={form.source} options={SOURCES} onChange={(v) => set("source", v)} />
          <Select label="State" required value={form.state} options={["Chhattisgarh", "Odisha"]} onChange={(v) => set("state", v)} />
          <Field label="Village" value={form.village} onChange={(v) => set("village", v)} />
          <label className="block">
            <Label>Live Location</Label>
            <button type="button" disabled={readOnly || locationLoading} onClick={captureLocation} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand px-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60">
              <LocateFixed size={16} />
              {locationLoading ? "Capturing..." : form.latitude != null && form.longitude != null ? "Capture Again" : "Capture Live Location"}
            </button>
            {form.latitude != null && form.longitude != null && <div className="mt-1.5 text-xs text-slate-500">{form.latitude}, {form.longitude}{form.locationAccuracy ? ` · ±${form.locationAccuracy} m` : ""}</div>}
            {locationError && <div className="mt-1.5 text-xs font-medium text-rose-600">{locationError}</div>}
          </label>
          <label className="block">
            <Label>Agent / Field Staff</Label>
            <div className="flex min-h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              {lead?.agent || me?.name || "Signed-in user"}
            </div>
            <div className="mt-1.5 text-xs text-slate-500">Automatically saved from the signed-in user.</div>
          </label>
        </div>
      </fieldset>
      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Initial requirement</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Monthly Bill" type="number" value={form.monthlyBill} onChange={(v) => set("monthlyBill", v)} />
          <Field label="Required System (kW)" type="number" step="0.1" value={form.kwWanted} onChange={(v) => set("kwWanted", v)} />
          <Select label="Lead Temperature" required value={form.temperature} options={["Hot", "Warm", "Cold"]} onChange={(v) => set("temperature", v)} />
        </div>
      </fieldset>
      {lead && !readOnly && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lead decision</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Action" value={action} options={lead.status === "lost" ? [["reopen", "Reopen lead"]] : [["save", "Keep active"], ["lost", "Mark as lost"]]} onChange={setAction} />
            {action === "lost" && <Field label="Lost Reason" required value={lostReason} onChange={setLostReason} />}
          </div>
        </fieldset>
      )}
      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={error} submitLabel={!lead ? "Add lead" : action === "lost" ? "Mark lost" : action === "reopen" ? "Reopen lead" : "Save lead"} />
    </form>
  );
}

function Field({ label, required, type = "text", value, onChange, step }) {
  return <label className="block"><Label required={required}>{label}</Label><input className="field" type={type} min={type === "number" ? 0 : undefined} step={step} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, required, value, options, onChange }) {
  return (
    <label className="block"><Label required={required}>{label}</Label><DropSelect className="field" required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => { const [v, text] = Array.isArray(option) ? option : [option, option]; return <option key={v} value={v}>{text}</option>; })}</DropSelect></label>
  );
}
