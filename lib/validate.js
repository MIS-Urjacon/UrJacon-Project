import { normName, NAME_DOCS } from "@/lib/workflow";
import { EXTRA_FIELDS } from "@/lib/loanFields";

// Server-side validation of each step. Returns { error } or { data, hold }.
// hold = true means the submission is saved but the case stays at this step.

const FILE_RE = /^\/api\/files\/[a-f0-9-]{36}\.(jpg|png|webp|gif|pdf)$/;
const str = (v, max = 300) => (v ?? "").toString().trim().slice(0, max);

function cleanFiles(list, max) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((f) => f && typeof f.url === "string" && FILE_RE.test(f.url))
    .slice(0, max)
    .map((f) => ({ url: f.url, name: str(f.name, 120) }));
}

// Shared validator for the loan steps: Status (Done / Not Done) + Remark,
// plus an amount for the "receive" steps and any extra fields (lib/loanFields.js). Not Done keeps the case at the step.
function simpleStep(withAmount, extra = []) {
  return (data) => {
    const workStatus = str(data.workStatus, 10);
    if (!["Done", "Not Done"].includes(workStatus)) return { error: "Select the Status" };
    const remark = str(data.remark, 1000);
    const hold = workStatus === "Not Done";
    if (hold && !remark) return { error: "Remark is required when Status is Not Done" };
    const out = { workStatus, remark };
    if (withAmount) {
      const raw = data.amount;
      const amount = raw === "" || raw == null ? NaN : Number(raw);
      if (!hold && !(amount >= 0)) return { error: "Enter the amount received" };
      out.amount = Number.isFinite(amount) ? amount : null;
    }
    for (const f of extra) {
      const raw = data[f.key];
      if (f.type === "number") {
        const n = raw === "" || raw == null ? NaN : Number(raw);
        if (!hold && !(n >= 0)) return { error: `Enter ${f.label}` };
        out[f.key] = Number.isFinite(n) ? n : null;
      } else {
        const v = str(raw, 120);
        if (v && f.options && !f.options.includes(v)) return { error: `Select a valid ${f.label}` };
        if (!hold && !v) return { error: `${f.type === "select" ? "Select" : "Enter"} ${f.label}` };
        out[f.key] = v;
      }
    }
    return { data: out, hold };
  };
}

const validators = {
  // ---- Installation flow ----
  assignInstaller: simpleStep(false, EXTRA_FIELDS.assignInstaller),
  inspectionFile: simpleStep(false),
  meterInspection: simpleStep(false),
  generationWifi: simpleStep(false),
  tariffCheck: simpleStep(false),
  // ---- Cash flow ----
  cashAskPayment: simpleStep(false),
  // Yes/No is an answer, not a hold: Yes goes to Dispatch, No goes to approval.
  cashPaymentReceived(data) {
    const paymentReceived = str(data.paymentReceived, 3);
    if (!["Yes", "No"].includes(paymentReceived)) return { error: "Select Yes or No" };
    return { data: { paymentReceived, remark: str(data.remark, 1000) }, hold: false };
  },
  cashApproval: simpleStep(false, EXTRA_FIELDS.cashApproval),
  cashDispatch: simpleStep(false),
  // ---- Loan flow ----
  bankFileReady: simpleStep(false),
  loanIssue: simpleStep(false),
  fileSubmission: simpleStep(false, EXTRA_FIELDS.fileSubmission),
  firstInstallment: simpleStep(true),
  receiveDp: simpleStep(true),
  dispatch: simpleStep(false),

  login(data) {
    const loginCheck = str(data.loginCheck, 30);
    if (!["Login Done", "Login Hold"].includes(loginCheck)) {
      return { error: "Select the Login Check in PMSG result" };
    }
    const remark = str(data.remark, 1000);
    const hold = loginCheck === "Login Hold";
    if (hold && !remark) return { error: "Remark is required when login is on hold" };
    return { data: { loginCheck, images: cleanFiles(data.images, 5), remark }, hold };
  },

  nameCheck(data, row) {
    const out = {};
    let allMatch = true;
    for (const [key, label] of NAME_DOCS) {
      const name = str(data[key]?.name, 120);
      if (!name) return { error: `Enter the name on the ${label}` };
      const matched = normName(name) === normName(row.customerName);
      if (!matched) allMatch = false;
      out[key] = { name, matched, files: cleanFiles(data[key]?.files, 1) };
    }
    return { data: out, hold: !allMatch };
  },

  paymentWorkStart(data) {
    const cashOrLoan = str(data.cashOrLoan, 10);
    const workStatus = str(data.workStatus, 10);
    const corridor = str(data.corridor, 10);
    if (!["Cash", "Loan"].includes(cashOrLoan)) return { error: "Select Cash or Loan" };
    if (!["Done", "Not Done"].includes(workStatus)) return { error: "Select the Status" };
    if (!["Regular", "Special"].includes(corridor)) return { error: "Select the Corridor" };
    // "Not Done" keeps the case at this step.
    return { data: { cashOrLoan, workStatus, corridor }, hold: workStatus === "Not Done" };
  },

  siteSurvey(data) {
    const customerName = str(data.customerName, 120);
    const village = str(data.village, 200);
    const surveyorName = str(data.surveyorName, 120);
    const contactNumber = str(data.contactNumber, 10);
    const surveyDate = str(data.surveyDate, 10);
    if (!customerName) return { error: "Customer Name is required" };
    if (!/^\d{10}$/.test(contactNumber)) return { error: "Contact Number must be 10 digits" };
    if (!village) return { error: "Village (address) is required" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(surveyDate) || isNaN(Date.parse(surveyDate))) {
      return { error: "Select a valid Survey Date" };
    }
    if (surveyDate > new Date().toISOString().slice(0, 10)) {
      return { error: "Survey Date cannot be in the future" };
    }
    if (!surveyorName) return { error: "Surveyor Name is required" };
    return {
      data: { customerName, contactNumber, village, surveyDate, surveyorName },
      hold: false,
    };
  },
};

export function evaluate(step, data, row) {
  return validators[step](data ?? {}, row);
}
