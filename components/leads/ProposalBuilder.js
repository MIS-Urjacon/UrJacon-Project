"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, Upload, X } from "lucide-react";
import {
  AC_SIZES, BASE_BRANDS, BRAND_LABEL, DEF, EARTHS, NDCR_STRUCT, STRUCTS, applyProduct, buildMap, compute, earthAdder,
  filtered, geoSearch, inr, kwStr, num, priceOf, codeOf, productOf, setKey, siteLoc, sizeMismatch, structAdder, today,
} from "@/lib/proposal/engine";

// The proposal builder (left side of the UrjaCon Proposal Studio) in this site's form style.
// Everything it edits is the builder state `proposal.state`; the document preview reads the same state.

export function Chips({ value, options, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label, tag]) => (
        <button key={v} type="button" onClick={() => onPick(v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${String(value) === String(v) ? "border-brand bg-brand text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand-dark"}`}>
          {label}{tag ? <span className="ml-1 opacity-70">{tag}</span> : null}
        </button>
      ))}
    </div>
  );
}

const Legend = ({ children }) => <div className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 first:mt-0">{children}</div>;
const Hint = ({ children }) => (children ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{children}</p> : null);

function Field({ label, className = "", children }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Section({ n, title, right, open = false, children }) {
  return (
    <details open={open} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-dark">{n}</span>
        <span className="font-semibold text-slate-800">{title}</span>
        {right && <span className="text-xs font-medium text-slate-400">{right}</span>}
        <ChevronDown size={16} className="ml-auto text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-5 py-4">{children}</div>
    </details>
  );
}

// The builder column is narrow (the template is on the right), so fields sit two per row.
const Grid = ({ children }) => <div className="grid grid-cols-2 gap-3">{children}</div>;

export default function ProposalBuilder({ proposal, setProposal, paymentMode, modeOptions, onPaymentMode }) {
  const s = proposal.state;
  const media = proposal.media;
  const c = compute(s);
  const p = c.p;
  const [mapNote, setMapNote] = useState("");
  const [mapChoices, setMapChoices] = useState([]);
  const [busy, setBusy] = useState("");

  // Today's date is set after mount (no new Date() while prerendering).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!s.date) setProposal((cur) => (cur.state.date ? cur : { ...cur, state: { ...cur.state, date: today() } })); }, [s.date, setProposal]);

  const upd = (key, value) => setProposal((cur) => {
    const next = { ...cur.state, [key]: value };
    if (key === "kw") next.kwp = ""; // DC size follows the new kW, so the panel count recalculates
    if (key === "panelBrand" && ["MNRE approved", "Tata Approved"].includes(next.bosTxt)) next.bosTxt = value === "TATA" ? "Tata Approved" : "MNRE approved";
    return { ...cur, state: next };
  });
  const choose = (key, value) => setProposal((cur) => ({ ...cur, state: setKey({ ...cur.state }, key, value) }));
  const pick = (product) => setProposal((cur) => { const next = { ...cur.state }; applyProduct(next, product); return { ...cur, state: next }; });
  const input = (key, extra = {}) => ({ className: "field", value: s[key] ?? "", onChange: (event) => upd(key, event.target.value), ...extra });
  const area = (key, rows = 4) => ({ className: "w-full rounded-[10px] border border-[#d9e0e6] px-3 py-2 text-sm outline-none transition hover:border-[#b9c4cd] focus:border-brand focus:shadow-[0_0_0_3px_rgba(47,168,154,0.18)]", rows, value: s[key] ?? "", onChange: (event) => upd(key, event.target.value) });

  const list = useMemo(() => filtered({ ...s }, false), [s.seg, s.sys, s.region, s.dcr, s.q, s.kwF, s.brandF, s.plist]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => filtered({ ...s }, true), [s.seg, s.sys, s.region, s.dcr, s.q, s.kwF, s.brandF, s.plist]); // eslint-disable-line react-hooks/exhaustive-deps
  const brands = [...new Set(list.map((item) => item.brand))].filter(Boolean).sort();
  const sizes = [...new Set(list.map((item) => item.kw))].sort((a, b) => a - b);
  const large = p?.comm;
  const mismatch = sizeMismatch(c);
  const phaseTxt = s.phase === "3ph" ? "3 Phase" : "1 Phase";
  const batReady = c.hyb && !c.bn;
  const sa = structAdder(p, s.structType);
  const ea = earthAdder(p, s.earthType);
  const sysWord = c.hyb ? (batReady ? "On-Grid (battery-ready)" : "Hybrid") : "On-Grid";
  const ml = s.plist === "ML";
  void phaseTxt;

  const meta = [p ? (c.ml ? "Market List (ML)" : "Company List (CL)") : "Custom rate", s.seg, s.sys, s.dcr, s.region === "Chhattisgarh" ? "CG" : "Odisha", large ? (NDCR_STRUCT[s.structType] || s.structType) : s.structType, `${s.earthType} earthing`];
  if (c.fin) meta.push(`EMI ₹${inr(c.fin.emi)}`);
  meta.push(`payback ${c.payback.toFixed(2)} yr`);

  async function findMap(chosen) {
    const raw = String(s.locLink || "").trim() || String(s.addr || "").trim();
    if (!raw && !chosen) return setMapNote("Type the place name, a Maps link or coordinates first.");
    try {
      setBusy("map");
      let found = chosen;
      const loc = siteLoc(raw);
      if (!found && loc && loc.lat != null) found = { lat: loc.lat, lng: loc.lng, name: "" };
      if (!found) {
        setMapNote("Searching...");
        const results = await geoSearch(raw);
        if (!results.length) { setBusy(""); return setMapNote(`"${raw}" was not found. Add the tehsil / district too, or paste coordinates from Google Maps.`); }
        if (results.length > 1) { setBusy(""); setMapNote(`${results.length} places found. Choose the right one:`); return setMapChoices(results); }
        found = results[0];
      }
      setMapChoices([]);
      setMapNote("Building the map...");
      const dataUrl = await buildMap(found.lat, found.lng, 15);
      const blob = await (await fetch(dataUrl)).blob();
      const url = await uploadImage(new File([blob], "location-map.jpg", { type: "image/jpeg" }));
      setProposal((cur) => ({ media: { ...cur.media, map: url }, state: { ...cur.state, locLink: `${found.lat.toFixed(6)}, ${found.lng.toFixed(6)}` } }));
      setMapNote(`Map added${found.name ? `: ${found.name}` : ""}. If the pin is wrong, paste exact coordinates from Google Maps and search again.`);
    } catch {
      setMapNote("The map could not load. Check the internet, or upload a screenshot of the location instead.");
    }
    setBusy("");
  }

  async function uploadImage(file) {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "Quotations");
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }
  async function upload(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setBusy(kind);
      const url = await uploadImage(file);
      setProposal((cur) => ({ ...cur, media: { ...cur.media, [kind]: url } }));
    } catch (error) { setMapNote(error.message); }
    setBusy("");
  }

  const loc = siteLoc(s.locLink);
  const listPrice = (item) => priceOf(s, item) + (item.comm ? structAdder(item, s.structType) || 0 : 0);
  const acAll = AC_SIZES.includes(s.acSize) || !s.acSize ? AC_SIZES : [...AC_SIZES, s.acSize];

  return (
    <div className="space-y-3">
      {/* Price summary, like the studio's "quote ticket" */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-bold tracking-wide text-amber-300">{p ? codeOf(s, p) + (c.wi ? "-WI" : "") + (c.man ? " · MANUAL PRICE" : "") : "CUSTOM"}</span>
          <span className="text-xs text-slate-300">{p ? p.desc : `${kwStr(c.kw)} kW · from rate`}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Gross incl. GST</div><div className="text-xl font-bold">₹{inr(c.grand)}</div></div>
          <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subsidy</div><div className="text-xl font-bold text-emerald-300">{c.subsidy ? `−₹${inr(c.subsidy)}` : "—"}</div></div>
          <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Customer net</div><div className="text-xl font-bold text-amber-300">₹{inr(c.net)}</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{meta.map((m, i) => <span key={`${m}-${i}`} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${i === 0 || i === meta.length - 1 ? "bg-amber-300 text-slate-900" : "bg-white/10 text-slate-200"}`}>{m}</span>)}</div>
      </div>

      <Section n="1" title="Choose the system" right={`${list.length} products`} open>
        <Legend>Price list</Legend>
        <Chips value={s.plist} options={[["CL", "Company List (CL)"], ["ML", "Market List (ML)"]]} onPick={(v) => choose("plist", v)} />
        <Hint>CL = Company List (no commission). ML = Market List (commission included, CL + ₹10,000).</Hint>
        <Grid cols={4}>
          <div><Legend>Category</Legend><Chips value={s.seg} options={[["Domestic", "Domestic"], ["Commercial", "Commercial"]]} onPick={(v) => choose("seg", v)} /></div>
          <div><Legend>System type</Legend><Chips value={s.sys} options={[["On-Grid", "On-Grid"], ["Hybrid", "Hybrid"]]} onPick={(v) => choose("sys", v)} /></div>
          <div><Legend>State / Discom</Legend><Chips value={s.region} options={[["Chhattisgarh", "Chhattisgarh"], ["Odisha", "Odisha"]]} onPick={(v) => choose("region", v)} /></div>
          <div><Legend>Panel</Legend><Chips value={s.dcr} options={[["DCR", "DCR"], ["NDCR", "NDCR"]]} onPick={(v) => choose("dcr", v)} /></div>
        </Grid>
        <Legend>Brand</Legend>
        <Chips value={s.brandF} options={[["", "All"], ...brands.map((b) => [b, b])]} onPick={(v) => choose("brandF", v)} />
        <Grid>
          <Field label="Size filter">
            <select className="field" value={s.kwF} onChange={(event) => upd("kwF", event.target.value)}>
              <option value="">All sizes</option>
              {sizes.map((k) => <option key={k} value={k}>{k} kW</option>)}
            </select>
          </Field>
          <Field label="Search code / name"><input {...input("q")} placeholder="CTPR1030, Tata 5 kW..." /></Field>
        </Grid>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{shown.length ? `${shown.length} products found · ${ml ? "Market List (ML)" : "Company List (CL)"}` : ""}</span>
          <button type="button" className="font-semibold text-brand-dark hover:underline" onClick={() => setProposal((cur) => ({ ...cur, state: { ...cur.state, prodCode: "", priceMode: "total", rate: compute(cur.state).grand, structAdd: "0", earthAdd: "0" } }))}>Custom (no price list)</button>
        </div>
        <div className="grid max-h-80 gap-1.5 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5">
          {shown.length === 0 && <div className="p-4 text-center text-sm text-slate-500">{s.seg === "Commercial" && s.dcr === "DCR" ? "The price list has no Commercial DCR product. Use Custom and enter the rate." : s.seg === "Domestic" && s.dcr === "NDCR" ? "The price list has no Domestic NDCR product. Use Custom and enter the rate." : "No product matches. Change the filters or use Custom."}</div>}
          {shown.slice(0, 150).map((item) => (
            <button key={item.code} type="button" onClick={() => pick(item)}
              className={`grid grid-cols-[1fr_auto] gap-x-3 rounded-xl border bg-white p-2.5 text-left transition ${item.code === s.prodCode ? "border-brand shadow-[0_0_0_3px_rgba(47,168,154,0.18)]" : "border-slate-200 hover:border-brand"}`}>
              <span className="font-mono text-[13px] font-bold">{codeOf(s, item)}</span>
              <span className="row-span-2 self-center text-right font-mono text-sm font-bold">₹{inr(listPrice(item))}{item.sub ? <i className="block text-[10.5px] font-semibold not-italic text-emerald-600">net ₹{inr(priceOf(s, item) - item.sub)}</i> : null}</span>
              <span className="text-xs text-slate-500">{item.desc}</span>
              <span className="col-span-2 mt-1 flex flex-wrap gap-1">
                {[item.brand, item.comm ? NDCR_STRUCT[s.structType] || "Ground Mount / RCC Ballast" : null, item.phase, item.ptxt || `${item.panels} × ${item.pwatt}Wp`, item.units ? `~${inr(item.units)} units/mo` : null, item.tadd ? "Tata +₹4,000/kWp" : null, item.tag].filter(Boolean).map((tag) => <span key={tag} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-dark">{tag}</span>)}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section n="2" title="Customer & site" open>
        <Grid>
          <Field label={<>Ref. No. <span className="text-rose-500">*</span></>}><input {...input("ref")} placeholder="URC-298/P/1.1" /></Field>
          <Field label="Date"><input className="field" type="date" value={s.date || ""} onChange={(event) => upd("date", event.target.value)} /></Field>
          <Field label="Customer / organisation (For,)" className="col-span-2"><input {...input("cust")} /></Field>
          <Field label="Contact person (To, ... Ji)"><input {...input("contact")} placeholder="blank = customer name" /></Field>
          <Field label="Mobile"><input {...input("phone")} /></Field>
          <Field label="Address / location" className="col-span-2"><input {...input("addr")} /></Field>
          <Field label="Payment mode (carried to the case)">
            <select className="field" value={paymentMode} onChange={(event) => onPaymentMode(event.target.value)}>
              <option value="">Select payment mode</option>
              {modeOptions.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="Site location: place name, Maps link or lat, long">
          <div className="flex gap-2">
            <input {...input("locLink")} placeholder="Arjunda, Saraipali  or  21.33456, 82.98765  or a Maps link" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); findMap(); } }} />
            <button type="button" disabled={busy === "map"} onClick={() => findMap()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand px-3 text-sm font-semibold text-brand-dark hover:bg-brand-50 disabled:opacity-60"><MapPin size={15} />{busy === "map" ? "Searching..." : "Find & add map"}</button>
          </div>
        </Field>
        {mapNote && <Hint>{mapNote}</Hint>}
        {mapChoices.length > 0 && <div className="grid gap-1.5">{mapChoices.map((choice) => <button key={`${choice.lat}-${choice.lng}`} type="button" onClick={() => findMap(choice)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-brand">{choice.name}</button>)}</div>}
        <Hint>{loc ? (loc.lat != null ? `Location found: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}. The Project Location page shows a QR and link.` : "Link added. The Project Location page shows a QR and link.") : "Type the place name (or a Google Maps link / coordinates) and press Find. If empty, the address above is searched."}</Hint>
      </Section>

      <Section n="3" title="Structure, earthing & cable">
        <Legend>{large ? "Structure type (NDCR list rate, GST included)" : "Structure"}</Legend>
        <Chips value={s.structType} onPick={(v) => choose("structType", v)}
          options={STRUCTS.filter((st) => !large || NDCR_STRUCT[st.k]).map((st) => {
            const add = structAdder(p, st.k);
            if (large) return [st.k, NDCR_STRUCT[st.k], `₹${inr(priceOf(s, p) + add)}`];
            return [st.k, st.k, add === null ? (p ? "₹ ?" : "") : add ? `${add > 0 ? "+" : "−"}${inr(Math.abs(add))}` : ""];
          })} />
        <Grid cols={3}>
          <Field label="Sub type (BOM)"><input {...input("structSub")} list="proposal-sub" /></Field>
          <Field label="Material"><input {...input("structMat")} /></Field>
          <Field label="Structure extra ₹"><input {...input("structAdd", { type: "number", placeholder: sa === null ? "0" : String(sa) })} /></Field>
          <Field label="Length"><input {...input("structLen")} /></Field>
          <Field label="Width"><input {...input("structWid")} /></Field>
        </Grid>
        <datalist id="proposal-sub">{["Ground Mount/ RCC Roof", "RCC Ballast", "RCC Roof – Fixed Structure", "Elevated Residential Option - 2 mtr", "Elevated Residential Option - 3 mtr", "Tin Shed / Sheet Roof", "Ground Mount", "Carport"].map((o) => <option key={o} value={o} />)}</datalist>
        <Hint>{large ? (c.man ? "A manual price is set, so the structure does not change the rate." : `List rate: ₹${inr(priceOf(s, p) + (sa || 0))}`) : p ? (sa === null ? `The price list has no rate for ${s.structType}. Enter the extra ₹ yourself.` : `Price list: ${sa >= 0 ? "+" : "−"}₹${inr(Math.abs(sa))}`) : ""}</Hint>
        <Legend>Earthing</Legend>
        <Chips value={s.earthType} onPick={(v) => choose("earthType", v)} options={EARTHS.map((e) => { const add = earthAdder(p, e.k); return [e.k, e.k, add === null ? (p ? "₹ ?" : "") : add ? `+${inr(add)}` : ""]; })} />
        <Grid>
          <Field label="Earthing extra ₹"><input {...input("earthAdd", { type: "number", placeholder: ea === null ? "0" : String(ea) })} /></Field>
          <Field label="Earthing cable"><input {...input("ecTxt2")} list="proposal-ec" /></Field>
        </Grid>
        <datalist id="proposal-ec">{["Multicore 16 Sqmm", "Copper 4 Sqmm", "GI Strip 25x3 mm", "Aluminium 16 Sqmm"].map((o) => <option key={o} value={o} />)}</datalist>
        <Legend>AC cable</Legend>
        <Chips value={s.acSize} onPick={(v) => upd("acSize", v)} options={acAll.map((a) => [a, a.replace(" Sqmm", "")])} />
        <Chips value={s.acMat} onPick={(v) => upd("acMat", v)} options={[["Copper", "Copper"], ["Aluminium", "Aluminium"]]} />
        <Grid cols={3}>
          <Field label="AC cable size (type a new one)"><input {...input("acSize")} /></Field>
          <Field label="AC brand"><input {...input("acBrand")} list="proposal-cab" /></Field>
          <Field label="AC extra ₹"><input {...input("acAdd", { type: "number", placeholder: "0" })} /></Field>
          <Field label="Other extra ₹"><input {...input("otherAdd", { type: "number", placeholder: "0" })} /></Field>
          <Field label="DC cable" className="col-span-2"><input {...input("dcTxt2")} /></Field>
        </Grid>
        <datalist id="proposal-cab">{["Havells", "Polycab", "KEI", "Finolex"].map((o) => <option key={o} value={o} />)}</datalist>
      </Section>

      {c.hyb && (
        <Section n="4" title="Battery (Hybrid)" open>
          <Chips value={s.batType} onPick={(v) => upd("batType", v)} options={[["Li-ion", "Li-ion"], ["Lead Acid", "Lead Acid"]]} />
          <Grid cols={3}>
            <Field label="No. of battery"><input {...input("batCount", { type: "number", min: 0 })} /></Field>
            <Field label="Volt (each)"><input {...input("batVolt", { type: "number" })} /></Field>
            <Field label="AH (each)"><input {...input("batAh", { type: "number" })} /></Field>
            <Field label="Battery warranty"><input {...input("batWar", { placeholder: "e.g. 60 months" })} /></Field>
            <Field label="Max load on battery"><input {...input("batMax", { placeholder: "e.g. 3 kW" })} /></Field>
          </Grid>
          <Hint>{c.bn ? `${s.batCount} × ${s.batVolt}V × ${s.batAh}Ah ÷ 1000 = ${Math.round(c.kwh * 100) / 100} kWh. ${s.batType} usable ${Math.round(c.dod * 100)}% → 1 kW load for about ${Math.round(c.usable * 10) / 10} hours.` : "Battery-ready inverter. Enter the number of batteries to add a battery bank."}</Hint>
        </Section>
      )}

      <Section n="5" title="Plant, panel, inverter & price">
        <Grid cols={3}>
          <Field label="Plant capacity (kW)"><input {...input("kw", { type: "number", step: "0.01" })} /></Field>
          <Field label="DC capacity (kWp)"><input {...input("kwp", { type: "number", step: "0.001", placeholder: `auto = ${kwStr(c.kw)}` })} /></Field>
          <Field label="Phase">
            <select className="field" value={s.phase} onChange={(event) => upd("phase", event.target.value)}><option value="1ph">1 Phase</option><option value="3ph">3 Phase</option></select>
          </Field>
          <Field label="Panel brand">
            <select className="field" value={s.panelBrand} onChange={(event) => upd("panelBrand", event.target.value)}>{BASE_BRANDS.filter((b) => b.panel).map((b) => <option key={b.name} value={b.name}>{BRAND_LABEL[b.name] || b.name}</option>)}</select>
          </Field>
          <Field label="Cell type"><input {...input("cellType")} list="proposal-cell" /></Field>
          <Field label="Panel Wp"><input {...input("wp", { type: "number" })} /></Field>
          <Field label="Modules"><input {...input("modules", { type: "number", placeholder: `auto = ${s.modules !== "" ? c.autoMods : c.modules}` })} /></Field>
          <Field label="Inverter brand">
            <select className="field" value={s.invBrand} onChange={(event) => upd("invBrand", event.target.value)}>{BASE_BRANDS.filter((b) => b.inv).map((b) => <option key={b.name} value={b.name}>{BRAND_LABEL[b.name] || b.name}</option>)}</select>
          </Field>
          <Field label="Inverter model"><input {...input("invModel")} /></Field>
          <Field label="No. of inverters"><input {...input("invCount", { type: "number", min: 1 })} /></Field>
          <Field label="Inverter warranty"><input {...input("invWar")} /></Field>
          <Field label="Panel warranty"><input {...input("panelWar")} /></Field>
          <Field label="GST %"><input {...input("gst", { type: "number", step: "0.01" })} /></Field>
        </Grid>
        <datalist id="proposal-cell">{["TopCon BiFacial", "TopCon", "N-Type BiFacial", "P-Type Mono PERC", "Bifacial Monoperc", "Mono PERC"].map((o) => <option key={o} value={o} />)}</datalist>
        {p?.wi && (<><Legend>Inverter option (Waaree kit)</Legend><Chips value={s.wiOn} onPick={(v) => choose("wiOn", v)} options={[["off", "Standard (Polycab / Deye)"], ["on", "Waaree inverter", `+${inr(p.wi)}`]]} /></>)}
        {!p && (
          <Grid>
            <Field label="Price entry">
              <select className="field" value={s.priceMode} onChange={(event) => upd("priceMode", event.target.value)}><option value="total">Final amount (GST included)</option><option value="perkw">Per kW rate (without GST)</option></select>
            </Field>
            <Field label={s.priceMode === "total" ? "Final amount ₹ (GST included)" : "Per kW rate ₹ (without GST)"}><input {...input("rate", { type: "number", step: "0.01" })} /></Field>
          </Grid>
        )}
        {p?.comm && <Field label="Manual price ₹ (NDCR, GST included)"><input {...input("manPrice", { type: "number", step: "1", placeholder: `blank = list rate ₹${inr(priceOf(s, p) + (structAdder(p, s.structType) || 0))}` })} /></Field>}
        <Hint>
          {c.man ? `Manual price ₹${inr(c.man)} (GST included)${c.extras ? ` + extras ₹${inr(c.extras)}` : ""} = ₹${inr(c.grand)}. Clear it to return to the list rate.`
            : p ? `${c.ml ? "Market List" : "Company List"} rate ₹${inr(priceOf(s, p) + (p.comm ? c.sa : 0))}${c.extras - (p.comm ? c.sa : 0) ? ` + extras ₹${inr(c.extras - (p.comm ? c.sa : 0))}` : ""} = ₹${inr(c.grand)} · per kW (without GST) ₹${inr(c.perKw, 2)}. Choose Custom to change the rate.`
            : `Custom rate · per kW (without GST) ₹${inr(c.perKw, 2)} · Grand total ₹${inr(c.grand)}`}
        </Hint>
        {mismatch && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <b>The size and the rate do not match.</b> You entered {kwStr(c.kwp)} kWp, but the rate is still {codeOf(s, p)} ({p.kwp} kWp): ₹{inr(c.grand)}. Enter a manual price below, or pick the list size:
            <div className="mt-2 flex flex-wrap gap-1.5">{mismatch.near.map((item) => <button key={item.code} type="button" onClick={() => pick(item)} className="rounded-full border border-rose-200 bg-white px-2.5 py-1 font-semibold hover:border-rose-400">{item.kwp} kWp · {item.kw} kW inverter · ₹{inr(priceOf(s, item) + (structAdder(item, s.structType) || 0))}</button>)}</div>
          </div>
        )}
      </Section>

      <Section n="6" title="Subsidy, finance & notes">
        <Legend>Subsidy</Legend>
        <Chips value={s.subsidyOn} onPick={(v) => upd("subsidyOn", v)} options={[["auto", "Auto (Domestic + DCR)"], ["on", "Always"], ["off", "No"]]} />
        <Grid>
          <Field label="Central ₹"><input {...input("subCentral", { type: "number", placeholder: "auto" })} /></Field>
          <Field label="State ₹"><input {...input("subState", { type: "number", placeholder: "auto" })} /></Field>
        </Grid>
        <Hint>{c.subsidy ? `Applied: Central ₹${inr(c.cen)} + ${s.region} ₹${inr(c.stt)} = ₹${inr(c.subsidy)}. (CG: ₹78,000 + ₹30,000 · Odisha: ₹78,000 + ₹60,000, 3 kW and above)` : s.seg !== "Domestic" || s.dcr !== "DCR" ? "Subsidy applies only to Domestic + DCR. Not applied now." : "Subsidy is off."}</Hint>
        <Legend>Bank finance / EMI block (quotation page)</Legend>
        <Chips value={s.finOn} onPick={(v) => upd("finOn", v)} options={[["on", "Show"], ["off", "No"]]} />
        <Hint>{c.fin ? `Down payment ₹${inr(c.fin.dp)} · loan ₹${inr(c.fin.loan)} @ ${c.fin.roi}% · EMI ₹${inr(c.fin.emi)}/month (5 years) is shown on the quotation page.` : s.finOn !== "on" ? "The finance block is off." : "This product has no finance data in the price list (Commercial NDCR on-grid / Custom)."}</Hint>
        <Grid>
          <Field label="Expandable up to (kW)"><input {...input("expandKw", { type: "number", placeholder: "blank = no" })} /></Field>
          <Field label="Rooftop sq ft / kW"><input {...input("sqftKw", { type: "number" })} /></Field>
        </Grid>
        <Legend>Also on the document</Legend>
        <Chips value={s.suitOn} onPick={(v) => upd("suitOn", v)} options={[["on", "'Ideal for' box: show"], ["off", "No"]]} />
        <Chips value={s.gstSplitOn} onPick={(v) => upd("gstSplitOn", v)} options={[["on", "GST breakup: show"], ["off", "No"]]} />
        <Field label="Extra note (one line = one point)"><textarea {...area("noteTxt", 2)} /></Field>
      </Section>

      <Section n="7" title="Savings, warranty & timeline">
        <Grid cols={3}>
          <Field label="Units / kW / year"><input {...input("genKw", { type: "number" })} /></Field>
          <Field label="₹ per unit (average)"><input {...input("tariff", { type: "number", step: "0.01" })} /></Field>
          <Field label="Trees per unit"><input {...input("treeF", { type: "number", step: "0.00001" })} /></Field>
          <Field label="CO₂ tonnes / kW"><input {...input("co2F", { type: "number", step: "0.1" })} /></Field>
          <Field label="Chart">
            <select className="field" value={s.chartType} onChange={(event) => upd("chartType", event.target.value)}><option value="monthly">Monthly Savings</option><option value="bill25">25 years: bill before vs after</option></select>
          </Field>
          <Field label="Tariff increase %/yr"><input {...input("escal", { type: "number", step: "0.1" })} /></Field>
          <Field label="Project cost (Savings)"><input {...input("projCost", { type: "number", placeholder: "auto" })} /></Field>
          <Field label="Description line"><input {...input("descLine")} /></Field>
          <Field label="Cable brands"><input {...input("cable")} /></Field>
          <Field label="Panel performance (yrs)"><input {...input("wPerf")} /></Field>
          <Field label="Inverter (yrs)"><input {...input("wInv")} /></Field>
          <Field label="BOS (yrs)"><input {...input("wBos")} /></Field>
          <Field label="BOS items text"><input {...input("bosTxt")} list="proposal-bos" /></Field>
          <Field label="Design days"><input {...input("d1")} /></Field>
          <Field label="Supply days"><input {...input("d2")} /></Field>
          <Field label="Installation days"><input {...input("d3")} /></Field>
          <Field label="Commissioning days"><input {...input("d4")} /></Field>
          <Field label="Prepared by"><input {...input("prep")} /></Field>
          <Field label="Mobile"><input {...input("prepPhone")} /></Field>
          <Field label="Company" className="col-span-2"><input {...input("prepCo")} /></Field>
        </Grid>
        <datalist id="proposal-bos">{["MNRE approved", "Tata Approved", "ISI approved"].map((o) => <option key={o} value={o} />)}</datalist>
      </Section>

      <Section n="8" title="Location map & 3D design">
        {[["map", "Location photo / map (Project Location page)"], ["design", "3D design screenshot"]].map(([kind, label]) => (
          <div key={kind} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-2">
            <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {media[kind] ? <img src={media[kind]} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-400">{kind === "map" ? "Default" : "None"}</span>}
            </div>
            <span className="min-w-0 flex-1 text-sm text-slate-600">{label}</span>
            {media[kind] && <button type="button" aria-label="Remove" onClick={() => setProposal((cur) => ({ ...cur, media: { ...cur.media, [kind]: null } }))} className="text-slate-400 hover:text-rose-600"><X size={16} /></button>}
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand-dark">
              <Upload size={13} />{busy === kind ? "Uploading..." : "Upload"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => upload(kind, event)} />
            </label>
          </div>
        ))}
        <Field label="3D design link (clickable in the PDF)"><input {...input("designLink")} placeholder="https://" /></Field>
      </Section>

      <Section n="9" title="Texts, terms & bank details">
        <Field label="Key advantages"><textarea {...area("advTxt", 6)} /></Field>
        <Field label="Our scope"><textarea {...area("scopeTxt", 5)} /></Field>
        <Field label="Customer scope"><textarea {...area("custScopeTxt", 2)} /></Field>
        <Field label="Terms & Conditions"><textarea {...area("termsTxt", 6)} /></Field>
        <Field label="Payment terms"><textarea {...area("payTxt", 2)} /></Field>
        <Field label="Bank details (Label | Value)"><textarea {...area("bankTxt", 6)} /></Field>
        <button type="button" className="text-xs font-semibold text-brand-dark hover:underline" onClick={() => setProposal((cur) => ({ ...cur, state: { ...cur.state, ...Object.fromEntries(["advTxt", "scopeTxt", "custScopeTxt", "termsTxt", "payTxt", "bankTxt"].map((k) => [k, DEF[k]])) } }))}>Reset all texts to default</button>
      </Section>
    </div>
  );
}
