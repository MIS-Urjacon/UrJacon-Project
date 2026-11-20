// The UrjaCon quotation format (owner's sample URJ/Q/26-27/0107). Shared by the quotation form
// (placeholders / defaults) and the printed document. Safe to import on the client.

export const DEFAULT_PANEL_WP = 545;
export const DEFAULT_INCLUDED =
  "Mounting structure, ACDB / DCDB, earthing, lightning arrester, cables, installation and commissioning";

const PAYMENT_TERMS = {
  "Subsidy Cheque": [
    "Pay the price minus subsidy before dispatch, and give two signed cheques for the central and state subsidy.",
    "Sign the agreement: the subsidy comes to us, or the system is taken back.",
    "The government credits the subsidy to your bank account after the portal inspection is approved.",
  ],
  Loan: [
    "Pay the down payment before dispatch; the bank loan covers the rest of the price.",
    "Sign the bank loan documents and the consumer-vendor agreement.",
    "The government credits the subsidy to your bank account after the portal inspection is approved.",
  ],
  Cash: [
    "Pay 90% of the price before dispatch and the balance after installation.",
    "Sign the consumer-vendor agreement.",
    "The government credits the subsidy to your bank account after the portal inspection is approved.",
  ],
};

// "Subsidy Cheque (Odisha)" and similar spellings map to the same terms.
const modeKey = (mode = "") => (/cheque/i.test(mode) ? "Subsidy Cheque" : /loan/i.test(mode) ? "Loan" : /cash/i.test(mode) ? "Cash" : "");

export const paymentModeLabel = (mode) => ({ "Subsidy Cheque": "Subsidy cheque", Loan: "Loan", Cash: "Cash" })[modeKey(mode)] ?? "";

export const defaultPaymentTerms = (mode) => (PAYMENT_TERMS[modeKey(mode)] ?? []).join("\n");

export const defaultPanelCount = (kw, wp) => {
  const k = Number(kw) || 0;
  const w = Number(wp) || DEFAULT_PANEL_WP;
  return k > 0 ? Math.ceil((k * 1000) / w) : 0;
};

export const defaultInverter = (kw, grid) =>
  Number(kw) > 0
    ? `${kw} kW ${/hybrid/i.test(grid ?? "") ? "hybrid inverter with battery support" : "on-grid inverter"}`
    : "";

export const defaultMeter = (state) =>
  `Bidirectional net meter through ${state === "Odisha" ? "TPWODL" : state === "Chhattisgarh" ? "CSPDCL" : "the DISCOM"}`;

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// Everything the document prints, from a normalized quotation (see QuotationSummary `normalize`).
export function quotationDocument(q) {
  const wp = Number(q.panelWp) || DEFAULT_PANEL_WP;
  const count = Number(q.panelCount) || defaultPanelCount(q.kwWanted, wp);
  const grid = (q.gridType || "").toLowerCase();
  const central = Number(q.centralSubsidy) || 0;
  const stateSub = Number(q.stateSubsidy) || 0;
  // Older quotations only have one subsidy total: show it as the central subsidy.
  const split = central || stateSub ? { central, state: stateSub } : { central: Number(q.subsidy) || 0, state: 0 };
  const price = Number(q.price) || 0;
  const issued = q.sentAt || q.createdAt || new Date().toISOString();
  const validTill = new Date(new Date(issued).getTime() + (Number(q.validityDays) || 15) * 86400000);
  const terms = (q.terms?.trim() ? q.terms : defaultPaymentTerms(q.paymentMode))
    .split("\n").map((line) => line.trim()).filter(Boolean);
  const dcr = q.dcrType === "NDCR" ? "NDCR" : q.dcrType === "DCR" ? "DCR (made in India cells)" : "";
  return {
    entity: q.entity || "Urjacon",
    reference: q.number || "",
    date: shortDate(issued),
    validTill: shortDate(validTill),
    customerName: q.customerName || "",
    place: [[q.village, q.branch].filter(Boolean).join(", "), q.state ? `(${q.state})` : ""].filter(Boolean).join(" "),
    mobile: q.mobile || "",
    preparedBy: q.preparedBy || "",
    preparedByRole: q.preparedByRole || "",
    capacity: q.kwWanted ? `${q.kwWanted} kW ${q.systemType || "rooftop solar"}${grid ? `, ${grid}` : ""}` : "",
    panels: count ? `${count} × ${wp} Wp ${(q.panelBrand || "").toUpperCase()} ${dcr}`.replace(/\s+/g, " ").trim() : "",
    inverter: q.inverter || defaultInverter(q.kwWanted, q.gridType),
    included: q.included || DEFAULT_INCLUDED,
    meter: q.meter || defaultMeter(q.state),
    price: money(price),
    centralSubsidy: `− ${money(split.central)}`,
    stateSubsidy: `− ${money(split.state)}`,
    net: money(Math.max(0, price - split.central - split.state)),
    termsTitle: paymentModeLabel(q.paymentMode),
    terms,
  };
}

