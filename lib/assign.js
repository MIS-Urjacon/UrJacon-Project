// Work assignment.
//  - Automatic: work with no explicit assignee belongs to every employee who has access to the
//    page it is currently on (Settings > Users > Page access), so they all see it.
//  - Explicit: admin / management can assign work to one or several employees. Only those
//    employees (plus admin and management) see it. When the work moves to its next step the
//    explicit assignment is cleared and the automatic rule applies again.
//  - Default assignees (Settings > Assignees): each page can have default employees. Work with no
//    explicit assignee that is on such a page belongs to them, however it got there (new work, next
//    step, or coming back from an issue). Pages with no default keep the automatic rule above.
//  - Admin and management always see everything.
import { STEP_PAGE, canAccessPage } from "@/lib/access";
import { surveyOpen } from "@/lib/workflow";

export const canAssign = (user) => ["admin", "management"].includes(user?.role);

// Admin / management retain their existing global assignment access. A page's own
// assignees may also delegate work on that page (or revoke it back to automatic).
export function canManagePageAssignment(user, slug, defaults) {
  if (canAssign(user)) return true;
  if (!user?.id || !slug) return false;
  if (!defaults) return user.assignmentPages?.includes(slug) ?? false;
  const ids = defaults[slug] ?? [];
  return ids.length ? ids.includes(user.id) : canAccessPage(user, slug);
}

// Explicit assignee ids (older records hold a single `assignedTo`).
export const assigneeIds = (record) =>
  Array.isArray(record?.assignedToIds) && record.assignedToIds.length
    ? record.assignedToIds
    : record?.assignedTo
    ? [record.assignedTo]
    : [];

export const surveyAssigneeIds = (record) =>
  Array.isArray(record?.surveyAssignedToIds) && record.surveyAssignedToIds.length
    ? record.surveyAssignedToIds
    : record?.surveyAssignedTo
    ? [record.surveyAssignedTo]
    : [];

export const assigneeIdsForPage = (record, slug) =>
  slug === "site-survey" ? surveyAssigneeIds(record) : assigneeIds(record);

export const NO_ASSIGNMENT = { assignedTo: "", assignedToName: "", assignedToIds: [], assignedBy: "", assignedAt: "" };

const LEAD_PAGES = ["leads", "call-tracker", "quotation"];

// The page (slug) a lead / case is currently on.
export function pageOf(record) {
  if (record?.id?.startsWith("L-")) {
    if (record.leadStage === "new") return "leads";
    if (record.leadStage === "quotation" && record.quotationStatus !== "sent") return "quotation";
    return "call-tracker";
  }
  return STEP_PAGE[record?.stage] ?? "";
}

// A lead can be actionable on more than one page at once (for example a new
// lead is also waiting in Call Tracker). Cases normally have one page, except
// for the parallel Site Survey.
export function pagesOf(record) {
  if (!record?.id?.startsWith("L-")) {
    return [...new Set([pageOf(record), ...(surveyOpen(record) ? ["site-survey"] : [])].filter(Boolean))];
  }
  if (record.status !== "open") return [];
  const pages = [];
  if (record.leadStage === "new") pages.push("leads");
  if (["new", "contacted", "quotation", "documentsReady"].includes(record.leadStage)) pages.push("call-tracker");
  if (record.quotationStatus !== "sent" && record.bpScNumber) pages.push("quotation");
  return pages;
}

// Default assignee ids of the page the record is on ([] when the page has none).
const defaultsOf = (record, defaults) => defaults?.[pageOf(record)] ?? [];

// Does the user have access to the page this lead / case is on?
export function hasPageAccess(user, record) {
  if (record?.id?.startsWith("L-")) return LEAD_PAGES.some((slug) => canAccessPage(user, slug));
  const slug = STEP_PAGE[record?.stage];
  return slug ? canAccessPage(user, slug) : true; // completed cases have no page
}

// A case with an open Site Survey (parallel to Payment Work Start) is also on the Site Survey page.
const onSurveyPage = (record) => !record?.id?.startsWith("L-") && surveyOpen(record);

export function recordIsOnPage(record, slug) {
  return pagesOf(record).includes(slug);
}

export function canSee(user, record, defaults) {
  if (canAssign(user)) return true;
  const ids = assigneeIds(record);
  const explicitSurveyIds = surveyAssigneeIds(record);
  const surveyIds = defaults?.["site-survey"] ?? [];
  const surveyOk = onSurveyPage(record) && (explicitSurveyIds.length
    ? explicitSurveyIds.includes(user?.id) || canManagePageAssignment(user, "site-survey", defaults)
    : surveyIds.length
    ? surveyIds.includes(user?.id)
    : canAccessPage(user, "site-survey"));
  if (ids.length) return ids.includes(user?.id) || pagesOf(record).some((slug) => canManagePageAssignment(user, slug, defaults)) || surveyOk;
  const byDefault = defaultsOf(record, defaults);
  return (byDefault.length ? byDefault.includes(user?.id) : hasPageAccess(user, record)) || surveyOk;
}

// Adds `assigneesLabel` / `assigneesAuto` (for the "Assigned To" column) to a record.
// Who the open Site Survey belongs to (default assignees of that page, else everyone with access to it).
function surveyLabel(record, users, defaults) {
  if (!onSurveyPage(record)) return {};
  const explicit = surveyAssigneeIds(record);
  if (explicit.length) {
    return {
      surveyAssigneesLabel: explicit.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(", "),
      surveyAssigneesAuto: false,
      surveyAssignedBy: record.surveyAssignedBy,
      surveyAssignedAt: record.surveyAssignedAt,
    };
  }
  const ids = defaults?.["site-survey"] ?? [];
  if (ids.length) return { surveyAssigneesLabel: ids.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(", "), surveyAssigneesAuto: true, surveyAssigneesDefault: true };
  return { surveyAssigneesLabel: users.filter((u) => u.active && !canAssign(u) && canAccessPage(u, "site-survey")).map((u) => u.name).join(", "), surveyAssigneesAuto: true, surveyAssigneesDefault: false };
}

export function withAssignees(record, users, defaults) {
  const extra = surveyLabel(record, users, defaults);
  return { ...withMainAssignees(record, users, defaults), ...extra };
}

function withMainAssignees(record, users, defaults) {
  const ids = assigneeIds(record);
  if (ids.length) {
    const names = ids.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean);
    return { ...record, assigneesLabel: names.join(", "), assigneesAuto: false };
  }
  const byDefault = defaultsOf(record, defaults);
  if (byDefault.length) {
    const names = byDefault.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean);
    return { ...record, assigneesLabel: names.join(", "), assigneesAuto: true, assigneesDefault: true };
  }
  const auto = users.filter((u) => u.active && !canAssign(u) && hasPageAccess(u, record)).map((u) => u.name);
  return { ...record, assigneesLabel: auto.join(", "), assigneesAuto: true };
}
