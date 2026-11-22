// Shared (client + server) description of the case pipeline.
// A case sits in exactly one stage. Submitting a step moves it to the next stage.
// Order follows the design reference: verify documents (Name Check) first, then
// login on the portal, then the site survey.
export const FLOW = ["nameCheck", "login", "siteSurvey", "paymentWorkStart"];
// After Payment Work Start, a case chosen as "Loan" continues through these steps.
export const LOAN_FLOW = [
  "agreementUpload",
  "janSamarth",
  "bankFileReady",
  "fileSubmission",
  "loanIssue",
  "firstInstallment",
  "receiveDp",
  "cashReceipt",
  "dispatch",
];
// After Dispatch (Loan or Cash) every case continues here (from the Installation sheet).
// "Tariff code check" is marked "CG Only" in the sheet, but the sheet shows it Done
// for Odisha cases too, so it runs for all cases for now.
export const INSTALL_FLOW = [
  "assignInstaller",
  "installationComplete",
  "billDcr",
  "portalInstallation",
  "inspectionFile",
  "meterInspection",
  "jeInspection",
  "generationWifi",
  "portalInspectionApproval",
  "tariffCheck",
];

// Final closure after commissioning. The design reference blocks warranty and
// document handover until the customer's balance has been cleared.
export const CLOSURE_FLOW = [
  "finalBankFile",
  "finalBankPayment",
  "subsidyRedeem",
  "subsidyDisbursal",
  "chequeDeposit",
  "balanceClearance",
  "warranty",
];

// Login PMSG can send a case to one of these corrections; after it the case goes to the Agreement.
export const CORRECTION_STEPS = ["nameCorrection", "ownerChange"];

// New flow (workflow version 3): Login PMSG -> [Name Correction | Owner Change] -> Agreement -> Site Survey
// and Payment Work Start. Cases made before it keep their old order (Agreement inside the Loan flow).
export const agreementFirst = (row) => Number(row?.workflowVersion) >= 3;

// The main steps of a case, before Payment Work Start's Cash / Loan branch.
function mainPath(row) {
  if (!agreementFirst(row)) return FLOW;
  const corrections = CORRECTION_STEPS.filter(
    (s) =>
      row?.steps?.[s] || row?.stage === s || row?.steps?.login?.route === s,
  );
  return [
    "nameCheck",
    "login",
    ...corrections,
    "agreementUpload",
    "siteSurvey",
    "paymentWorkStart",
  ];
}

// The loan steps of a case: the agreement already happened before Payment Work Start in the new flow.
const loanFlow = (row) =>
  agreementFirst(row)
    ? LOAN_FLOW.filter((s) => s !== "agreementUpload")
    : LOAN_FLOW;

const loanPath = (row) => [
  ...mainPath(row),
  ...loanFlow(row),
  ...INSTALL_FLOW,
  "finalBankFile",
  "finalBankPayment",
  "subsidyRedeem",
  "subsidyDisbursal",
  "balanceClearance",
  "warranty",
];

// A case chosen as "Cash" runs these steps (from the Cash sheet):
//   Ask 90% payment -> 90% payment received?
//     Yes -> Dispatch
//     No  -> Check for Approval (Director approval) -> Dispatch
export const CASH_FLOW = [
  "cashAskPayment",
  "cashPaymentReceived",
  "cashApproval",
  "cashReceipt",
  "cashDispatch",
];
export const SUBSIDY_CHEQUE_FLOW = [
  "subsidyChequeReady",
  "cashReceipt",
  "cashDispatch",
];

// Every step a submit can target.
// Document Receive sits before Document Verification: a new case starts here, and once the
// documents are received it moves to Document Verification (FLOW is unchanged).
export const INTAKE_STEP = "documentReceive";

export const ALL_STEPS = [
  ...new Set([
    INTAKE_STEP,
    ...FLOW,
    "nameCorrection",
    "ownerChange",
    ...LOAN_FLOW,
    ...CASH_FLOW,
    ...SUBSIDY_CHEQUE_FLOW,
    ...INSTALL_FLOW,
    ...CLOSURE_FLOW,
  ]),
];

