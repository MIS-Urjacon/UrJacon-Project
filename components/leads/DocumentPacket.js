"use client";

import { Label } from "@/components/steps/shared";
import DropSelect from "@/components/Select";
import FileUpload from "@/components/FileUpload";

export const PACKET_DOCS = [
  ["aadhaar", "Aadhaar Card"], ["pan", "PAN Card"], ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill"], ["terracePhoto", "Terrace Geotag Photo"],
];

// Returns an error message or null. `form` is the lead merged with the packet fields.
export function validatePacket(form) {
  if (!form.bpScNumber?.trim()) return "BP SC Number is required for Document Verification";
  if (!form.state) return "Select Chhattisgarh or Odisha before handover";
  if (!form.email?.trim()) return "Email ID is required in the handover packet";
  if (form.source === "Agent" && !(Number(form.commission) > 0)) return "Agent Commission is required for an agent case";
  // The handover documents are optional here: they are received and checked at Document Receive.
  return null;
}

// Handover packet shown in Call Tracker when the customer confirms "Document Given".
export default function DocumentPacket({ form, setForm, set, masters = {} }) {
  return <fieldset><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lead handover packet (optional)</legend><div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PACKET_DOCS.map(([key, label]) => <label key={key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]" checked={Boolean(form.documents?.[key])} onChange={(event) => setForm((current) => ({ ...current, documents: { ...current.documents, [key]: event.target.checked } }))} />{label}</label>)}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="BP SC Number" value={form.bpScNumber} onChange={(v) => set("bpScNumber", v)} /><Field label="Branch" value={form.branch} suggestions={masters.branch} onChange={(v) => set("branch", v)} /><Field label="Dealer" value={form.dealer} suggestions={masters.dealer} onChange={(v) => set("dealer", v)} /><Field label="Liaisoning" value={form.liaisoning} suggestions={masters.liaisoning} onChange={(v) => set("liaisoning", v)} /><label><Label>Route</Label><DropSelect className="field" value={form.route ?? ""} onChange={(event) => set("route", event.target.value)}><option value="">Select</option>{[...(masters.route ?? []), ...(form.route && !(masters.route ?? []).includes(form.route) ? [form.route] : [])].map((option) => <option key={option}>{option}</option>)}</DropSelect></label></div>{form.state === "Odisha" && <div className="mt-4 max-w-md"><Label>Ownership Document (image / PDF, Odisha)</Label><FileUpload files={form.ownershipDocument ?? []} onChange={(files) => set("ownershipDocument", files)} max={1} compact /></div>}</fieldset>;
}

function Field({ label, value, onChange, suggestions = [] }) {
  const listId = suggestions.length ? `packet-${label.toLowerCase().replaceAll(" ", "-")}` : undefined;
  return <label><Label>{label}</Label><input className="field" type="text" list={listId} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />{listId && <datalist id={listId}>{suggestions.map((option) => <option key={option} value={option} />)}</datalist>}</label>;
}
