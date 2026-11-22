// Material list of a case with quantities, built from what is already known: the system (kW, panels,
// inverter) and the Survey List answers (structure, cable distances). Shown in the Dispatch popups and
// used as the starting text of their Material List. Safe to import on the client.
import { DEFAULT_PANEL_WP, defaultPanelCount } from "@/lib/quotationFormat";

const positive = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const metres = (n) => `${Math.round(n * 100) / 100} m`;

// [{ item, qty }]
export function materialItems(row = {}) {
  const survey = row.steps?.siteSurvey;
  const kw = positive(row.kwWanted);
  const wp = positive(row.quotationPanelWp) || DEFAULT_PANEL_WP;
  const panels = positive(row.quotationPanelCount) || defaultPanelCount(kw, wp);
  const brand = row.quotationPanelBrand ? ` ${row.quotationPanelBrand}` : "";
  const items = [];
  if (panels) items.push({ item: `Solar panel ${wp} Wp${brand}`, qty: `${panels} nos` });
  if (kw) items.push({ item: `${kw} kW ${/hybrid/i.test(row.quotationGridType ?? "") ? "hybrid" : "on-grid"} inverter`, qty: "1 nos" });
  if (survey) {
    const structure = [survey.mountingType, survey.structureSize && !/^other/i.test(survey.structureSize) ? survey.structureSize : ""].filter(Boolean).join(" ");
    if (structure) items.push({ item: `Mounting structure (${structure})`, qty: "1 set" });
    const dc = positive(survey.panelInverterDistance);
    if (dc) items.push({ item: `DC cable (panel to inverter, 2 × ${metres(dc)})`, qty: metres(dc * 2) });
    const ac = positive(survey.inverterDbDistance);
    if (ac) items.push({ item: "AC cable (inverter to DB / main board)", qty: metres(ac) });
    const earth = positive(survey.earthingDistance);
    if (earth) items.push({ item: "Earthing cable", qty: metres(earth) });
    // A survey filled before the cable distances were asked: keep what the surveyor wrote.
    if (survey.materialNeeded && !dc && !ac && !earth) items.push({ item: `Surveyor's note: ${survey.materialNeeded}`, qty: "" });
  }
  items.push({ item: "ACDB", qty: "1 nos" }, { item: "DCDB", qty: "1 nos" }, { item: "Lightning arrester", qty: "1 nos" }, { item: "Earthing kit", qty: "1 set" });
  return items;
}

// One line per item: "Item — qty".
export const materialText = (items) => items.map(({ item, qty }) => (qty ? `${item} — ${qty}` : item)).join("\n");

// Starting text of the Material List in the Dispatch popup (editable there).
export const materialDefault = (row) => materialText(materialItems(row));