export const STAGE_LABEL = {
  documentReceive: "Document Receive",
  login: "Login PMSG",
  nameCheck: "Document Verification & Name Check",
  nameCorrection: "Name Correction",
  ownerChange: "Owner Change",
  siteSurvey: "Survey List",
  paymentWorkStart: "Payment Work Start",
  agreementUpload: "Consumer-Vendor Agreement",
  janSamarth: "JanSamarth Application",
  bankFileReady: "Bank File Ready",
  loanIssue: "Loan Issue Cases Resolution",
  fileSubmission: "File Submission in Bank",
  firstInstallment: "Receive First Installment",
  receiveDp: "Receive DP",
  dispatch: "Dispatch",
  cashReceipt: "Accounts Cash Receipt",
  subsidyChequeReady: "Subsidy Cheque Documents",
  cashAskPayment: "Ask 90% Payment for Dispatch",
  cashPaymentReceived: "90% Payment Received?",
  cashApproval: "Check for Approval",
  cashDispatch: "Dispatch (Cash)",
  assignInstaller: "Assign Installer",
  installationComplete: "Installation Pending",
  billDcr: "Bill & DCR",
  portalInstallation: "Installation Submission",
  inspectionFile: "Submit Inspection File",
  meterInspection: "Meter Installation",
  jeInspection: "JE Site Inspection",
  generationWifi: "Generation & Wifi",
  portalInspectionApproval: "Portal Inspection Approval",
  tariffCheck: "Tariff Code Check (CG Only)",
  finalBankFile: "Final 30% Bank File",
  finalBankPayment: "Final 30% Received",
  subsidyRedeem: "Subsidy Redeem",
  subsidyDisbursal: "Subsidy Disbursal",
  chequeDeposit: "Subsidy Cheques Deposit",
  balanceClearance: "Balance Clearance",
  warranty: "Warranty & Handover",
  done: "Completed",
};

export const STAGE_COLOR = {
  login: "blue",
  nameCheck: "amber",
  siteSurvey: "gray",
  paymentWorkStart: "blue",
  done: "green",
};

// Turnaround time (TAT) in days for each step.
// Planned Date = Timestamp + TAT. All 0 for now, so Planned Date equals Timestamp.
// Change a number here when a TAT is decided; new cases will use it.
export const TAT_DAYS = {
  documentReceive: 0,
  login: 0,
  nameCheck: 0,
  nameCorrection: 0,
  ownerChange: 0,
  siteSurvey: 0,
  paymentWorkStart: 0,
  agreementUpload: 0,
  janSamarth: 0,
  bankFileReady: 0,
  loanIssue: 0,
  fileSubmission: 0,
  firstInstallment: 0,
  receiveDp: 0,
  dispatch: 0,
  cashReceipt: 0,
  subsidyChequeReady: 0,
  // Cash sheet "When" values (40, 16, 24) look like hours, not days; not applied yet.
  cashAskPayment: 0,
  cashPaymentReceived: 0,
  cashApproval: 0,
  cashDispatch: 0,
  // Installation sheet "When" values (24, 14, 96, 24, 32) are working hours
  // (Config tab: 10:00-18:00, Sunday off). Not applied yet.
  assignInstaller: 0,
  installationComplete: 0,
  billDcr: 0,
  portalInstallation: 0,
  inspectionFile: 0,
  meterInspection: 0,
  jeInspection: 0,
  generationWifi: 0,
  portalInspectionApproval: 0,
  tariffCheck: 0,
  finalBankFile: 0,
  finalBankPayment: 0,
  subsidyRedeem: 0,
  subsidyDisbursal: 0,
  chequeDeposit: 0,
  balanceClearance: 0,
  warranty: 0,
};

export function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}

// One schedule entry per step: when the case arrived, when it was planned to
// be done, and when it was actually done (null until submitted).
export function newSchedule(step, timestamp) {
  return {
    timestamp,
    plannedDate: addDays(timestamp, TAT_DAYS[step]),
    actualDate: null,
  };
}

// The steps this case goes through, in order. After Payment Work Start the path
// depends on Cash or Loan (and, for Cash, on whether 90% payment was received).
export function stepPath(row) {
  const pw = row.steps?.paymentWorkStart;
  const main = mainPath(row);
  if (pw?.status === "done") {
    if (pw.cashOrLoan === "Loan") return loanPath(row);
    if (pw.cashOrLoan === "Cash") {
      const noPayment =
        row.steps?.cashPaymentReceived?.paymentReceived === "No";
      return [
        ...main,
        "cashAskPayment",
        "cashPaymentReceived",
        ...(noPayment ? ["cashApproval"] : []),
        "cashReceipt",
        "cashDispatch",
        ...INSTALL_FLOW,
        ...closurePath(row, "Cash"),
      ];
    }
    if (pw.cashOrLoan === "Subsidy Cheque") {
      return [
        ...main,
        ...SUBSIDY_CHEQUE_FLOW,
        ...INSTALL_FLOW,
        ...closurePath(row, "Subsidy Cheque"),
      ];
    }
  }
  return main;
}

