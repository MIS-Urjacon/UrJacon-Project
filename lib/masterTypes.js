// System masters: lists of values the business reuses (shared by UI and API).
// `group` is the small heading shown in Settings > System Masters. The first seven are the
// original masters (unchanged); the rest follow the process flow in the design reference.
export const MASTER_TYPES = [
  { key: "branch", label: "Branch" },
  { key: "dealer", label: "Dealer" },
  { key: "liaisoning", label: "Liaisoning" },
  { key: "productCode", label: "Product Code" },
  { key: "bank", label: "Bank" },
  { key: "responsiblePerson", label: "Responsible Person" },
  { key: "installer", label: "Installer" },

  // Lead and quotation
  { key: "leadSource", label: "Lead Source", group: "LEAD & QUOTATION" },
  { key: "agent", label: "Agent", group: "LEAD & QUOTATION" },
  { key: "contactType", label: "Contact Type", group: "LEAD & QUOTATION" },
  { key: "leadTemperature", label: "Lead Temperature", group: "LEAD & QUOTATION" },
  { key: "quotationEntity", label: "Quotation Entity", group: "LEAD & QUOTATION" },
  { key: "systemType", label: "System Type (DCR / NDCR)", group: "LEAD & QUOTATION" },
  { key: "gridType", label: "Grid Type", group: "LEAD & QUOTATION" },
  { key: "paymentMode", label: "Payment Mode", group: "LEAD & QUOTATION" },

  // Verification and portal
  { key: "state", label: "State", group: "VERIFICATION & PORTAL" },
  { key: "discom", label: "Discom", group: "VERIFICATION & PORTAL" },
  { key: "documentType", label: "Document Type", group: "VERIFICATION & PORTAL" },
  { key: "correctionType", label: "Correction Type", group: "VERIFICATION & PORTAL" },
  { key: "correctionRoute", label: "Correction Route", group: "VERIFICATION & PORTAL" },
  { key: "warrantyType", label: "Warranty Type", group: "VERIFICATION & PORTAL" },
  { key: "holdReason", label: "Hold Reason", group: "VERIFICATION & PORTAL" },

  // Execution, money and closure
  { key: "surveyor", label: "Surveyor", group: "EXECUTION & MONEY" },
  { key: "accountant", label: "Accountant", group: "EXECUTION & MONEY" },
  { key: "mdApprover", label: "MD Approver", group: "EXECUTION & MONEY" },
  { key: "dispatchPerson", label: "Dispatch Person", group: "EXECUTION & MONEY" },
  { key: "paymentType", label: "Payment Type", group: "EXECUTION & MONEY" },
  { key: "subsidyScheme", label: "Subsidy Scheme", group: "EXECUTION & MONEY" },
  { key: "inspectionRoute", label: "Inspection Route", group: "EXECUTION & MONEY" },
  { key: "meterType", label: "Meter Type", group: "EXECUTION & MONEY" },
  { key: "meterSource", label: "Meter Source", group: "EXECUTION & MONEY" },
];
