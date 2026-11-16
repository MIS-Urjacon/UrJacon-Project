// Shared (client + server) description of the case pipeline.
// A case sits in exactly one stage. Submitting a step moves it to the next stage.
// Order follows the design reference: verify documents (Name Check) first, then
// login on the portal, then the site survey.
export const FLOW = ["nameCheck", "login", "siteSurvey", "paymentWorkStart"];
// After Payment Work Start, a case chosen as "Loan" continues through these steps.
export const LOAN_FLOW = [
  "bankFileReady",
  "loanIssue",
  "fileSubmission",
  "firstInstallment",
  "receiveDp",
  "dispatch",
];
// After Dispatch (Loan or Cash) every case continues here (from the Installation sheet).
// "Tariff code check" is marked "CG Only" in the sheet, but the sheet shows it Done
// for Odisha cases too, so it runs for all cases for now.
export const INSTALL_FLOW = [
  "assignInstaller",
  "inspectionFile",
  "meterInspection",
  "generationWifi",
  "tariffCheck",
];

const LOAN_PATH = [...FLOW, ...LOAN_FLOW, ...INSTALL_FLOW];

// A case chosen as "Cash" runs these steps (from the Cash sheet):
//   Ask 90% payment -> 90% payment received?
//     Yes -> Dispatch
//     No  -> Check for Approval (Director approval) -> Dispatch
export const CASH_FLOW = ["cashAskPayment", "cashPaymentReceived", "cashApproval", "cashDispatch"];

// Every step a submit can target.
export const ALL_STEPS = [...FLOW, ...LOAN_FLOW, ...CASH_FLOW, ...INSTALL_FLOW];

export const STAGE_LABEL = {
  login: "Login PMSG",
  nameCheck: "Name Check",
  siteSurvey: "Site Survey",
  paymentWorkStart: "Payment Work Start",
  bankFileReady: "Bank File Ready",
  loanIssue: "Loan Issue Cases Resolution",
  fileSubmission: "File Submission in Bank",
  firstInstallment: "Receive First Installment",
  receiveDp: "Receive DP",
  dispatch: "Dispatch",
  cashAskPayment: "Ask 90% Payment for Dispatch",
  cashPaymentReceived: "90% Payment Received?",
  cashApproval: "Check for Approval",
  cashDispatch: "Dispatch (Cash)",
  assignInstaller: "Assign Installer",
  inspectionFile: "Submit Inspection File",
  meterInspection: "Meter Install & Inspection",
  generationWifi: "Generation & Wifi",
  tariffCheck: "Tariff Code Check (CG Only)",
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
  login: 0,
  nameCheck: 0,
  siteSurvey: 0,
  paymentWorkStart: 0,
  bankFileReady: 0,
  loanIssue: 0,
  fileSubmission: 0,
  firstInstallment: 0,
  receiveDp: 0,
  dispatch: 0,
  // Cash sheet "When" values (40, 16, 24) look like hours, not days; not applied yet.
  cashAskPayment: 0,
  cashPaymentReceived: 0,
  cashApproval: 0,
  cashDispatch: 0,
  // Installation sheet "When" values (24, 14, 96, 24, 32) are working hours
  // (Config tab: 10:00-18:00, Sunday off). Not applied yet.
  assignInstaller: 0,
  inspectionFile: 0,
  meterInspection: 0,
  generationWifi: 0,
  tariffCheck: 0,
};

export function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}

// One schedule entry per step: when the case arrived, when it was planned to
// be done, and when it was actually done (null until submitted).
export function newSchedule(step, timestamp) {
  return { timestamp, plannedDate: addDays(timestamp, TAT_DAYS[step]), actualDate: null };
}

// The steps this case goes through, in order. After Payment Work Start the path
// depends on Cash or Loan (and, for Cash, on whether 90% payment was received).
export function stepPath(row) {
  const pw = row.steps?.paymentWorkStart;
  if (pw?.status === "done") {
    if (pw.cashOrLoan === "Loan") return LOAN_PATH;
    if (pw.cashOrLoan === "Cash") {
      const noPayment = row.steps?.cashPaymentReceived?.paymentReceived === "No";
      return [
        ...FLOW,
        "cashAskPayment",
        "cashPaymentReceived",
        ...(noPayment ? ["cashApproval"] : []),
        "cashDispatch",
        ...INSTALL_FLOW,
      ];
    }
  }
  return FLOW;
}

// Stage a case moves to after `step` is submitted as done.
export function nextStage(step, row) {
  if (step === "paymentWorkStart") {
    return row?.steps?.paymentWorkStart?.cashOrLoan === "Loan" ? LOAN_FLOW[0] : CASH_FLOW[0];
  }
  if (step === "cashAskPayment") return "cashPaymentReceived";
  if (step === "cashPaymentReceived") {
    return row?.steps?.cashPaymentReceived?.paymentReceived === "Yes" ? "cashDispatch" : "cashApproval";
  }
  if (step === "cashApproval") return "cashDispatch";
  if (step === "cashDispatch") return INSTALL_FLOW[0];
  const j = INSTALL_FLOW.indexOf(step);
  if (j >= 0) return INSTALL_FLOW[j + 1] ?? "done";
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

export const NAME_DOCS = [
  ["aadhaar", "Aadhaar Card"],
  ["pan", "PAN Card"],
  ["passbook", "Bank Passbook"],
  ["bill", "Electricity Bill (Bijli Bill)"],
];
