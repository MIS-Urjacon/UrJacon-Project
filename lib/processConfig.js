// Accounts Cash Receipt: one dropdown replaces Status + Hold Reason Code.
//   PAID    -> proper: the step is done, the case moves on to Dispatch
//   BELOW   -> hold (H11, cash below 90%): the case stays in Pending
//   WITHOUT -> moves on to Dispatch without cash or down payment (H21); the remark records who approved
export const RECEIPT_STATUS = {
  PAID: "90% Cash Received",
  BELOW: "Cash Below 90%",
  WITHOUT: "Dispatch Without Cash or Down Payment",
};

export const HOLD_REASONS = {
  H01: "Lead lost",
  H02: "Consumer already registered with another vendor",
  H03: "Call not connecting or OTP not shared",
  H04: "Owner change needed",
  H05: "Name spelling mismatch",
  H06: "No PAN card",
  H07: "Loan not possible in passbook bank / bank not listed",
  H08: "Loan rejected, curable",
  H09: "Loan rejected, final",
  H10: "Down payment pending",
  H11: "Cash case below 90%",
  H12: "Subsidy cheque, agreement or balance missing",
  H13: "DCR on hold, cash below 90%",
  H14: "No smart meter at site (CG)",
  H15: "TPWODL on hold (OD)",
  H16: "Reverification required",
  H17: "Duplicate serial number",
  H18: "Subsidy request returned",
  H19: "Subsidy cheque bounced (OD)",
  H20: "Customer complaint, any stage",
  H21: "Dispatch without cash or down payment",
  H22: "Balance pending at closure",
};

const field = (key, label, type = "text", extra = {}) => ({
  key,
  label,
  type,
  ...extra,
});