// Styles of the owner's quotation format, scoped to .qdoc (used on screen and when printing).
export const QDOC_CSS = `.qdoc{background:#fff;color:#141414;max-width:820px;margin:0 auto;padding:36px 40px;border-radius:6px;font:14px/1.5 "Hanken Grotesk",system-ui,sans-serif}
.qdoc .q-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:4px solid #F6B02B;padding-bottom:14px}
.qdoc .q-logo{width:170px;display:block}.qdoc .q-ent{font-size:12px;color:#5F5F5A;margin-top:4px;max-width:300px}
.qdoc .q-title{font:800 26px Poppins,"Hanken Grotesk",sans-serif;text-align:right;letter-spacing:-.02em}
.qdoc .q-meta dl{display:grid;grid-template-columns:auto auto;gap:2px 12px;margin:6px 0 0;font-size:13px}.qdoc .q-meta dt{color:#5F5F5A;text-align:right}.qdoc .q-meta dd{margin:0;font-weight:600}
.qdoc .q-to{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin:18px 0 6px;background:#FFF6DE;border-radius:8px;padding:12px 16px}
.qdoc .q-to span{display:block;font-size:11.5px;color:#7A6A40;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.qdoc .q-to b{font-size:16px}
.qdoc h4{font:700 14px Poppins,"Hanken Grotesk",sans-serif;margin:18px 0 6px}
.qdoc .q-t{width:100%;border-collapse:collapse}.qdoc .q-t td{padding:7px 10px;border-bottom:1px solid #E6E4DC;vertical-align:top}.qdoc .q-t td:first-child{color:#5F5F5A;width:38%}
.qdoc .q-price td:last-child{text-align:right;font-weight:600}.qdoc .q-net td{background:#141414;color:#fff!important;font-weight:800;font-size:16px;border:0}.qdoc .q-net td:last-child{color:#F6B02B!important}
.qdoc .q-emi{margin-top:10px;padding:10px 14px;border:1px dashed #F6B02B;border-radius:8px;font-size:13.5px}
.qdoc .q-ul{margin:0;padding-left:18px;list-style:disc}.qdoc .q-ul li{margin:2px 0}
.qdoc .q-sign{display:flex;justify-content:space-between;margin-top:46px;font-size:12.5px;color:#5F5F5A}.qdoc .q-sign div{border-top:1px solid #141414;padding-top:6px;min-width:180px;text-align:center}
@media (max-width:620px){.qdoc{padding:20px 16px}.qdoc .q-head{flex-direction:column}.qdoc .q-title,.qdoc .q-meta dt{text-align:left}.qdoc .q-to{grid-template-columns:1fr}}`;

export const QDOC_PAGE_CSS = `body{margin:0;background:#EFEEE8;padding:24px}@media print{body{background:#fff;padding:0}.qdoc{box-shadow:none}}`;
