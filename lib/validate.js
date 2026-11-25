import { normName, NAME_DOCS, RECEIVE_DOCS } from "@/lib/workflow";
import { EXTRA_FIELDS } from "@/lib/loanFields";
import { pricingFromInput } from "@/lib/proposal/lead";
import { SURVEY_CHOICES, SURVEY_MATERIALS, SURVEY_NUMBERS, SURVEY_PHOTOS } from "@/lib/surveyFields";
import { HOLD_REASONS, PROCESS_CONFIG, RECEIPT_STATUS } from "@/lib/processConfig";
import { issueFilePattern as uploadFilePattern } from "@/lib/issues";

// Server-side validation of each step. Returns { error } or { data, hold }.
// hold = true means the submission is saved but the case stays at this step.

const str = (v, max = 300) => (v ?? "").toString().trim().slice(0, max);

function balanceClearance(data, row) {
  const totalAmount = Number(row.dealAmount || data.totalAmount || data.balanceDue || 0);
  const amountReceived = data.amountReceived === "" || data.amountReceived == null
    ? Number(data.balanceRecovered)
    : Number(data.amountReceived);
  if (!(totalAmount > 0)) return { error: "Quotation / deal amount is missing for this case" };
  if (!(amountReceived >= 0)) return { error: "Enter the total amount received till now" };
  // An optional discount lowers what the customer has to pay.
  const discount = data.discount === "" || data.discount == null ? 0 : Number(data.discount);
  if (!(discount >= 0)) return { error: "Enter a valid discount" };
  if (discount > totalAmount) return { error: "Discount cannot be more than the total amount" };
  const payable = totalAmount - discount;
  if (amountReceived > payable) return { error: "Received amount cannot be more than the amount to collect after the discount" };
  const remainingBalance = payable - amountReceived;
  const hold = remainingBalance > 0;
  const clearanceDate = str(data.clearanceDate, 10);
  if (!hold && (!/^\d{4}-\d{2}-\d{2}$/.test(clearanceDate) || isNaN(Date.parse(clearanceDate)))) {
    return { error: "Select a valid Balance Clearance Date" };
  }
  return {
    data: {
      workStatus: hold ? "Not Done" : "Done",
      totalAmount,
      discount,
      amountReceived,
      balanceDue: payable,
      balanceRecovered: amountReceived,
      remainingBalance,
      clearanceDate: hold ? "" : clearanceDate,
      holdCode: hold ? "H22" : "",
      holdReason: hold ? HOLD_REASONS.H22 : "",
      retryDate: "",
      remark: str(data.remark, 1000),
    },
    hold,
  };
}

