// Issue Report: any page after Document Verification can send a case back to
// Document Verification & Name Check with the problem details. When it is resolved
// there, the case returns to the step where the issue was reported.
export const ISSUE_TYPES = [
  "Login / PMSG problem",
  "Document or name mismatch",
  "Customer not responding",
  "Portal / DISCOM issue",
  "Bank / loan issue",
  "Payment issue",
  "Site / technical issue",
  "Other",
];

export const issueFilePattern = /^\/api\/files\/[a-f0-9-]{36}\.(jpg|png|webp|gif|pdf)$/;
