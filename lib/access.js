// Role-based page access. Safe to import from proxy.js (no Node-only APIs).
// The user's `role` field holds either "admin", the legacy "user" or a team key below.
// Teams come from the "Who handles what" list on /process-reference.
//   admin      : every page + Settings
//   user       : every process page, no Settings (existing behaviour, unchanged)
//   management : every process page, no Settings (MD: full visibility + approvals)
//   others     : only their own pages (plus the common pages)

// Visible to every signed-in user.
export const COMMON_PAGES = ["dashboard", "reports", "process-reference", "assign-work"];

export const TEAMS = {
  marketing: {
    label: "Field Marketing / Calling",
    pages: ["leads", "call-tracker", "quotation"],
  },
  crm: {
    label: "CRM Head",
    pages: [
      "leads", "call-tracker", "quotation", "document-receive", "name-check", "payment-work-start",
      "loan-issue-resolution", "receive-dp", "cash-ask-payment", "cash-payment-received", "cash-approval",
    ],
  },
  processing: {
    label: "Processing",
    pages: [
      "document-receive", "name-check", "payment-work-start", "jansamarth", "bank-file-ready",
      "loan-issue-resolution", "agreement-upload", "name-correction", "owner-change",
    ],
  },
  login: { label: "Login (PMSG)", pages: ["login-pmsg", "name-correction", "owner-change"] },
  documentation: {
    label: "Documentation",
    pages: [
      "document-receive", "name-check", "name-correction", "owner-change", "agreement-upload", "portal-installation", "submit-inspection-file",
      "portal-inspection-approval", "subsidy-redeem", "subsidy-disbursal", "subsidy-cheque-ready",
      "tariff-code-check",
    ],
  },
  banking: {
    label: "Banking",
    pages: [
      "bank-file-ready", "file-submission", "loan-issue-resolution", "first-installment",
      "final-bank-file", "final-bank-payment",
    ],
  },
  accounts: {
    label: "Accounts",
    pages: [
      "cash-receipt", "receive-dp", "first-installment", "cash-payment-received", "bill-dcr",
      "subsidy-cheque-ready", "cheque-deposit", "final-bank-payment", "subsidy-disbursal", "balance-clearance",
    ],
  },
  dispatch: { label: "Dispatch", pages: ["dispatch", "cash-dispatch"] },
  service: {
    label: "Service",
    pages: [
      "site-survey", "assign-installer", "installation-complete", "generation-wifi", "warranty",
    ],
  },
  discom: {
    label: "DISCOM",
    pages: ["meter-install-inspection", "je-inspection", "submit-inspection-file", "tariff-code-check"],
  },
  management: { label: "Management / MD", pages: "*" },
};

export const ROLE_LABEL = {
  admin: "Admin",
  user: "User",
  ...Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [k, v.label])),
};
export const ROLE_KEYS = Object.keys(ROLE_LABEL);

// Which page (slug) each workflow step belongs to; used to guard step submits.
export const STEP_PAGE = {
  documentReceive: "document-receive", nameCheck: "name-check", login: "login-pmsg", siteSurvey: "site-survey",
  paymentWorkStart: "payment-work-start", nameCorrection: "name-correction", ownerChange: "owner-change", agreementUpload: "agreement-upload", janSamarth: "jansamarth",
  bankFileReady: "bank-file-ready", fileSubmission: "file-submission", loanIssue: "loan-issue-resolution",
  firstInstallment: "first-installment", receiveDp: "receive-dp", dispatch: "dispatch",
  cashAskPayment: "cash-ask-payment", cashPaymentReceived: "cash-payment-received",
  cashApproval: "cash-approval", subsidyChequeReady: "subsidy-cheque-ready", cashReceipt: "cash-receipt",
  cashDispatch: "cash-dispatch", assignInstaller: "assign-installer",
  installationComplete: "installation-complete", billDcr: "bill-dcr", portalInstallation: "portal-installation",
  inspectionFile: "submit-inspection-file", meterInspection: "meter-install-inspection",
  jeInspection: "je-inspection", generationWifi: "generation-wifi",
  portalInspectionApproval: "portal-inspection-approval", tariffCheck: "tariff-code-check",
  finalBankFile: "final-bank-file", finalBankPayment: "final-bank-payment", subsidyRedeem: "subsidy-redeem",
  subsidyDisbursal: "subsidy-disbursal", chequeDeposit: "cheque-deposit",
  balanceClearance: "balance-clearance", warranty: "warranty",
};

// Every page that can be granted (process pages, not the common ones or Settings).
export const GRANTABLE_PAGES = [...new Set(["leads", "call-tracker", "quotation", ...Object.values(STEP_PAGE)])];

// Default pages of a role: the pages a user of that role gets when nothing custom is set.
export function defaultPages(role) {
  if (role === "admin" || role === "user") return [...GRANTABLE_PAGES];
  const t = TEAMS[role]?.pages;
  return t === "*" ? [...GRANTABLE_PAGES] : [...(t ?? [])];
}

// A user is { role, pages? }. `pages` (an array) is a custom list set by the admin; when it
// is missing the role's default pages apply. Settings is always admin-only.
export function canAccessPage(user, slug) {
  const role = user?.role;
  if (role === "admin") return true;
  if (slug === "settings") return false;
  if (COMMON_PAGES.includes(slug)) return true;
  const pages = Array.isArray(user?.pages) ? user.pages : defaultPages(role);
  return pages.includes(slug);
}

export const canSubmitStep = (user, step) => canAccessPage(user, STEP_PAGE[step]);

// Lead pages also write through /api/leads; only users who can open a lead page may write.
export const canWriteLeads = (user) =>
  ["leads", "call-tracker", "quotation"].some((s) => canAccessPage(user, s));

// First path segment of a URL path: "/leads/x" -> "leads".
export const slugOf = (pathname) => pathname.split("/")[1] ?? "";
