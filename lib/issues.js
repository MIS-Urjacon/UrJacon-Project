// JE rejections and portal reverts can be resolved directly at Document Receive.
export function documentIssueReturnStep(issue) {
  if (!issue?.open) return null;
  return ["jeInspection", "portalInspectionApproval"].includes(issue.fromStep)
    ? issue.fromStep
    : null;
}

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

export const issueFilePattern = /^\/api\/files\/(?:[A-Za-z-]+\/)?[a-f0-9-]{36}\.(jpg|png|webp|gif|pdf)$/;