function configuredStep(step, data, row) {
  if (step === "balanceClearance") return balanceClearance(data, row);
  const config = PROCESS_CONFIG[step];
  // Accounts Cash Receipt: the Receipt Status decides the result (see RECEIPT_STATUS).
  const receiptStatus = config.receiptStatus ? str(data.receiptStatus, 60) : "";
  if (config.receiptStatus && !Object.values(RECEIPT_STATUS).includes(receiptStatus)) return { error: "Select the Receipt Status" };
  const workStatus = config.receiptStatus ? (receiptStatus === RECEIPT_STATUS.BELOW ? "Not Done" : "Done") : config.noStatus ? "Done" : str(data.workStatus, 10);
  if (!["Done", "Not Done"].includes(workStatus)) return { error: "Select the Status" };
  const remark = str(data.remark, 1000);
  if (receiptStatus === RECEIPT_STATUS.WITHOUT && !remark) return { error: "Write the remark: who approved dispatch without cash or down payment, and when the payment is expected" };
  const hold = workStatus === "Not Done";
  const holdCode = config.receiptStatus ? (hold ? "H11" : "") : str(data.holdCode, 4);
  if (hold && !remark) return { error: "Remark is required while the step is on hold" };
  if (hold && config.holds?.length && !config.holds.includes(holdCode)) return { error: "Select the Hold Reason Code" };
  if (hold) return { data: { workStatus, holdCode, holdReason: HOLD_REASONS[holdCode] ?? "", retryDate: str(data.retryDate, 10), remark, ...(receiptStatus ? { receiptStatus } : {}) }, hold: true };

  const out = { workStatus, holdCode: "", holdReason: "", retryDate: "", remark, ...(receiptStatus ? { receiptStatus } : {}) };
  // Dispatch Without Cash or Down Payment: the cash details (receipt no., amount, date, signed by, receipt) may stay empty.
  const optional = receiptStatus === RECEIPT_STATUS.WITHOUT;
  for (const item of config.fields) {
    if (item.type === "files") {
      const files = cleanFiles(data[item.key], item.max ?? 5);
      if (item.required && !optional && files.length === 0) return { error: `Upload ${item.label}` };
      out[item.key] = files;
      continue;
    }
    if (item.type === "number") {
      const number = data[item.key] === "" || data[item.key] == null ? NaN : Number(data[item.key]);
      if (item.required && !optional && !(number >= 0)) return { error: `Enter ${item.label}` };
      out[item.key] = Number.isFinite(number) ? number : null;
      continue;
    }
    const value = str(data[item.key], item.type === "materials" ? 2000 : item.type === "text" ? 200 : 30);
    if (item.required && !optional && !value) return { error: `${item.type === "select" ? "Select" : "Enter"} ${item.label}` };
    if (item.options && value && !item.options.includes(value)) return { error: `Select a valid ${item.label}` };
    if (item.type === "date" && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value)))) return { error: `Select a valid ${item.label}` };
    out[item.key] = value;
  }

  if (step === "loanIssue") {
    if (out.loanDecision === "Sanctioned") {
      if (!(out.sanctionedAmount > 0)) return { error: "Enter the Sanctioned Amount" };
      out.rejectionReason = "";
    } else {
      if (!out.rejectionReason) return { error: "Enter the Rejection Reason" };
      out.sanctionedAmount = null;
      // A rejected loan does not move on: it stays in Pending on hold (H08) with the reason.
      return { data: { ...out, workStatus: "Not Done", holdCode: "H08", holdReason: out.rejectionReason, retryDate: "" }, hold: true };
    }
  }
  if (step === "agreementUpload") {
    const requiredStamp = row.state === "Odisha" ? 10 : 50;
    if (out.stampAmount !== requiredStamp) return { error: `Agreement stamp must be ₹${requiredStamp} for ${row.state || "Chhattisgarh"}` };
  }
  if (step === "subsidyChequeReady") {
    if (row.state !== "Odisha") return { error: "Subsidy Cheque flow is available only for Odisha cases" };
    if (out.balanceReceived < out.balanceAmount) return { error: "Full price-minus-subsidy balance must be received" };
    if (out.agreementConfirmed !== "Yes") return { error: "Signed subsidy agreement must be confirmed" };
  }
  if (["dispatch", "cashDispatch"].includes(step)) {
    if (row.steps?.siteSurvey?.status !== "done") return { error: "Complete the survey (Survey List) before dispatch: the survey report is the material list for dispatch" };
    if (row.steps?.cashReceipt?.status !== "done") return { error: "Complete the signed Accounts Cash Receipt before dispatch" };
    if (step === "cashDispatch" && row.state === "Odisha" && !out.tpwodlReference) return { error: "Enter the TPWODL reference for Odisha dispatch" };
  }
  if (step === "billDcr" && row.steps?.paymentWorkStart?.cashOrLoan === "Cash" && row.steps?.cashPaymentReceived?.paymentReceived !== "Yes") {
    return { error: "DCR is blocked until 90% payment is received" };
  }
  if (step === "jeInspection") {
    // The JE visit date is the day the step is submitted (not typed).
    out.jeVisitDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (out.jeApproval === "Rejected") {
      if (!out.remark) return { error: "Write the remark: why the JE rejected the site inspection" };
      // Rejected: the case goes to Document Receive as an issue (see the submit route) and returns here once fixed.
      return { data: { ...out, workStatus: "Not Done", holdCode: "", holdReason: "JE rejected the site inspection", retryDate: "" }, hold: true };
    }
    if (out.jeApproval !== "Approved") return { error: "JE approval is required before commissioning" };
  }
  if (step === "generationWifi") {
    if (out.loginShared !== "Yes") return { error: "Share the inverter login before continuing" };
    // The meter step no longer records "bidirectional"; the rule still applies to cases that did.
    const bidirectional = row.steps?.meterInspection?.bidirectional;
    if (out.plantSwitchedOn === "Yes" && bidirectional && bidirectional !== "Yes") return { error: "The plant can be switched on only with a bidirectional meter" };
  }
  if (step === "portalInspectionApproval") {
    if (out.portalStatus === "Revert") {
      if (!out.remark) return { error: "Write the remark: why the portal reverted the inspection" };
      // Reverted: the case goes to Document Receive as an issue (see the submit route) and returns here once fixed.
      return { data: { ...out, portalApprovalDate: "", workStatus: "Not Done", holdCode: "", holdReason: "Portal reverted the inspection", retryDate: "" }, hold: true };
    }
    if (out.portalStatus !== "Approved") return { error: "Select the Status" };
    if (!out.portalApprovalDate) return { error: "Enter Portal Approval Date" };
  }
  if (step === "chequeDeposit" && out.chequeStatus !== "Cleared") return { error: "Bounced subsidy cheques must be resolved before closure" };
  return { data: out, hold: false };
}

