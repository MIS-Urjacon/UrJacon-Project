"use client";
import { useState } from "react";
import DropSelect from "@/components/Select";
import { CaseSummary } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import { FormActions, Label } from "./shared";
import { SURVEY_CHOICES, SURVEY_MATERIALS, SURVEY_NUMBERS, SURVEY_PHOTOS } from "@/lib/surveyFields";
import { MapPin } from "lucide-react";
import { defaultInverter, defaultPanelCount, DEFAULT_PANEL_WP } from "@/lib/quotationFormat";

export default function SiteSurveyForm({ row, readOnly, onSubmit, onCancel }) {
  const prev = row.steps?.siteSurvey;
  const [f, setF] = useState({
    smartMeterPresent: prev?.smartMeterPresent ?? "",
    ...Object.fromEntries(SURVEY_CHOICES.map((q) => [q.key, prev?.[q.key] ?? ""])),
    ...Object.fromEntries(SURVEY_NUMBERS.map((q) => [q.key, prev?.[q.key] ?? ""])),
    materialsAvailable: prev?.materialsAvailable ?? [],
    obstacles: prev?.obstacles ?? "",
    installationDate: prev?.installationDate ?? "",
    photosTaken: prev?.photosTaken ?? [],
    photoPdf: prev?.photoPdf ?? [],
    surveyorRemarks: prev?.surveyorRemarks ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF({ ...f, [k]: v });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const unanswered = SURVEY_CHOICES.find((q) => q.required && !f[q.key]);
    if (unanswered) return setErr(`Select ${unanswered.label}`);
    if (f.photoPdf.length === 0) return setErr("Upload the survey photos (PDF or images)");
    setSaving(true);
    const msg = await onSubmit(f);
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <CaseSummary row={row} />
      <ImportantDetails row={row} />

      <p className="rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        The survey date and the surveyor (you, from your login) are saved automatically when you submit.
      </p>

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Smart meter</legend>
        <label className="block sm:max-w-xs">
          <Label required>Smart Meter Present?</Label>
          <DropSelect className="field" required value={f.smartMeterPresent} onChange={(e) => set("smartMeterPresent", e.target.value)}>
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </DropSelect>
        </label>
      </fieldset>

      {["Electrical system", "Roof technical evaluation", "Cable distances", "Site logistics & access"].map((section) => (
        <fieldset key={section} disabled={readOnly}>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{section}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {SURVEY_CHOICES.filter((q) => q.section === section).map((q) => (
              <div key={q.key}>
                <Label required={q.required}>{q.label}</Label>
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {q.options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name={q.key} className="h-4 w-4 accent-[var(--color-brand)]" checked={f[q.key] === option} onChange={() => set(q.key, option)} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {SURVEY_NUMBERS.filter((q) => q.section === section).map((q) => (
              <label key={q.key} className="block">
                <Label required={q.required}>{q.label}</Label>
                <input className="field" type="number" min={0} step="any" required={q.required} value={f[q.key]} onChange={(e) => set(q.key, e.target.value)} />
                {q.hint && <p className="mt-1 text-xs text-slate-400">{q.hint}</p>}
              </label>
            ))}
            {section === "Roof technical evaluation" && (
              <div>
                <Label>Cement, Gitti, Balu Available?</Label>
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {SURVEY_MATERIALS.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]" checked={f.materialsAvailable.includes(item)} onChange={(e) => set("materialsAvailable", e.target.checked ? [...f.materialsAvailable, item] : f.materialsAvailable.filter((x) => x !== item))} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {section === "Site logistics & access" && (<>
              <label className="block"><Label>Potential Installation Obstacles</Label><input className="field" value={f.obstacles} onChange={(e) => set("obstacles", e.target.value)} /></label>
              <label className="block"><Label>Tentative Installation Date</Label><input type="date" className="field" value={f.installationDate} onChange={(e) => set("installationDate", e.target.value)} /></label>
            </>)}
          </div>
        </fieldset>
      ))}

      <fieldset disabled={readOnly}>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Photo checklist &amp; remarks</legend>
        <p className="mb-3 text-sm text-slate-500">Take clear photos of each item during the survey and make one PDF of them (or upload the photos as images). Tick each photo that was taken, then upload the file(s) and share them with Manoj Bhoi or Sameer.</p>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {SURVEY_PHOTOS.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]" checked={f.photosTaken.includes(item)} onChange={(e) => set("photosTaken", e.target.checked ? [...f.photosTaken, item] : f.photosTaken.filter((x) => x !== item))} />
              {item}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Survey Photos (PDF / images)</Label>
            <FileUpload files={f.photoPdf} onChange={(files) => set("photoPdf", files)} max={5} readOnly={readOnly} compact folder="Site-Survey" />
            <p className="mt-1 text-xs text-slate-400">One PDF or up to 5 images (JPG, PNG, WEBP), each up to 5 MB.</p>
          </div>
          <label className="block sm:col-span-2"><Label required>Surveyor Remarks</Label><textarea rows={3} className="field !h-auto py-2.5" required value={f.surveyorRemarks} onChange={(e) => set("surveyorRemarks", e.target.value)} /></label>
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
