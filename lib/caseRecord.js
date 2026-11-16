import { newSchedule } from "@/lib/workflow";

export function buildCaseRecord(cases, body, options = {}) {
  const bpScNumber = body.bpScNumber?.trim();
  const customerName = body.customerName?.trim();
  if (!bpScNumber || !customerName) {
    return { error: "BP SC Number and Customer Name are required", status: 400 };
  }
  if (cases.some((row) => row.bpScNumber === bpScNumber)) {
    return { error: "This BP SC Number already exists", status: 409 };
  }

  const next = Math.max(0, ...cases.map((row) => Number(row.id?.split("-")[1]) || 0)) + 1;
  const now = options.now ?? new Date().toISOString();
  return {
    record: {
      id: `C-${String(next).padStart(4, "0")}`,
      timestamp: now,
      leadId: options.leadId ?? null,
      bpScNumber,
      customerName,
      village: body.village?.trim() ?? "",
      productCode: body.productCode?.trim() ?? "",
      branch: body.branch?.trim() ?? "",
      dealer: body.dealer?.trim() ?? "",
      liaisoning: body.liaisoning?.trim() ?? "",
      route: body.route?.trim() ?? "",
      dealAmount: Number(body.dealAmount) || 0,
      preferredPaymentMode: ["Cash", "Loan"].includes(body.paymentMode)
        ? body.paymentMode
        : "",
      leadSource: body.source?.trim() ?? "",
      stage: "nameCheck",
      steps: {},
      schedule: { nameCheck: newSchedule("nameCheck", now) },
    },
  };
}
