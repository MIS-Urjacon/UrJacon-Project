import { LEAD_STAGES, REQUIRED_LEAD_DOCS } from "@/lib/leadConstants";
import { useSupabase, readList, saveListItem, removeListItem } from "@/lib/db";
import { sqlReadLeads, sqlGetLead, sqlSaveLead, sqlRemoveLead } from "@/lib/sql";

export async function readLeads() {
  return useSupabase ? sqlReadLeads() : ((await readList("leads")) ?? []);
}

export async function getLead(id) {
  if (!useSupabase) return (await readLeads()).find((l) => l.id === id) ?? null;
  return sqlGetLead(id);
}

// Save one lead (insert or update); only that lead's rows are written.
export async function saveLead(lead) {
  return useSupabase ? sqlSaveLead(lead) : saveListItem("leads", lead);
}

export async function removeLead(id) {
  return useSupabase ? sqlRemoveLead(id) : removeListItem("leads", id);
}

export function nextLeadId(leads) {
  const next = Math.max(0, ...leads.map((lead) => Number(lead.id?.split("-")[1]) || 0)) + 1;
  return `L-${String(next).padStart(4, "0")}`;
}

// The quotation proposal (UrjaCon Proposal Studio format): the builder's answers plus the two uploaded
// pictures. Only plain strings / numbers are kept, so nothing executable can be stored.
const PROPOSAL_IMAGE = /^\/api\/files\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;
export function cleanProposal(proposal) {
  if (!proposal || typeof proposal !== "object" || !proposal.state || typeof proposal.state !== "object") return null;
  const state = {};
  for (const [key, value] of Object.entries(proposal.state).slice(0, 200)) {
    if (typeof value === "number" && Number.isFinite(value)) state[key] = value;
    else if (typeof value === "string") state[key] = value.slice(0, 4000);
  }
  const image = (url) => (typeof url === "string" && PROPOSAL_IMAGE.test(url) ? url : null);
  return { state, media: { map: image(proposal.media?.map), design: image(proposal.media?.design) } };
}

