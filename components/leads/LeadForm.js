"use client";

import { useEffect, useRef, useState } from "react";
import DropSelect from "@/components/Select";
import { createPortal } from "react-dom";
import { Camera, Loader2, LocateFixed, RefreshCw, X } from "lucide-react";
import { FormActions, Label } from "@/components/steps/shared";
import { useMe } from "@/lib/useMe";

const TEMPERATURES = ["Interested", "Not Interested", "Follow up Required"];
const OTHER = "Other";
const SOURCES = ["CSEB / Bought Data", "Field Visit", "Agent", "Office Connection / Referral"];
const EMPTY = {
  customerName: "", mobile: "", email: "", village: "", address: "", state: "", latitude: null, longitude: null,
  locationAccuracy: null, locationCapturedAt: "", locationPhoto: null, bpScNumber: "", source: "", agent: "",
  monthlyBill: "", kwWanted: "", productCode: "", paymentMode: "", temperature: "", remark: "", pricing: "", brand: "", productInterested: "",
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
  // Villages near the captured location (from VoiceOfVillage); the nearest one fills Village, the others can be picked.
  const [villageNote, setVillageNote] = useState(null); // { loading } | { villages } | { error }
  const [cameraOpen, setCameraOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  useEffect(() => {
    fetch("/api/masters").then((r) => (r.ok ? r.json() : {})).then((m) => setBrands(m.brand ?? [])).catch(() => {});
  }, []);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  // Older leads may hold a value outside the new lists (other kW); keep it selectable.
  const temperatureOptions = !form.temperature || TEMPERATURES.includes(form.temperature) ? TEMPERATURES : [...TEMPERATURES, form.temperature];
  // "Other" opens a text box for a brand that is not in the Brand master; the typed name is what gets saved.
  const [brandOther, setBrandOther] = useState(false);
  useEffect(() => {
    if (brands.length && form.brand && !brands.includes(form.brand)) setBrandOther(true);
  }, [brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const brandOptions = [...brands, OTHER];
  function pickBrand(v) {
    if (v === OTHER) { setBrandOther(true); if (brands.includes(form.brand)) set("brand", ""); }
    else { setBrandOther(false); set("brand", v); }
  }

  // The village of the captured location fills the Village field (it stays editable).
  async function findVillage(latitude, longitude) {
    setVillageNote({ loading: true });
    try {
      const response = await fetch(`/api/village?lat=${latitude}&lng=${longitude}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) return setVillageNote({ error: data.error ?? "Village could not be found. Type it yourself." });
      if (!data.village) return setVillageNote({ error: "No village found near this location. Type it yourself." });
      set("village", data.village);
      setVillageNote({ villages: data.villages });
    } catch {
      setVillageNote({ error: "Village could not be found. Type it yourself." });
    }
  }

  function captureLocation() {
    setLocationError("");
    // Open the camera right inside the click (browsers allow it only then); the location is read in parallel.
    if (!readOnly) setCameraOpen(true);
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
        findVillage(Number(coords.latitude.toFixed(7)), Number(coords.longitude.toFixed(7)));
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
          <Field label="BP SC Number" required={!lead} value={form.bpScNumber} onChange={(v) => set("bpScNumber", v)} />
          <Field label="Customer Name" required value={form.customerName} onChange={(v) => set("customerName", v)} />
          <Field label="Mobile Number" required type="tel" value={form.mobile} onChange={(v) => set("mobile", v)} />
          <div>
            <Field label="Village" value={form.village} onChange={(v) => set("village", v)} />
            {villageNote?.loading && <div className="mt-1.5 text-xs text-slate-500">Finding the village of this location...</div>}
            {villageNote?.error && <div className="mt-1.5 text-xs font-medium text-amber-700">{villageNote.error}</div>}
            {villageNote?.villages?.length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                Nearby:
                {villageNote.villages.map((v) => (
                  <button key={`${v.name}-${v.place}`} type="button" disabled={readOnly} title={`${v.place}${v.km ? ` · ${v.km} km` : ""}`} onClick={() => set("village", v.name)} className={`rounded-full border px-2 py-0.5 font-semibold transition ${form.village === v.name ? "border-brand bg-brand-50 text-brand-dark" : "border-slate-200 text-slate-600 hover:border-brand"}`}>{v.name}</button>
                ))}
              </div>
            )}
          </div>
          <Field label="Email ID" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Select label="State" required value={form.state} options={["Chhattisgarh", "Odisha"]} onChange={(v) => set("state", v)} />
          <Select className="sm:col-span-2 lg:col-span-3" label="Lead Source" required value={form.source} options={SOURCES} onChange={(v) => set("source", v)} />
          <div className="block">
            <Label>Live Location</Label>
            <button type="button" disabled={readOnly || locationLoading} onClick={captureLocation} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand px-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60">
              <LocateFixed size={16} />
              {locationLoading ? "Capturing..." : form.latitude != null && form.longitude != null ? "Capture Again" : "Capture Live Location"}
            </button>
            {form.latitude != null && form.longitude != null && <div className="mt-1.5 text-xs text-slate-500">{form.latitude}, {form.longitude}{form.locationAccuracy ? ` · ±${form.locationAccuracy} m` : ""}</div>}
            {locationError && <div className="mt-1.5 text-xs font-medium text-rose-600">{locationError}</div>}
            {(form.latitude != null || form.locationPhoto || locationLoading || locationError) && (
              <div className="mt-2">
                {form.locationPhoto ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5">
                    <a href={form.locationPhoto.url} target="_blank" rel="noreferrer" title="Open photo" className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.locationPhoto.url} alt="Site photo" className="h-full w-full object-cover" />
                    </a>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">Site photo added</span>
                    {!readOnly && (
                      <>
                        <button type="button" onClick={() => setCameraOpen(true)} className="text-xs font-semibold text-brand-dark hover:underline">Retake</button>
                        <button type="button" aria-label="Remove photo" onClick={() => set("locationPhoto", null)} className="shrink-0 text-slate-400 hover:text-rose-600"><X size={14} /></button>
                      </>
                    )}
                  </div>
                ) : (
                  !readOnly && (
                    <button type="button" onClick={() => setCameraOpen(true)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 text-sm text-slate-600 transition hover:border-brand hover:bg-brand-50 hover:text-brand-dark">
                      <Camera size={16} />
                      Take Site Photo
                    </button>
                  )
                )}
              </div>
            )}
          </div>
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
          <Field label="Required System (kW)" type="number" step="any" suffix="kW" value={form.kwWanted} onChange={(v) => set("kwWanted", v)} />
          <Segmented label="Product Interested" value={form.productInterested} options={["Hybrid", "On-grid", "Commercial"]} onChange={(v) => set("productInterested", v)} />
          <div>
            <Select label="Brand" value={brandOther ? OTHER : form.brand} options={brandOptions} onChange={pickBrand} />
            {brandOther && <div className="mt-3"><Field label="Brand Name" required value={form.brand} onChange={(v) => set("brand", v)} /></div>}
          </div>
          <Select label="Pricing" value={form.pricing} options={["CL", "ML"]} onChange={(v) => set("pricing", v)} />
          <Segmented label="Lead Temperature" required value={form.temperature} options={temperatureOptions} onChange={(v) => set("temperature", v)} />
          <label className="block sm:col-span-2 lg:col-span-3">
            <Label>Remark</Label>
            <textarea className="field min-h-20 resize-y py-2" value={form.remark ?? ""} onChange={(event) => set("remark", event.target.value)} />
          </label>
        </div>
      </fieldset>
      {/* Lead decisions (call back, visit, document given, lost) are taken in Call Tracker. Only a lost lead can still be reopened here. */}
      {lead && !readOnly && lead.status === "lost" && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lead decision</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Action" value={action} options={lead.status === "lost" ? [["reopen", "Reopen lead"]] : [["save", "Keep active"], ["lost", "Mark as lost"]]} onChange={setAction} />
            {action === "lost" && <Field label="Lost Reason" required value={lostReason} onChange={setLostReason} />}
          </div>
        </fieldset>
      )}
      {cameraOpen && <CameraDialog onClose={() => setCameraOpen(false)} onDone={(photo) => { set("locationPhoto", photo); setCameraOpen(false); }} />}
      <FormActions readOnly={readOnly} onCancel={onCancel} saving={saving} error={error} submitLabel={!lead ? "Add lead" : action === "lost" ? "Mark lost" : action === "reopen" ? "Reopen lead" : "Save lead"} />
    </form>
  );
}

// Opens the device camera at once, lets the user click the picture, then uploads it. Falls back to the phone's camera app / file chooser when the live camera is not available.
function CameraDialog({ onClose, onDone }) {
  const video = useRef(null);
  const stream = useRef(null);
  const fallback = useRef(null);
  const [shot, setShot] = useState(null); // { blob, url }
  const [state, setState] = useState("starting"); // starting | live | failed
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (cancelled) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        setState("live");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => { cancelled = true; stop(); };
  }, []);
  // The <video> is re-created after a retake, so attach the stream whenever it is shown.
  useEffect(() => {
    if (state === "live" && !shot && video.current && stream.current) video.current.srcObject = stream.current;
  }, [state, shot]);

  function snap() {
    const el = video.current;
    if (!el?.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(el.videoWidth, el.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(el.videoWidth * scale);
    canvas.height = Math.round(el.videoHeight * scale);
    canvas.getContext("2d").drawImage(el, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) setShot({ blob, url: URL.createObjectURL(blob) }); }, "image/jpeg", 0.82);
  }
  async function upload(file) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "Leads");
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "Photo could not be uploaded");
      else { stop(); onDone({ url: data.url, name: data.name, type: data.type }); return; }
    } catch {
      setError("Photo could not be uploaded. Please try again");
    }
    setBusy(false);
  }
  function close() { stop(); onClose(); }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 p-4" role="dialog" aria-modal="true" aria-label="Site photo">
      <div className="anim-pop w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-semibold text-slate-800">Site photo</div>
          <button type="button" aria-label="Close" onClick={close} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="relative aspect-[4/3] bg-slate-900">
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Captured site" className="h-full w-full object-cover" />
          ) : state === "failed" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-200">
              <Camera size={28} />
              Camera could not be opened. Allow camera permission, or use your phone's camera app.
            </div>
          ) : (
            <>
              <video ref={video} autoPlay playsInline muted className="h-full w-full object-cover" />
              {state === "starting" && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-200"><Loader2 size={20} className="mr-2 animate-spin" />Opening camera...</div>}
            </>
          )}
        </div>
        {error && <div className="px-4 pt-3 text-xs font-medium text-rose-600">{error}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2 p-4">
          <input ref={fallback} type="file" hidden accept="image/*" capture="environment" onChange={(event) => { const f = event.target.files?.[0]; event.target.value = ""; if (f) upload(f); }} />
          {shot ? (
            <>
              <button type="button" disabled={busy} onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-brand disabled:opacity-60"><RefreshCw size={15} />Retake</button>
              <button type="button" disabled={busy} onClick={() => upload(new File([shot.blob], `site-photo-${Date.now()}.jpg`, { type: "image/jpeg" }))} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">{busy && <Loader2 size={15} className="animate-spin" />}{busy ? "Uploading..." : "Use photo"}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-slate-300">Skip</button>
              {state === "failed" && <button type="button" disabled={busy} onClick={() => fallback.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}Open camera app</button>}
              {state === "live" && <button type="button" onClick={snap} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"><Camera size={16} />Click photo</button>}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, required, type = "text", value, onChange, step, suffix }) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      <div className="relative">
        <input className={`field ${suffix ? "pr-11" : ""}`} type={type} min={type === "number" ? 0 : undefined} step={step} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

// Short choice list as one row of equal option buttons. Fixed 40px height (same as an input) so the form rows never move, whatever the text length.
function Segmented({ label, required, value, options, onChange }) {
  return (
    <div className="block">
      <Label required={required}>{label}</Label>
      <div className="relative grid h-10 gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup">
        {options.map((option) => {
          const on = option === value;
          return (
            <button key={option} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? option : option)}
              className={`flex items-center justify-center rounded-lg border px-1.5 text-center text-xs font-semibold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 ${on ? "border-brand bg-brand-50 text-brand-dark" : "border-slate-200 bg-white text-slate-600 hover:border-brand/60"}`}>
              {option}
            </button>
          );
        })}
        {required && <input tabIndex={-1} aria-hidden required value={value ?? ""} onChange={() => {}} className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />}
      </div>
    </div>
  );
}

function Select({ label, required, value, options, onChange, variant, className = "" }) {
  return (
    <label className={`block ${className}`}><Label required={required}>{label}</Label><DropSelect className="field" variant={variant} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => { const [v, text] = Array.isArray(option) ? option : [option, option]; return <option key={v} value={v}>{text}</option>; })}</DropSelect></label>
  );
}