export const PROCESS_CONFIG = {
  loanIssue: {
    title: "PHS & Loan Decision",
    owner: "Bank / Reshmi",
    subtitle: "Record the bank loan decision.",
    holds: ["H08", "H09"],
    fields: [
      field("loanDecision", "Loan Decision", "select", {
        required: true,
        options: ["Sanctioned"],
      }),
    ],
  },
  nameCorrection: {
    title: "Name Correction",
    owner: "Soniya",
    subtitle:
      "Correct the name on the customer's document. When it is done the case goes to the Agreement.",
    holds: ["H05"],
    fields: [
      field("correctedName", "Corrected Name", "text", { required: true }),
      field("correctionFiles", "Corrected Document / Bill", "files", {
        max: 3,
      }),
    ],
  },
  ownerChange: {
    title: "Owner Change",
    owner: "Soniya",
    subtitle:
      "Change the owner on the connection / document. When it is done the case goes to the Agreement.",
    holds: ["H04"],
    fields: [
      field("newOwnerName", "New Owner Name", "text", { required: true }),
      field("ownerFiles", "Owner Change Document", "files", {
        max: 3,
      }),
    ],
  },
  agreementUpload: {
    title: "Consumer-Vendor Agreement",
    noStatus: true, // no Status field: Complete Step finishes it
    owner: "Soniya",
    subtitle:
      "Upload the signed agreement; the case then goes to Site Survey and Payment Work Start. Stamp: ₹50 in Chhattisgarh, ₹10 in Odisha.",
    fields: [
      field("agreementDate", "Agreement Upload Date", "date", {
        required: true,
      }),
      field("stampAmount", "Stamp Amount (₹)", "number", {
        required: true,
        defaultByState: { Chhattisgarh: 50, Odisha: 10 },
        autoFrom: "case state",
      }),
      field("agreementFiles", "Signed Agreement", "files", {
        required: true,
        max: 2,
      }),
    ],
  },
  janSamarth: {
    title: "JanSamarth Application",
    owner: "Reshmi",
    subtitle: "Record the bank digital approval with its image.",
    holds: ["H07", "H08", "H09"],
    fields: [
      field("approvalDate", "Digital Approval Date", "date", {
        required: true,
      }),
      field("bankFileFiles", "Image", "files", { required: true, max: 5 }),
    ],
  },
  subsidyChequeReady: {
    title: "Subsidy Cheque Documents",
    noStatus: true, // no Status field: Complete Step finishes it
    owner: "Chetan / Accounts",
    subtitle:
      "Odisha only: verify full balance, central and state cheques, and signed agreement before receipt.",
    holds: ["H12", "H19"],
    fields: [
      field("balanceAmount", "Price Minus Subsidy (₹)", "number", {
        required: true,
        defaultCalculation: "priceMinusSubsidy",
        autoFrom: "quotation price and subsidy",
      }),
      field("balanceReceived", "Balance Received (₹)", "number", {
        required: true,
      }),
      field("centralChequeNo", "Central Subsidy Cheque No.", "text", {
        required: true,
      }),
      field("stateChequeNo", "State Subsidy Cheque No.", "text", {
        required: true,
      }),
      field("agreementConfirmed", "Signed Agreement Confirmed", "select", {
        required: true,
        options: ["Yes", "No"],
      }),
    ],
  },
  cashReceipt: {
    title: "Accounts Cash Receipt",
    receiptStatus: true,
    owner: "Chetan / Sahil",
    subtitle:
      "Compulsory signed accounts receipt before every dispatch, in every payment mode.",
    holds: ["H11", "H21"],
    fields: [
      field("receiptNo", "Cash Receipt No.", "text", { required: true }),
      field("amountReceived", "Amount Received (₹)", "number", {
        required: true,
      }),
      field("receiptDate", "Receipt Date", "date", { required: true }),
      field("signedBy", "Signed by Accountant", "text", { required: true }),
      field("receiptFiles", "Signed Receipt", "files", {
        required: true,
        max: 2,
      }),
      field("invoiceFiles", "Invoice", "files", { max: 2 }),
    ],
  },
  dispatch: {
    title: "Dispatch (Loan)",
    owner: "Sameer / Jitendra",
    subtitle:
      "Dispatch only against the signed cash receipt and exactly as per the survey report.",
    holds: ["H10", "H21"],
    fields: [
      field("dispatchDate", "Dispatch Date", "date", { required: true }),
      field("materialList", "Material List", "materials", { required: true, defaultCalculation: "materialList" }),
      field("dispatchedBy", "Dispatched By", "text", { required: true }),
      field("deliveredBy", "Delivered By", "text", { required: true }),
    ],
  },
  cashDispatch: {
    title: "Dispatch (Cash / Subsidy Cheque)",
    owner: "Sameer / Jitendra",
    subtitle:
      "Dispatch only against the signed receipt and the site-survey material list.",
    holds: ["H11", "H12", "H21"],
    fields: [
      field("dispatchDate", "Dispatch Date", "date", { required: true }),
      field("materialList", "Material List", "materials", { required: true, defaultCalculation: "materialList" }),
      field("dispatchedBy", "Dispatched By", "text", { required: true }),
      field("deliveredBy", "Delivered By", "text", { required: true }),
      field("tpwodlReference", "TPWODL Reference (Odisha)"),
    ],
  },
  installationComplete: {
    title: "Installation Pending",
    owner: "Installer / Soniya",
    subtitle:
      "Capture installation date, every panel serial photo, inverter serial photo and plant geotag.",
    fields: [
      field("installationDate", "Installation Date", "date", {
        required: true,
      }),
      field("installerName", "Installer", "text", {
        required: true,
        defaultStep: "assignInstaller",
        defaultKey: "installerName",
        autoFrom: "Assign Installer",
      }),
      field("panelSerialFiles", "Panel Serial Photos", "files", {
        required: true,
        max: 20,
      }),
      field("inverterSerialFiles", "Inverter Serial Photo", "files", {
        required: true,
        max: 2,
      }),
      field("plantGeotagFiles", "Plant Geotag Photo", "files", {
        required: true,
        max: 2,
      }),
    ],
  },
  billDcr: {
    title: "Bill & DCR",
    owner: "Chetan",
    subtitle:
      "Prepare invoice, work completion and DCR after Installation Pending is complete.",
    holds: ["H13"],
    fields: [
      field("billNo", "Invoice / Bill No.", "text", { required: true }),
      field("dcrNo", "DCR No.", "text", { required: true }),
      field("documentDate", "Document Date", "date", { required: true }),
      field("invoiceFiles", "Invoice", "files", { required: true, max: 2 }),
      field("dcrFiles", "DCR", "files", { required: true, max: 2 }),
      field("workCompletionFiles", "Work Completion", "files", {
        required: true,
        max: 2,
      }),
    ],
  },
  portalInstallation: {
    title: "Installation Submission",
    owner: "Soniya",
    subtitle:
      "Submit installation on the national portal only after serial photos, geotag, bill and DCR.",
    fields: [
      field("applicationNo", "PMSG Application No.", "text", {
        required: true,
        defaultStep: "login",
        defaultKey: "applicationNo",
        autoFrom: "Login PMSG",
      }),
      field("submissionDate", "Portal Submission Date", "date", {
        required: true,
      }),
    ],
  },
  inspectionFile: {
    title: "Inspection Filing",
    owner: "Satya / Khemdas (CG) · Soniya (OD)",
    subtitle: "CG: file at CSEB. OD: upload DCR and work completion on TPWODL.",
    holds: ["H15"],
    fields: [
      field("inspectionRoute", "Inspection Route", "select", {
        required: true,
        options: ["CSEB / CSPDCL", "TPWODL Portal"],
        defaultByState: {
          Chhattisgarh: "CSEB / CSPDCL",
          Odisha: "TPWODL Portal",
        },
        autoFrom: "case state",
      }),
      field("filedDate", "Filed Date", "date", { required: true }),
      field("filedBy", "Filed By", "text", { required: true }),
      field("inspectionFiles", "Inspection File", "files", {
        required: true,
        max: 5,
        defaultSources: [
          { step: "billDcr", key: "dcrFiles" },
          { step: "billDcr", key: "workCompletionFiles" },
          { step: "installationComplete", key: "plantGeotagFiles" },
        ],
        autoFrom: "Bill & DCR and Installation Pending",
      }),
    ],
  },
  meterInspection: {
    title: "Meter Installation",
    owner: "Satya / Genus / Service Team / TPWODL",
    subtitle: "Upload the meter installation image and add a remark.",
    fields: [
      field("meterImages", "Meter Image", "files", { required: true, max: 5 }),
    ],
  },
  jeInspection: {
    title: "JE Site Inspection",
    owner: "DISCOM JE · Satya / Khemdas",
    subtitle: "Record the JE visit and approval before commissioning.",
    holds: ["H15"],
    fields: [
      field("jeVisitDate", "JE Visit Date", "date", { required: true }),
      field("jeApproval", "JE Approval", "select", {
        required: true,
        options: ["Approved", "Pending"],
      }),
    ],
  },
  generationWifi: {
    title: "Plant Commissioning",
    owner: "Service Team",
    subtitle:
      "Configure the plant and share inverter ID/password. Switch on only with a bidirectional meter.",
    fields: [
      field("configurationDate", "Configuration Date", "date", {
        required: true,
      }),
      field("inverterId", "Inverter ID", "text", { required: true }),
      field("loginShared", "Login Shared with Customer & Office", "select", {
        required: true,
        options: ["Yes", "No"],
      }),
      field("plantSwitchedOn", "Plant Switched On", "select", {
        required: true,
        options: ["Yes", "No"],
      }),
    ],
  },
  portalInspectionApproval: {
    title: "Portal Inspection Approval",
    owner: "Soniya / National Portal",
    subtitle:
      "Close portal flags and record inspection approval before closure tracks begin.",
    holds: ["H16", "H17"],
    fields: [
      field("portalApprovalDate", "Portal Approval Date", "date", {
        required: true,
      }),
      field("reverification", "Reverification", "select", {
        required: true,
        options: ["No", "Yes"],
      }),
      field("duplicateSerial", "Duplicate Serial No.", "select", {
        required: true,
        options: ["No", "Yes"],
      }),
    ],
  },
  finalBankFile: {
    title: "Final 30% Bank File",
    owner: "Banking Team",
    subtitle:
      "Loan only: submit invoice, work completion and plant geotag after commissioning.",
    fields: [
      field("submittedDate", "Submitted Date", "date", { required: true }),
      field("finalBankFiles", "Invoice + Work Completion + Geotag", "files", {
        required: true,
        max: 5,
        defaultSources: [
          { step: "billDcr", key: "invoiceFiles" },
          { step: "billDcr", key: "workCompletionFiles" },
          { step: "installationComplete", key: "plantGeotagFiles" },
        ],
        autoFrom: "Bill & DCR and Installation Pending",
      }),
    ],
  },
  finalBankPayment: {
    title: "Final 30% Received",
    owner: "Bank / Accounts",
    subtitle:
      "Record the final bank disbursal and unlock the balance commission tranche.",
    fields: [
      field("amount", "30% Amount Received (₹)", "number", { required: true }),
      field("receivedDate", "Received Date", "date", { required: true }),
    ],
  },
  subsidyRedeem: {
    title: "Subsidy Redeem",
    owner: "Soniya",
    subtitle: "Redeem subsidy only after portal inspection approval.",
    holds: ["H18"],
    fields: [
      field("redeemDate", "Redeem Date", "date", { required: true }),
      field("subsidyReference", "Subsidy Reference", "text", {
        required: true,
      }),
    ],
  },
  subsidyDisbursal: {
    title: "Subsidy Disbursal",
    owner: "National Portal / Accounts",
    subtitle: "Record central and state subsidy credits.",
    fields: [
      field("centralDisbursalDate", "Central Subsidy Date", "date", {
        required: true,
      }),
      field("stateDisbursalDate", "State Subsidy Date", "date"),
    ],
  },
  chequeDeposit: {
    title: "Subsidy Cheques Deposit",
    owner: "Accounts",
    subtitle:
      "Odisha cheque cases: deposit both cheques after subsidy reaches the consumer.",
    holds: ["H19"],
    fields: [
      field("centralDepositDate", "Central Cheque Deposit Date", "date", {
        required: true,
      }),
      field("stateDepositDate", "State Cheque Deposit Date", "date", {
        required: true,
      }),
      field("chequeStatus", "Cheque Status", "select", {
        required: true,
        options: ["Cleared", "Bounced"],
      }),
    ],
  },
  balanceClearance: {
    title: "Balance Clearance",
    owner: "Accounts",
    subtitle:
      "No warranty, handover or plant switch-on while any consumer balance remains.",
    holds: ["H22"],
    fields: [
      field("balanceDue", "Total Amount to Collect (₹)", "number", {
        required: true,
      }),
      field("balanceRecovered", "Amount Received (₹)", "number", {
        required: true,
      }),
      field("clearanceDate", "Clearance Date", "date", { required: true }),
    ],
  },
};

// Loan, Cash, Installation and Closure popups have no Status dropdown: submitting completes the step.
// Kept as it is: Accounts Cash Receipt (its Receipt Status decides the result). Name Correction and Owner Change
// also have no Status: their date is the day the step is submitted.
const KEEP_STATUS = [];
for (const [key, config] of Object.entries(PROCESS_CONFIG)) {
  if (!KEEP_STATUS.includes(key) && !config.receiptStatus)
    config.noStatus = true;
}

export const CONFIGURED_STEPS = Object.keys(PROCESS_CONFIG);

// Name Correction and Owner Change above are the pages after Login PMSG.
