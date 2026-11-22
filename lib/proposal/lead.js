// Bridge between a lead record and the proposal builder (lib/proposal/engine.js).
import { DEF, BRAND_LABEL, PRODUCTS, applyProduct, compute, filtered } from "@/lib/proposal/engine";

const STATES = ["Chhattisgarh", "Odisha"];

// Builder state for a lead: the saved proposal if it has one, otherwise a fresh one filled from the lead.
export function initialProposal(row = {}) {
  const saved = row.quotationProposal;
  if (saved?.state) return { state: { ...DEF, ...saved.state }, media: { map: saved.media?.map ?? null, design: saved.media?.design ?? null } };

  // The date is filled in by the builder after mount (no new Date() while prerendering).
  const s = { ...DEF, date: "" };
  s.ref = row.quotationReference || "";
  s.cust = row.customerName || "";
  s.phone = row.mobile || "";
  s.addr = row.address || [row.village, row.branch].filter(Boolean).join(", ");
  if (STATES.includes(row.state)) s.region = row.state;
  s.sys = /hybrid/i.test(row.quotationGridType || row.productInterested || "") ? "Hybrid" : "On-Grid";
  s.plist = row.pricing === "ML" ? "ML" : "CL";
  if (row.quotationDcrType === "NDCR") { s.dcr = "NDCR"; s.seg = "Commercial"; s.tariff = 8; }
  s.prep = row.quotationPreparedBy || row.dealer || row.agent || DEF.prep;
  const want = Number(row.kwWanted) || 0;

  if (row.quotationReference && Number(row.dealAmount) > 0) {
    // A quotation made before the proposal format: keep its price and size as a custom quotation.
    Object.assign(s, {
      prodCode: "", priceMode: "total", rate: Number(row.dealAmount), kw: want || DEF.kw, kwp: "",
      wp: Number(row.quotationPanelWp) || DEF.wp, structAdd: "0", earthAdd: "0",
    });
    const central = Number(row.quotationCentralSubsidy) || Number(row.quotationSubsidy) || 0;
    const state = Number(row.quotationStateSubsidy) || 0;
    if (central || state) Object.assign(s, { subsidyOn: "on", subCentral: central, subState: state });
    else s.subsidyOn = "off";
    return { state: s, media: { map: null, design: null } };
  }

  const list = filtered(s, false);
  const brand = (row.quotationPanelBrand || row.brand || "").toLowerCase();
  const pick = (want && list.find((p) => p.kw === want && p.brand.toLowerCase() === brand))
    || (want && list.find((p) => p.kw === want))
    || (brand && list.find((p) => p.brand.toLowerCase() === brand))
    || list[0];
  if (pick) applyProduct(s, pick);
  else Object.assign(s, { prodCode: "", kw: want || DEF.kw });
  return { state: s, media: { map: null, design: null } };
}

// The lead fields the rest of the system reads (history, call tracker, dashboard, document packet ...).
export function leadFieldsFrom(s, media, row = {}) {
  const c = compute(s);
  const panelBrand = BRAND_LABEL[s.panelBrand] || s.panelBrand;
  const invBrand = BRAND_LABEL[s.invBrand] || s.invBrand;
  return {
    quotationReference: s.ref.trim(),
    quotationEntity: row.quotationEntity || "Urjacon",
    quotationSystemType: row.quotationSystemType || "rooftop solar",
    quotationDcrType: s.dcr,
    quotationGridType: s.sys === "Hybrid" ? "Hybrid" : "On-grid",
    kwWanted: c.kw,
    dealAmount: c.grand,
    quotationCentralSubsidy: c.cen,
    quotationStateSubsidy: c.stt,
    quotationSubsidy: c.subsidy,
    quotationPanelCount: Number(c.modules) || 0,
    quotationPanelWp: Number(s.wp) || 0,
    quotationPanelBrand: panelBrand,
    quotationInverter: `${invBrand} ${s.invModel || ""}`.trim().slice(0, 200),
    quotationPreparedBy: s.prep,
    quotationValidityDays: 30,
    quotationTerms: s.payTxt,
    productCode: row.productCode || (c.p ? c.p.c : c.kw > 0 ? `PMSG-${c.kw}KW` : ""),
    quotationProposal: { state: s, media },
  };
}

// ---- Document Receive pricing: plain fields (size, price, subsidy); the quotation is not used ----

// Server side: clean the typed values and work out the totals (never trust the client).
export function pricingFromInput(input) {
  if (!input || typeof input !== "object") return null;
  const number = (value) => Math.max(0, Number(value) || 0);
  const kw = number(input.kw);
  const price = Math.round(number(input.price));
  const centralSubsidy = Math.round(number(input.centralSubsidy));
  const stateSubsidy = Math.round(number(input.stateSubsidy));
  if (!(kw > 0) || !(price > 0)) return null;
  return {
    kw,
    price,
    centralSubsidy,
    stateSubsidy,
    subsidy: centralSubsidy + stateSubsidy,
    productCode: String(input.productCode ?? "").trim().slice(0, 60),
    gridType: input.gridType === "Hybrid" ? "Hybrid" : "On-grid",
    dcrType: input.dcrType === "NDCR" ? "NDCR" : "DCR",
    panelBrand: String(input.panelBrand ?? "").trim().slice(0, 60),
  };
}

export { PRODUCTS };