function closurePath(row, mode = row?.steps?.paymentWorkStart?.cashOrLoan) {
  return [
    ...(mode === "Loan" ? ["finalBankFile", "finalBankPayment"] : []),
    "subsidyRedeem",
    "subsidyDisbursal",
    ...(mode === "Subsidy Cheque" ? ["chequeDeposit"] : []),
    "balanceClearance",
    "warranty",
  ];
}

// Site Survey runs in parallel with Payment Work Start: once Login PMSG is done the case is on both
// pages. The survey is "open" until it is submitted; it must be done before Dispatch (see validate.js).
export const surveyOpen = (row) =>
  row?.steps?.login?.status === "done" &&
  (!agreementFirst(row) || row?.steps?.agreementUpload?.status === "done") &&
  row?.steps?.siteSurvey?.status !== "done" &&
  row?.stage !== "done";

// Stage a case moves to after `step` is submitted as done.
export function nextStage(step, row) {
  if (step === INTAKE_STEP) return FLOW[0];
  if (step === "paymentWorkStart") {
    const mode = row?.steps?.paymentWorkStart?.cashOrLoan;
    if (mode === "Loan") return loanFlow(row)[0];
    if (mode === "Subsidy Cheque") return SUBSIDY_CHEQUE_FLOW[0];
    return CASH_FLOW[0];
  }
  if (step === "login") {
    if (!agreementFirst(row)) return "paymentWorkStart"; // Site Survey is opened in parallel, not as the next stage
    const route = row?.steps?.login?.route;
    return CORRECTION_STEPS.includes(route) ? route : "agreementUpload";
  }
  if (CORRECTION_STEPS.includes(step)) return "agreementUpload";
  // After the agreement the case is on Site Survey and Payment Work Start (the survey runs in parallel).
  if (step === "agreementUpload" && agreementFirst(row))
    return "paymentWorkStart";
  if (step === "cashAskPayment") return "cashPaymentReceived";
  if (step === "cashPaymentReceived") {
    return row?.steps?.cashPaymentReceived?.paymentReceived === "Yes"
      ? "cashReceipt"
      : "cashApproval";
  }
  if (step === "cashApproval" || step === "subsidyChequeReady")
    return "cashReceipt";
  if (step === "cashReceipt") {
    return row?.steps?.paymentWorkStart?.cashOrLoan === "Loan"
      ? "dispatch"
      : "cashDispatch";
  }
  if (step === "cashDispatch") return INSTALL_FLOW[0];
  const j = INSTALL_FLOW.indexOf(step);
  if (j >= 0) return INSTALL_FLOW[j + 1] ?? closurePath(row)[0];
  const close = closurePath(row);
  const c = close.indexOf(step);
  if (c >= 0) return close[c + 1] ?? "done";
  const i = LOAN_FLOW.indexOf(step);
  if (i >= 0) return LOAN_FLOW[i + 1] ?? INSTALL_FLOW[0];
  // Main steps: go to the next one not already done (older cases did Login first).
  for (let k = FLOW.indexOf(step) + 1; k < FLOW.length; k++) {
    if (row?.steps?.[FLOW[k]]?.status !== "done") return FLOW[k];
  }
  return FLOW[FLOW.length - 1];
}

// Label for "Sent to ..." text, where the next stage may depend on the case.
export function nextStageLabel(step) {
  if (step === "paymentWorkStart") return "Loan or Cash flow";
  if (step === "cashPaymentReceived") return "Dispatch or Check for Approval";
  return STAGE_LABEL[nextStage(step)];
}

// Compare names ignoring case, dots/punctuation and extra spaces.
export function normName(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The documents / names / Tata-Non-Tata data of a case. New cases save it at Document Receive;
// older cases saved it at Document Verification.
export function docData(row) {
  const r = row?.steps?.documentReceive;
  return r?.aadhaar ? r : row?.steps?.nameCheck;
}

// Documents the customer hands over (checked at Document Receive).
export const RECEIVE_DOCS = [
  ["aadhaar", "Aadhaar Card"],
  ["pan", "PAN Card"],
  ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill (Bijli Bill)"],
  ["terracePhoto", "Terrace Geotag Photo"],
];

export const NAME_DOCS = [
  ["aadhaar", "Aadhaar Card"],
  ["pan", "PAN Card"],
  ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill (Bijli Bill)"],
];
