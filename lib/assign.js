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

// Explicit assignee ids (older records hold a single `assignedTo`).
export const assigneeIds = (record) =>
  Array.isArray(record?.assignedToIds) && record.assignedToIds.length
    ? record.assignedToIds
    : record?.assignedTo
    ? [record.assignedTo]
    : [];

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

// Default assignee ids of the page the record is on ([] when the page has none).
const defaultsOf = (record, defaults) => defaults?.[pageOf(record)] ?? [];

// Does the user have access to the page this lead / case is on?
export function hasPageAccess(user, record) {
  if (record?.id?.startsWith("L-")) return LEAD_PAGES.some((slug) => canAccessPage(user, slug));
  const slug = STEP_PAGE[record?.stage];
  return slug ? canAccessPage(user, slug) : true; // completed cases have no page
}

// A case with an open Site Survey (parallel to Payment Work Start) is also on the Site Survey page.
const onSurveyPage = (record) => !record?.id?.startsWith("L-") && surveyOpen(record) && record.stage !== "siteSurvey";

export function canSee(user, record, defaults) {
  if (canAssign(user)) return true;
  const ids = assigneeIds(record);
  const surveyIds = defaults?.["site-survey"] ?? [];
  const surveyOk = onSurveyPage(record) && (surveyIds.length ? surveyIds.includes(user?.id) : canAccessPage(user, "site-survey"));
  if (ids.length) return ids.includes(user?.id) || surveyOk;
  const byDefault = defaultsOf(record, defaults);
  return (byDefault.length ? byDefault.includes(user?.id) : hasPageAccess(user, record)) || surveyOk;
}

// Adds `assigneesLabel` / `assigneesAuto` (for the "Assigned To" column) to a record.
// Who the open Site Survey belongs to (default assignees of that page, else everyone with access to it).
function surveyLabel(record, users, defaults) {
  if (!onSurveyPage(record)) return {};
  const ids = defaults?.["site-survey"] ?? [];
  if (ids.length) return { surveyAssigneesLabel: ids.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(", "), surveyAssigneesDefault: true };
  return { surveyAssigneesLabel: users.filter((u) => u.active && !canAssign(u) && canAccessPage(u, "site-survey")).map((u) => u.name).join(", "), surveyAssigneesDefault: false };
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
