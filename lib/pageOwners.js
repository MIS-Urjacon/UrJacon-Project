// Who owns each page by default (first names, from the Process Reference "Who handles what" list and
// the step owners in lib/processConfig.js). A name is matched with an active user's first name; names
// nobody has are ignored. Used as the starting default in Settings > Assignees, until the admin
// saves a different list for that page. Safe to import on the client.
export const PAGE_OWNERS = {
  leads: ["field"], "call-tracker": ["field"], quotation: ["field"],
  "document-receive": ["reshmi"], "name-check": ["reshmi"], "login-pmsg": ["tripti", "rashmi"],
  "site-survey": ["arun"], "payment-work-start": ["ankita"],
  "name-correction": ["soniya"], "owner-change": ["soniya"], "agreement-upload": ["soniya"], jansamarth: ["reshmi"], "bank-file-ready": ["reshmi"],
  "file-submission": ["alok"], "loan-issue-resolution": ["reshmi"], "first-installment": ["alok"],
  "receive-dp": ["chetan"], dispatch: ["sameer", "jitendra"],
  "cash-ask-payment": ["ankita"], "cash-payment-received": ["ankita"], "cash-approval": ["ankita"],
  "subsidy-cheque-ready": ["chetan"], "cash-receipt": ["chetan", "sahil"], "cash-dispatch": ["sameer", "jitendra"],
  "assign-installer": ["arun"], "installation-complete": ["arun", "soniya"], "bill-dcr": ["chetan"],
  "portal-installation": ["soniya"], "submit-inspection-file": ["satya", "khemdas", "soniya"],
  "meter-install-inspection": ["satya"], "je-inspection": ["satya", "khemdas"],
  "generation-wifi": ["arun", "khusboo"], "portal-inspection-approval": ["soniya"],
  "tariff-code-check": ["soniya"], "final-bank-file": ["alok"], "final-bank-payment": ["chetan"],
  "subsidy-redeem": ["soniya"], "subsidy-disbursal": ["soniya"], "cheque-deposit": ["chetan"],
  "balance-clearance": ["chetan"], warranty: ["arun", "khusboo"],
};

// Ids of the active users who own the page (empty when nobody matches).
export function ownerIds(slug, users) {
  const names = PAGE_OWNERS[slug] ?? [];
  return users
    .filter((u) => u.active !== false && names.includes(String(u.name ?? "").toLowerCase().split(" ")[0]))
    .map((u) => u.id);
}
