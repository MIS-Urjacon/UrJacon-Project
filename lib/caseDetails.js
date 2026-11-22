// The important details shown at the top of the case popups, and the payment message sent to the
// customer from Ask 90% Payment. Safe to import on the client and the server.

const money = (value) => (Number(value) > 0 ? `₹${Number(value).toLocaleString("en-IN")}` : "");

export const ninetyPercent = (row) => Math.round((Number(row?.dealAmount) || 0) * 0.9);

const entityName = (row) => (/tuskin/i.test(row?.quotationEntity ?? "") ? "Tuskin" : "UrjaCon");

// The message the customer receives with the payment details.
export function paymentMessage(row) {
  const price = Number(row.dealAmount) || 0;
  const ninety = ninetyPercent(row);
  const kw = Number(row.kwWanted) || 0;
  return [
    `Dear ${row.customerName || "Customer"},`,
    `Thank you for choosing ${entityName(row)}. Your ${kw ? `${kw} kW ` : ""}rooftop solar system is ready for dispatch.`,
    "",
    `BP SC Number: ${row.bpScNumber || "-"}`,
    row.quotationReference ? `Quotation: ${row.quotationReference}` : "",
    `System price: ${money(price) || "-"}`,
    `Please pay 90% (${money(ninety) || "-"}) before dispatch.`,
    `The balance ${money(price - ninety) || "-"} is payable after installation.`,
    "",
    "Please send the payment confirmation on this chat after paying.",
    `Team ${entityName(row)}`,
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

const CASH_STEPS = ["cashAskPayment", "cashPaymentReceived", "cashApproval", "cashReceipt", "cashDispatch"];
const LOAN_STEPS = ["bankFileReady", "fileSubmission", "loanIssue", "firstInstallment", "receiveDp", "cashReceipt", "dispatch"];

// Pairs of [label, value] for the popup of `stepKey`; empty values are dropped by <CaseDetails>.
export function importantDetails(row, stepKey) {
  const kw = Number(row.kwWanted) || 0;
  const steps = row.steps ?? {};
  const mode = steps.paymentWorkStart?.cashOrLoan || steps.documentReceive?.paymentMode || row.preferredPaymentMode;
  const items = [
    ["Mobile", row.mobile],
    ["Address", [row.address || row.village, row.state].filter(Boolean).join(", ")],
    ["System", kw ? [`${kw} kW`, row.quotationGridType, row.quotationDcrType].filter(Boolean).join(" · ") : ""],
    ["System Price", money(row.dealAmount)],
    ["Payment Mode", mode],
  ];
  if (CASH_STEPS.includes(stepKey) && mode !== "Loan") {
    items.push(["90% Amount", money(ninetyPercent(row))]);
    items.push(["Balance (10%)", money((Number(row.dealAmount) || 0) - ninetyPercent(row))]);
    if (steps.cashPaymentReceived?.paymentReceived) items.push(["90% Received", steps.cashPaymentReceived.paymentReceived]);
    const sent = row.paymentDetailsSent ?? [];
    if (sent.length) items.push(["Payment Details Sent", new Date(sent.at(-1).at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })]);
  }
  if (LOAN_STEPS.includes(stepKey) && mode === "Loan") {
    const fs = steps.bankFileReady?.bank ? steps.bankFileReady : steps.fileSubmission;
    items.push(["Bank", fs?.bank ? [fs.bank, fs.bankBranch].filter(Boolean).join(", ") : ""]);
    items.push(["Bank Quotation", money(fs?.bankQuotation)]);
    const price = Number(row.dealAmount) || 0;
    const bank70 = Number(steps.firstInstallment?.amount) || 0;
    if (stepKey === "firstInstallment") items.push(["70% of System Price", money(Math.round(price * 0.7))]);
    items.push(["Bank 70% Received", money(bank70)]);
    // Down Payment: the bank's 70% is already collected, so what is left to collect is shown here.
    if (stepKey === "receiveDp") items.push(["Balance after Bank 70%", money(Math.max(0, price - bank70))]);
    else items.push(["Down Payment", money(steps.receiveDp?.amount)]);
  }
  if (["dispatch", "cashDispatch"].includes(stepKey)) {
    const survey = steps.siteSurvey;
    items.push(["Cash Receipt", steps.cashReceipt?.receiptStatus]);
    items.push(["Survey List", survey?.status === "done" ? `Done · ${survey.surveyorName || ""}`.replace(/ · $/, "") : "Pending"]);
  }
  items.push(["PMSG Application No.", steps.login?.applicationNo]);
  return items;
}
