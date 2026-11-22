"use client";

import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { Label } from "./shared";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// System price and subsidy of the case, typed in. These become the case's System Price and subsidy
// that every later step reads (Dispatch, Payment, Balance Clearance ...). What the Lead page already
// has (size, product code, brand, system type) is passed in `known` and is not asked again.
export default function DocumentPricing({ value, onChange, known = {}, readOnly }) {
  const [masters, setMasters] = useState({});
  useEffect(() => {
    fetch("/api/masters").then((r) => (r.ok ? r.json() : {})).then(setMasters).catch(() => {});
  }, []);
  const set = (key, next) => onChange({ ...value, [key]: next });
  const price = Number(value.price) || 0;
  const subsidy = (Number(value.centralSubsidy) || 0) + (Number(value.stateSubsidy) || 0);
  const options = (list = [], current) => (current && !list.includes(current) ? [...list, current] : list);

  return (
    <fieldset disabled={readOnly} className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">System &amp; price</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        {!known.kw && (
          <label className="block">
            <Label required>System Size (kW)</Label>
            <input className="field" type="number" min={0} step="0.01" value={value.kw ?? ""} onChange={(event) => set("kw", event.target.value)} />
          </label>
        )}
        <label className="block">
          <Label required>System Price (incl. GST) ₹</Label>
          <input className="field" type="number" min={0} value={value.price ?? ""} onChange={(event) => set("price", event.target.value)} />
        </label>
        {!known.productCode && (
          <label className="block">
            <Label>Product Code</Label>
            <DropSelect className="field" value={value.productCode ?? ""} onChange={(event) => set("productCode", event.target.value)}>
              <option value="">Select</option>
              {options(masters.productCode, value.productCode).map((code) => <option key={code} value={code}>{code}</option>)}
            </DropSelect>
          </label>
        )}
        {!known.gridType && (
          <label className="block">
            <Label>Grid Type</Label>
            <DropSelect className="field" value={value.gridType} onChange={(event) => set("gridType", event.target.value)}>
              <option value="On-grid">On-grid</option>
              <option value="Hybrid">Hybrid</option>
            </DropSelect>
          </label>
        )}
        <label className="block">
          <Label>Panel</Label>
          <DropSelect className="field" value={value.dcrType} onChange={(event) => set("dcrType", event.target.value)}>
            <option value="DCR">DCR</option>
            <option value="NDCR">NDCR</option>
          </DropSelect>
        </label>
        {!known.panelBrand && (
          <label className="block">
            <Label>Panel Brand</Label>
            <DropSelect className="field" value={value.panelBrand ?? ""} onChange={(event) => set("panelBrand", event.target.value)}>
              <option value="">Select</option>
              {options(masters.brand, value.panelBrand).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </DropSelect>
          </label>
        )}
        <label className="block">
          <Label>Central Subsidy ₹</Label>
          <input className="field" type="number" min={0} value={value.centralSubsidy ?? ""} onChange={(event) => set("centralSubsidy", event.target.value)} />
        </label>
        <label className="block">
          <Label>State Subsidy ₹</Label>
          <input className="field" type="number" min={0} value={value.stateSubsidy ?? ""} onChange={(event) => set("stateSubsidy", event.target.value)} />
        </label>
        <label className="block">
          <Label>Cost After Subsidy</Label>
          <input className="field bg-slate-50 font-semibold" readOnly value={price ? money(Math.max(0, price - subsidy)) : ""} />
        </label>
      </div>
    </fieldset>
  );
}