export function cleanLeadInput(body = {}) {
  const text = (key) => (body[key] ?? "").toString().trim();
  const filePattern = /^\/api\/files\/[a-f0-9-]{36}\.(jpg|png|webp|gif|pdf)$/;
  const cleanFiles = (files, max = 3) => Array.isArray(files)
    ? files
        .filter((file) => file && typeof file.url === "string" && filePattern.test(file.url))
        .slice(0, max)
        .map((file) => ({ url: file.url, name: (file.name ?? "Attachment").toString().trim().slice(0, 120), type: (file.type ?? "").toString().slice(0, 80) }))
    : [];
  const quotationFiles = Array.isArray(body.quotationFiles)
    ? cleanFiles(body.quotationFiles)
    : [];
  const quotationRevisions = Array.isArray(body.quotationRevisions)
    ? body.quotationRevisions.slice(-25).map((revision) => ({
        revision: Math.max(0, Number(revision?.revision) || 0),
        number: (revision?.number ?? "").toString().trim().slice(0, 100),
        reference: (revision?.reference ?? "").toString().trim().slice(0, 80),
        revisionReason: (revision?.revisionReason ?? "").toString().trim().slice(0, 500),
        status: revision?.status === "sent" ? "sent" : "draft",
        createdAt: (revision?.createdAt ?? "").toString().slice(0, 40),
        sentAt: (revision?.sentAt ?? "").toString().slice(0, 40),
        sentBy: (revision?.sentBy ?? "").toString().trim().slice(0, 120),
        customerName: (revision?.customerName ?? "").toString().trim().slice(0, 160),
        mobile: (revision?.mobile ?? "").toString().trim().slice(0, 30),
        email: (revision?.email ?? "").toString().trim().slice(0, 160),
        address: (revision?.address ?? "").toString().trim().slice(0, 500),
        village: (revision?.village ?? "").toString().trim().slice(0, 160),
        state: (revision?.state ?? "").toString().trim().slice(0, 80),
        entity: (revision?.entity ?? "").toString().trim().slice(0, 80),
        systemType: (revision?.systemType ?? "").toString().trim().slice(0, 120),
        dcrType: (revision?.dcrType ?? "").toString().trim().slice(0, 20),
        gridType: (revision?.gridType ?? "").toString().trim().slice(0, 30),
        kwWanted: Number(revision?.kwWanted) || 0,
        price: Number(revision?.price) || 0,
        subsidy: Number(revision?.subsidy) || 0,
        productCode: (revision?.productCode ?? "").toString().trim().slice(0, 100),
        paymentMode: (revision?.paymentMode ?? "").toString().trim().slice(0, 30),
        validityDays: Math.max(1, Number(revision?.validityDays) || 15),
        notes: (revision?.notes ?? "").toString().trim().slice(0, 2000),
        terms: (revision?.terms ?? "").toString().trim().slice(0, 3000),
        files: cleanFiles(revision?.files),
        proposal: cleanProposal(revision?.proposal),
      }))
    : [];
  const optionalNumber = (key) => {
    if (body[key] === "" || body[key] === null || body[key] === undefined) return null;
    const value = Number(body[key]);
    return Number.isFinite(value) ? value : null;
  };
  return {
    customerName: text("customerName"),
    mobile: text("mobile"),
    village: text("village"),
    address: text("address"),
    state: text("state"),
    email: text("email"),
    latitude: optionalNumber("latitude"),
    longitude: optionalNumber("longitude"),
    locationAccuracy: optionalNumber("locationAccuracy"),
    locationCapturedAt: text("locationCapturedAt"),
    // Site photo taken with the live location. Only touched when the request carries it, so other pages' saves keep it.
    ...("locationPhoto" in body ? { locationPhoto: cleanFiles([body.locationPhoto], 1)[0] ?? null } : {}),
    bpScNumber: text("bpScNumber"),
    source: text("source"),
    agent: text("agent"),
    monthlyBill: Number(body.monthlyBill) || 0,
    kwWanted: Number(body.kwWanted) || 0,
    productCode: text("productCode"),
    paymentMode: text("paymentMode"),
    temperature: text("temperature") || "Follow up Required",
    remark: text("remark").slice(0, 1000),
    pricing: text("pricing"),
    brand: text("brand"),
    productInterested: text("productInterested"),
    nextFollowUp: text("nextFollowUp"),
    visitBy: text("visitBy"),
    outcome: text("outcome"),
    quotationReference: text("quotationReference"),
    quotationEntity: text("quotationEntity"),
    quotationSystemType: text("quotationSystemType"),
    quotationDcrType: text("quotationDcrType"),
    quotationGridType: text("quotationGridType"),
    quotationSubsidy: Number(body.quotationSubsidy) || 0,
    quotationCentralSubsidy: Number(body.quotationCentralSubsidy) || 0,
    quotationStateSubsidy: Number(body.quotationStateSubsidy) || 0,
    quotationPanelCount: Number(body.quotationPanelCount) || 0,
    quotationPanelWp: Number(body.quotationPanelWp) || 0,
    quotationPanelBrand: text("quotationPanelBrand"),
    quotationInverter: text("quotationInverter").slice(0, 200),
    quotationIncluded: text("quotationIncluded").slice(0, 500),
    quotationMeter: text("quotationMeter").slice(0, 200),
    quotationPreparedBy: text("quotationPreparedBy"),
    quotationPreparedByRole: text("quotationPreparedByRole"),
    quotationStatus: ["draft", "sent"].includes(body.quotationStatus) ? body.quotationStatus : "",
    quotationCreatedAt: text("quotationCreatedAt"),
    quotationSentAt: text("quotationSentAt"),
    quotationSentBy: text("quotationSentBy"),
    quotationChannel: text("quotationChannel"),
    quotationFiles,
    quotationRevision: Math.max(0, Number(body.quotationRevision) || 0),
    quotationRevisionReason: text("quotationRevisionReason").slice(0, 500),
    quotationValidityDays: Math.max(1, Number(body.quotationValidityDays) || 15),
    quotationNotes: text("quotationNotes").slice(0, 2000),
    quotationTerms: text("quotationTerms").slice(0, 3000),
    quotationRevisions,
    // Only when sent, so saving a lead from another page never wipes what is stored.
    ...(body.ownershipDocument !== undefined ? { ownershipDocument: cleanFiles(body.ownershipDocument, 1) } : {}),
    ...(body.quotationProposal !== undefined ? { quotationProposal: cleanProposal(body.quotationProposal) } : {}),
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
  const hasLatitude = input.latitude !== null;
  const hasLongitude = input.longitude !== null;
  if (hasLatitude !== hasLongitude) return "Capture both latitude and longitude together";
  if (hasLatitude && (input.latitude < -90 || input.latitude > 90)) return "Latitude is outside the valid range";
  if (hasLongitude && (input.longitude < -180 || input.longitude > 180)) return "Longitude is outside the valid range";
  if (input.locationAccuracy !== null && input.locationAccuracy < 0) return "Location accuracy is invalid";
  if (!(["Interested", "Not Interested", "Follow up Required"].includes(input.temperature))) {
    return "Select a valid lead temperature";
  }
  if (input.pricing && !["CL", "ML"].includes(input.pricing)) {
    return "Select CL or ML pricing";
  }
  if (input.productInterested && !["Hybrid", "On-grid"].includes(input.productInterested)) {
    return "Select Hybrid or On-grid";
  }
  if (input.state && !["Chhattisgarh", "Odisha"].includes(input.state)) {
    return "Select Chhattisgarh or Odisha";
  }
  if (input.paymentMode && !["Cash", "Loan", "Subsidy Cheque"].includes(input.paymentMode)) {
    return "Select a valid payment mode";
  }
  if (input.paymentMode === "Subsidy Cheque" && input.state !== "Odisha") {
    return "Subsidy Cheque mode is available only for Odisha cases";
  }
  if (input.quotationEntity && !["Urjacon", "Tuskin"].includes(input.quotationEntity)) {
    return "Select a valid quotation entity";
  }
  if (input.quotationDcrType && !["DCR", "NDCR"].includes(input.quotationDcrType)) {
    return "Select DCR or NDCR";
  }
  if (input.quotationGridType && !["On-grid", "Hybrid"].includes(input.quotationGridType)) {
    return "Select On-grid or Hybrid";
  }
  return null;
}

export function hasCompletePacket(lead) {
  return REQUIRED_LEAD_DOCS.every((key) => lead.documents?.[key]);
}
