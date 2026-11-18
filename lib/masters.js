import { MASTER_TYPES } from "@/lib/masterTypes";
import { HOLD_REASONS } from "@/lib/processConfig";
import { useSupabase, readDoc, writeDoc } from "@/lib/db";
import { sqlReadMasters, sqlWriteMasters } from "@/lib/sql";

// Masters are stored through lib/db.js as { branch: ["..."], dealer: [...], ... }

// Starting values come from the design reference and the dummy cases.
const SEED = {
  branch: ["Sarangarh", "Padampur", "Bargarh", "Sohela", "Jharband", "Saraipali"],
  dealer: ["Bantu Sahu", "Rohan", "Sohan", "Dev Kumar", "Net Kumar"],
  liaisoning: ["Satya Kumar Sahu", "Khemdas"],
  productCode: ["PMSG-3KW", "PMSG-5KW"],
  bank: [],
  responsiblePerson: ["Alok", "Kishan", "Pankaj", "Mahesh", "Akash"],
  installer: [],
  // Added from the design reference (process flow). Values the reference does not name stay empty.
  leadSource: ["CSEB / Bought Data", "Field Visit", "Agent", "Office Connection / Referral"],
  agent: [],
  contactType: ["Call", "Visit", "WhatsApp"],
  leadTemperature: ["Hot", "Warm", "Cold"],
  quotationEntity: ["Urjacon", "Tuskin"],
  systemType: ["DCR", "NDCR"],
  gridType: ["On-grid", "Hybrid"],
  paymentMode: ["Cash", "Loan", "Subsidy Cheque (Odisha)"],
  state: ["Chhattisgarh", "Odisha"],
  discom: ["CSEB / CSPDCL (CG)", "TPWODL (OD)"],
  documentType: [
    "PAN Card", "Aadhaar Card", "Electricity Bill", "Bank Passbook", "Terrace Geotag Photo",
    "Income Proof (above 3 kW)", "Ghar ka Patta (Odisha)", "Vendor Quotation", "e-Token",
    "Site Feasibility", "Acknowledgement", "Work Completion", "Power Purchase Agreement (PPA)",
    "DCR", "Invoice", "Panel Serial Photos", "Inverter Serial Photo", "Plant Geotag Photo",
  ],
  correctionType: ["Owner change", "Name correction", "PAN correction"],
  correctionRoute: ["CSEB office", "TPWODL officer"],
  warrantyType: ["Tata", "Non-Tata"],
  holdReason: Object.entries(HOLD_REASONS).map(([code, text]) => `${code} · ${text}`),
  surveyor: [],
  accountant: ["Chetan", "Sahil"],
  mdApprover: [],
  dispatchPerson: ["Sameer", "Jitendra"],
  paymentType: ["Bank 70%", "Bank 30%", "Down payment", "Cash", "Balance", "Last 10%", "Cheque deposit"],
  subsidyScheme: ["Central", "State"],
  inspectionRoute: ["CSEB", "TPWODL"],
  meterType: ["Smart", "Generation"],
  meterSource: ["Genus", "Service team", "TPWODL"],
};

// Every known master type is marked "seeded" on each write (see lib/sql.js), so a list the
// admin empties on purpose is never filled again.
export async function writeMasters(masters) {
  const data = { ...masters, _seeded: MASTER_TYPES.map((t) => t.key) };
  return useSupabase ? sqlWriteMasters(data) : writeDoc("masters", data);
}

export async function readMasters() {
  let data = useSupabase ? await sqlReadMasters() : await readDoc("masters");
  // A database from before the newer masters existed: its original seven count as seeded.
  const LEGACY = ["branch", "dealer", "liaisoning", "productCode", "bank", "responsiblePerson", "installer"];
  const seeded = new Set(data ? data._seeded ?? LEGACY : []);
  const missing = MASTER_TYPES.filter((t) => !seeded.has(t.key));
  if (missing.length) {
    data = { ...(data ?? {}) };
    for (const t of missing) data[t.key] = SEED[t.key] ?? [];
    await writeMasters(data);
  }
  // Always return every known type, even if empty.
  return Object.fromEntries(MASTER_TYPES.map((t) => [t.key, data[t.key] ?? []]));
}
