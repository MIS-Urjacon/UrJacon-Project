"use client";

import { Label } from "@/components/steps/shared";

export const PACKET_DOCS = [
  ["aadhaar", "Aadhaar Card"], ["pan", "PAN Card"], ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill"], ["terracePhoto", "Terrace Geotag Photo"],
];

// Returns an error message or null. `form` is the lead merged with the packet fields.
export function validatePacket(form) {
  if (!form.bpScNumber?.trim()) return "BP SC Number is required for Document Verification";
  if (!form.state) return "Select Chhattisgarh or Odisha before handover";
  if (!form.email?.trim()) return "Email ID is required in the handover packet";
  if (!form.productCode?.trim()) return "Product Code is required in the handover packet";
  if (!(Number(form.kwWanted) > 0)) return "System size in kW is required in the handover packet";
  if (!form.paymentMode) return "Select the expected payment mode";
  if (form.source === "Agent" && !(Number(form.commission) > 0)) return "Agent Commission is required for an agent case";
  const missing = PACKET_DOCS.find(([key]) => !form.documents?.[key]);
  if (missing) return `${missing[1]} is required before Document Verification`;
  return null;
}

// Handover packet shown in Call Tracker when the customer confirms "Document Given".
export default function DocumentPacket({ form, setForm, set, masters = {} }) {
  return <fieldset><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lead handover packet</legend><div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PACKET_DOCS.map(([key, label]) => <label key={key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]" checked={Boolean(form.documents?.[key])} onChange={(event) => setForm((current) => ({ ...current, documents: { ...current.documents, [key]: event.target.checked } }))} />{label}<span className="text-rose-500">*</span></label>)}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="BP SC Number" value={form.bpScNumber} onChange={(v) => set("bpScNumber", v)} /><Field label="Branch" value={form.branch} suggestions={masters.branch} onChange={(v) => set("branch", v)} /><Field label="Dealer" value={form.dealer} suggestions={masters.dealer} onChange={(v) => set("dealer", v)} /><Field label="Liaisoning" value={form.liaisoning} suggestions={masters.liaisoning} onChange={(v) => set("liaisoning", v)} /><Field label="Route" value={form.route} onChange={(v) => set("route", v)} /></div></fieldset>;
}

function Field({ label, value, onChange, suggestions = [] }) {
  const listId = suggestions.length ? `packet-${label.toLowerCase().replaceAll(" ", "-")}` : undefined;
  return <label><Label>{label}</Label><input className="field" type="text" list={listId} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />{listId && <datalist id={listId}>{suggestions.map((option) => <option key={option} value={option} />)}</datalist>}</label>;
}