function cleanFiles(list, max) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((f) => f && typeof f.url === "string" && uploadFilePattern.test(f.url))
    .slice(0, max)
    .map((f) => ({ url: f.url, name: str(f.name, 120) }));
}

// Shared validator for the loan steps: Status (Done / Not Done) + Remark,
// plus an amount for the "receive" steps and any extra fields (lib/loanFields.js). Not Done keeps the case at the step.
function simpleStep(withAmount, extra = []) {
  return (data) => {
    // There is no Status field any more: submitting the popup completes the step.
    const workStatus = "Done";
    const remark = str(data.remark, 1000);
    const hold = false;
    const out = { workStatus, remark };
    if (withAmount) {
      const raw = data.amount;
      const amount = raw === "" || raw == null ? NaN : Number(raw);
      if (!hold && !(amount >= 0)) return { error: "Enter the amount received (Bank 70% / Down Payment)" };
      out.amount = Number.isFinite(amount) ? amount : null;
    }
    for (const f of extra) {
      const raw = data[f.key];
      if (f.type === "files") {
        out[f.key] = cleanFiles(raw, f.max ?? 3);
        if (f.required && out[f.key].length === 0) return { error: `Upload ${f.label}` };
        continue;
      }
      if (f.type === "date") {
        const v = str(raw, 10);
        if (!hold && !v) return { error: `Enter ${f.label}` };
        if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v)))) return { error: `Select a valid ${f.label}` };
        out[f.key] = v;
        continue;
      }
      if (f.type === "number") {
        const n = raw === "" || raw == null ? NaN : Number(raw);
        if (!hold && !(n >= 0)) return { error: `Enter ${f.label}` };
        out[f.key] = Number.isFinite(n) ? n : null;
      } else {
        const v = str(raw, 120);
        if (v && f.options && !f.master && !f.options.includes(v)) return { error: `Select a valid ${f.label}` };
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
  warranty(data, row) {
    if (Number(row?.workflowVersion) >= 2 && row?.steps?.balanceClearance?.status !== "done") {
      return { error: "Complete Balance Clearance before warranty" };
    }
    const balanceStatus = str(data.balanceStatus, 20);
    if (!["Cleared", "Pending"].includes(balanceStatus)) {
      return { error: "Select the Balance Status" };
    }
    const balanceDue = data.balanceDue === "" || data.balanceDue == null
      ? NaN
      : Number(data.balanceDue);
    const balanceRecovered = data.balanceRecovered === "" || data.balanceRecovered == null
      ? NaN
      : Number(data.balanceRecovered);
    if (!(balanceDue >= 0)) return { error: "Enter the balance due before recovery" };
    if (!(balanceRecovered >= 0)) return { error: "Enter the amount recovered" };
    const remark = str(data.remark, 1000);
    const hold = balanceStatus === "Pending";
    if (hold && !remark) return { error: "Remark is required while balance is pending" };

    const out = { balanceStatus, balanceDue, balanceRecovered, remark };
    if (hold) {
      return {
        data: {
          ...out,
          holdCode: "H22",
          holdReason: HOLD_REASONS.H22,
          warrantyType: "",
          tataWarrantyReference: "",
          panelWarrantyDcr: "",
          inverterRegistration: "",
          warrantyDate: "",
          handoverKitGiven: "No",
        },
        hold: true,
      };
    }
    if (balanceRecovered < balanceDue) {
      return { error: "Recovered amount must cover the balance due before warranty" };
    }

    const warrantyType = str(data.warrantyType, 20);
    if (!["Tata", "Non-Tata"].includes(warrantyType)) {
      return { error: "Select the Warranty Type" };
    }
    const warrantyDate = str(data.warrantyDate, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(warrantyDate) || isNaN(Date.parse(warrantyDate))) {
      return { error: "Select a valid Warranty Date" };
    }
    if (warrantyDate > new Date().toISOString().slice(0, 10)) {
      return { error: "Warranty Date cannot be in the future" };
    }
    const handoverKitGiven = str(data.handoverKitGiven, 3);
    if (handoverKitGiven !== "Yes") {
      return { error: "Customer handover kit must be given before completion" };
    }

    const tataWarrantyReference = str(data.tataWarrantyReference, 120);
    const panelWarrantyDcr = str(data.panelWarrantyDcr, 10);
    const inverterRegistration = str(data.inverterRegistration, 10);
    if (warrantyType === "Tata" && !tataWarrantyReference) {
      return { error: "Enter the Tata Warranty Reference" };
    }
    if (warrantyType === "Non-Tata") {
      if (panelWarrantyDcr !== "Done") return { error: "Complete the panel warranty through DCR" };
      if (inverterRegistration !== "Done") return { error: "Complete the inverter online registration" };
    }

    return {
      data: {
        ...out,
        warrantyType,
        tataWarrantyReference: warrantyType === "Tata" ? tataWarrantyReference : "",
        panelWarrantyDcr: warrantyType === "Non-Tata" ? panelWarrantyDcr : "",
        inverterRegistration: warrantyType === "Non-Tata" ? inverterRegistration : "",
        warrantyDate,
        handoverKitGiven,
      },
      hold: false,
    };
  },
  // ---- Cash flow ----
  // Ask 90% Payment: the only status is "Send For Approval" (no Done / Not Done); the remark is optional.
  cashAskPayment(data) {
    return { data: { workStatus: "Send For Approval", remark: str(data.remark, 1000) }, hold: false };
  },
  // Yes/No is an answer, not a hold: Yes goes to Dispatch, No goes to approval.
  cashPaymentReceived(data) {
    const paymentReceived = str(data.paymentReceived, 3);
    if (!["Yes", "No"].includes(paymentReceived)) return { error: "Select Yes or No" };
    return { data: { paymentReceived, remark: str(data.remark, 1000) }, hold: false };
  },
  cashApproval: simpleStep(false, EXTRA_FIELDS.cashApproval),
  cashDispatch: simpleStep(false),
  // ---- Loan flow ----
  bankFileReady: simpleStep(false, EXTRA_FIELDS.bankFileReady),
  loanIssue: simpleStep(false),
  fileSubmission: simpleStep(false, EXTRA_FIELDS.fileSubmission),
  firstInstallment: simpleStep(true),
  receiveDp: simpleStep(true),
  dispatch: simpleStep(false),

  login(data, row) {
    // Name Correction / Owner Change buttons: the case goes to that page, then to the Agreement.
    const route = str(data.route, 20);
    if (route) {
      if (!["nameCorrection", "ownerChange"].includes(route)) return { error: "Select a valid correction" };
      if (Number(row?.workflowVersion) < 3) return { error: "This case follows the older flow and cannot use a correction here" };
      const reason = str(data.remark, 1000);
      if (!reason) return { error: `Write the remark: what needs the ${route === "ownerChange" ? "owner change" : "name correction"}` };
      return { data: { loginCheck: route === "ownerChange" ? "Owner Change" : "Name Correction", route, applicationNo: str(data.applicationNo, 120), holdCode: "", holdReason: "", retryDate: "", images: [], remark: reason }, hold: false };
    }
    const loginCheck = str(data.loginCheck, 30);
    if (!["Login Done", "Login Hold"].includes(loginCheck)) {
      return { error: "Select the Login Check in PMSG result" };
    }
    const remark = str(data.remark, 1000);
    const hold = loginCheck === "Login Hold";
    if (hold && !remark) return { error: "Remark is required when login is on hold" };
    const applicationNo = str(data.applicationNo, 120);
    const holdCode = str(data.holdCode, 4);
    const retryDate = str(data.retryDate, 10);
    if (!hold && !applicationNo) return { error: "Enter the PMSG Application No." };
    if (hold && !["H02", "H03"].includes(holdCode)) return { error: "Select the login Hold Reason" };
    return { data: { loginCheck, applicationNo: hold ? "" : applicationNo, holdCode: hold ? holdCode : "", holdReason: hold ? HOLD_REASONS[holdCode] : "", retryDate: hold ? retryDate : "", images: cleanFiles(data.images, 5), remark }, hold };
  },

  documentReceive(data, row) {
    const out = {};
    const correctionDocuments = [];
    for (const [key, label] of NAME_DOCS) {
      const name = str(data[key]?.name, 120);
      if (!name) return { error: `Enter the name on the ${label}` };
      const matched = normName(name) === normName(row.customerName);
      const files = cleanFiles(data[key]?.files, 1);
      if (files.length === 0) return { error: `Upload the received ${label}` };
      const reviewStatus = str(data[key]?.reviewStatus, 30);
      if (!["Proper", "Correction Required"].includes(reviewStatus)) {
        return { error: `Mark the ${label} as proper or correction required` };
      }
      const proper = matched && reviewStatus === "Proper";
      if (!proper) correctionDocuments.push(label);
      out[key] = { name, matched, files, reviewStatus: proper ? "Proper" : "Correction Required" };
    }
    const allProper = correctionDocuments.length === 0;
    const receivedThrough = str(data.receivedThrough, 30);
    if (!["WhatsApp", "Email", "Physical / Courier", "Field visit"].includes(receivedThrough)) {
      return { error: "Select how the documents were received" };
    }
    const receivedDate = str(data.receivedDate, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate) || isNaN(Date.parse(receivedDate))) {
      return { error: "Select a valid Received Date" };
    }
    const systemType = str(data.systemType, 20);
    if (!["Tata", "Non-Tata"].includes(systemType)) return { error: "Select Tata or Non-Tata system type" };
    const pricing = pricingFromInput(data.pricing);
    if (!pricing) return { error: "Enter the system size (kW) and the system price" };
    const paymentMode = str(data.paymentMode, 20);
    if (paymentMode && !["Cash", "Loan", "Subsidy Cheque"].includes(paymentMode)) return { error: "Select a valid Payment Mode" };
    if (paymentMode === "Subsidy Cheque" && row.state !== "Odisha") return { error: "Subsidy Cheque mode is available only for Odisha cases" };
    const correctionType = str(data.correctionType, 30);
    const correctionReason = str(data.correctionReason, 500);
    if (!allProper && !["Document Correction", "Name Correction", "Owner Change", "New PAN"].includes(correctionType)) {
      return { error: "Select the required correction type" };
    }
    if (!allProper && !correctionReason) return { error: "Enter the correction reason" };
    const holdCode = correctionType === "Owner Change" ? "H04" : correctionType === "New PAN" ? "H06" : "H05";
    return {
      data: {
        ...out,
        receivedThrough,
        receivedDate,
        systemType,
        paymentMode,
        pricing,
        terracePhotoFiles: cleanFiles(data.terracePhotoFiles, 1),
        verificationResult: allProper ? "Verified" : "Correction Required",
        documentReviews: Object.fromEntries(
          NAME_DOCS.map(([key]) => [key, out[key].reviewStatus])
        ),
        correctionDocuments: allProper ? [] : correctionDocuments,
        correctionType: allProper ? "" : correctionType,
        correctionReason: allProper ? "" : correctionReason,
        holdCode: allProper ? "" : holdCode,
        holdReason: allProper ? "" : HOLD_REASONS[holdCode],
      },
      hold: !allProper,
    };
  },

  // Document Verification: only confirms the documents received at Document Receive.
  nameCheck(data, row) {
    const verified = Object.fromEntries(NAME_DOCS.map(([key]) => [key, Boolean(data.verified?.[key])]));
    const remark = str(data.remark, 1000);
    const pending = NAME_DOCS.filter(([key]) => !verified[key]).map(([, label]) => label);
    const hold = pending.length > 0;
    if (hold && !remark) return { error: `Remark is required for the documents not verified (${pending.join(", ")})` };
    // Older cases saved their document data here; keep it, only refresh the result.
    const legacy = row?.steps?.nameCheck?.aadhaar
      ? { ...row.steps.nameCheck, verificationResult: hold ? "Pending" : "Verified", correctionType: "", correctionReason: "", correctionDocuments: [], holdCode: "", holdReason: "" }
      : {};
    return { data: { ...legacy, verified, verificationStatus: hold ? "Pending" : "Verified", pendingDocuments: pending, remark }, hold };
  },

  paymentWorkStart(data, row) {
    const cashOrLoan = str(data.cashOrLoan, 20);
    const workStatus = "Done"; // no Status field: submitting completes Payment Work Start
    const corridor = str(data.corridor, 10);
    if (!["Cash", "Loan", "Subsidy Cheque"].includes(cashOrLoan)) return { error: "Select a valid Payment Mode" };
    if (cashOrLoan === "Subsidy Cheque" && row.state !== "Odisha") return { error: "Subsidy Cheque mode is available only for Odisha cases" };
    if (!["Regular", "Special"].includes(corridor)) return { error: "Select the Corridor" };
    return { data: { cashOrLoan, workStatus, corridor }, hold: false };
  },

  siteSurvey(data, row) {
    // Customer, mobile and village come from the case; the survey date and the surveyor are set by the
    // server from the signed-in user when the survey is submitted (see /api/cases/[id]/submit).
    const customerName = str(row?.customerName, 120);
    const contactNumber = String(row?.mobile ?? "").replace(/\D/g, "").slice(-10);
    const village = str(row?.village || row?.address, 200);
    const surveyDate = str(data.surveyDate, 10);
    const surveyorName = str(data.surveyorName, 120);
    const surveyorUsername = str(data.surveyorUsername, 60);
    if (!surveyorName || !/^\d{4}-\d{2}-\d{2}$/.test(surveyDate)) return { error: "The survey date and surveyor could not be set. Please sign in again" };
    const smartMeterPresent = str(data.smartMeterPresent, 3);
    if (!["Yes", "No"].includes(smartMeterPresent)) return { error: "Select whether a smart meter is present" };
    const materialNeeded = str(data.materialNeeded, 1000);

    // The survey form's own questions (lib/surveyFields.js).
    const survey = {};
    for (const q of SURVEY_CHOICES) {
      const value = str(data[q.key], 60);
      if (!value) {
        if (q.required) return { error: `Select ${q.label}` };
        survey[q.key] = "";
        continue;
      }
      if (!q.options.includes(value)) return { error: `Select a valid ${q.label}` };
      survey[q.key] = value;
    }
    for (const q of SURVEY_NUMBERS) {
      const raw = data[q.key];
      const number = raw === "" || raw == null ? NaN : Number(raw);
      if (!Number.isFinite(number) || number < 0) {
        if (q.required) return { error: `Enter ${q.label}` };
        survey[q.key] = null;
        continue;
      }
      if (q.min && number < q.min) return { error: `${q.label} must be at least ${q.min}` };
      survey[q.key] = number;
    }
    survey.materialsAvailable = Array.isArray(data.materialsAvailable) ? SURVEY_MATERIALS.filter((m) => data.materialsAvailable.includes(m)) : [];
    survey.obstacles = str(data.obstacles, 500);
    const installationDate = str(data.installationDate, 10);
    if (installationDate && (!/^\d{4}-\d{2}-\d{2}$/.test(installationDate) || isNaN(Date.parse(installationDate)))) return { error: "Select a valid Tentative Installation Date" };
    survey.installationDate = installationDate;
    survey.photosTaken = Array.isArray(data.photosTaken) ? SURVEY_PHOTOS.filter((p) => data.photosTaken.includes(p)) : [];
    // One PDF of the photos, or the photos themselves (images), up to 5 files.
    const photoPdf = cleanFiles(data.photoPdf, 5);
    if (photoPdf.length === 0) return { error: "Upload the survey photos (PDF or images)" };
    survey.photoPdf = photoPdf;
    survey.surveyorRemarks = str(data.surveyorRemarks, 1000);
    if (!survey.surveyorRemarks) return { error: "Enter the surveyor remarks" };
    return {
      data: { customerName, contactNumber, village, surveyDate, surveyorName, surveyorUsername, smartMeterPresent, materialNeeded, ...survey },
      hold: false,
    };
  },
};

export function evaluate(step, data, row) {
  if (PROCESS_CONFIG[step]) return configuredStep(step, data ?? {}, row);
  return validators[step](data ?? {}, row);
}
