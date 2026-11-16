import { promises as fs } from "fs";
import path from "path";
import { LEAD_STAGES, REQUIRED_LEAD_DOCS } from "@/lib/leadConstants";

const FILE = path.join(process.cwd(), "data", "leads.json");

export async function readLeads() {
  try {
    const rows = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function writeLeads(leads) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(leads, null, 2));
}

export function nextLeadId(leads) {
  const next = Math.max(0, ...leads.map((lead) => Number(lead.id?.split("-")[1]) || 0)) + 1;
  return `L-${String(next).padStart(4, "0")}`;
}

export function cleanLeadInput(body = {}) {
  const text = (key) => (body[key] ?? "").toString().trim();
  return {
    customerName: text("customerName"),
    mobile: text("mobile"),
    village: text("village"),
    address: text("address"),
    bpScNumber: text("bpScNumber"),
    source: text("source"),
    agent: text("agent"),
    monthlyBill: Number(body.monthlyBill) || 0,
    kwWanted: Number(body.kwWanted) || 0,
    productCode: text("productCode"),
    paymentMode: text("paymentMode"),
    temperature: text("temperature") || "Warm",
    nextFollowUp: text("nextFollowUp"),
    outcome: text("outcome"),
    quotationReference: text("quotationReference"),
    commission: Number(body.commission) || 0,
    branch: text("branch"),
    dealer: text("dealer"),
    liaisoning: text("liaisoning"),
    route: text("route"),
    dealAmount: Number(body.dealAmount) || 0,
    leadStage: LEAD_STAGES.includes(body.leadStage) ? body.leadStage : "new",
    documents: Object.fromEntries(
      [...REQUIRED_LEAD_DOCS, "terracePhoto"].map((key) => [key, Boolean(body.documents?.[key])])
    ),
  };
}

export function validateLead(input) {
  if (!input.customerName || !input.mobile || !input.source) {
    return "Customer Name, Mobile Number and Lead Source are required";
  }
  if (!/^\+?[0-9][0-9\s-]{7,14}$/.test(input.mobile)) {
    return "Enter a valid mobile number";
  }
  if (!(["Hot", "Warm", "Cold"].includes(input.temperature))) {
    return "Select a valid lead temperature";
  }
  if (input.paymentMode && !["Cash", "Loan"].includes(input.paymentMode)) {
    return "Payment mode must be Cash or Loan";
  }
  return null;
}

export function hasCompletePacket(lead) {
  return REQUIRED_LEAD_DOCS.every((key) => lead.documents?.[key]);
}
