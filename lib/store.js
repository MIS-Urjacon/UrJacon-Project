import { FLOW, stepPath, newSchedule } from "@/lib/workflow";
import { documentIssueReturnStep } from "@/lib/issues";
import { useSupabase, readList, saveListItem, removeListItem } from "@/lib/db";
import { sqlReadCases, sqlGetCase, sqlSaveCase, sqlRemoveCase } from "@/lib/sql";

// Cases are stored through lib/db.js (Supabase, or a local JSON file in dev).

// Older records may lack pipeline fields. Fill them in from what they have:
// each step's Timestamp is when the previous step was submitted.
function normalize(c) {
  const base = { stage: FLOW[0], steps: {}, ...c };
  // Compatibility repair for inspection issues completed in Document Receive before the direct-return
  // transition was introduced. Those records were left at Name Check with the issue still open.
  let reopenedInspectionAt = null;
  const issueReturnStep = documentIssueReturnStep(base.issue);
  const receipt = base.steps.documentReceive;
  if (
    base.stage === "nameCheck" &&
    issueReturnStep &&
    receipt?.status === "done" &&
    receipt.submittedAt &&
    receipt.submittedAt >= base.issue.reportedAt
  ) {
    const resolved = {
      ...base.issue,
      open: false,
      resolvedAt: receipt.submittedAt,
      resolvedBy: receipt.submittedBy ?? "Unknown",
    };
    base.stage = issueReturnStep;
    base.issue = resolved;
    base.issues = (base.issues ?? []).map((issue) =>
      issue.reportedAt === resolved.reportedAt ? resolved : issue
    );
    reopenedInspectionAt = receipt.submittedAt;
  }
  // The order of the first steps changed (Name Check now comes before Login).
  // Cases still in those two steps go to the first one they have not finished.
  if ((base.stage === "login" || base.stage === "nameCheck") && !base.issue?.open) {
    base.stage = FLOW.find((s) => base.steps[s]?.status !== "done") ?? base.stage;
  }
  // Site Survey now runs in parallel with Payment Work Start: a case still waiting at Site Survey after a
  // finished Login moves on to Payment Work Start (the survey stays open on its own page).
  let surveyOpened = null;
  if (base.stage === "siteSurvey" && base.steps.login?.status === "done" && base.steps.siteSurvey?.status !== "done") {
    base.stage = "paymentWorkStart";
    surveyOpened = base.steps.login.submittedAt ?? base.timestamp;
  }
  // Document Receive now holds the document work. Older cases saved it at Document Verification,
  // so show it in Document Receive history; cases that never got that far start at Document Receive.
  let receiveSchedule = null;
  const nc = base.steps.nameCheck;
  if (!base.steps.documentReceive) {
    if (nc?.status === "done" && nc.aadhaar) {
      base.steps = {
        ...base.steps,
        documentReceive: { ...nc, receivedThrough: nc.receivedThrough ?? "", receivedDate: nc.submittedAt?.slice(0, 10) ?? "", derived: true },
      };
      receiveSchedule = { ...newSchedule("documentReceive", base.timestamp), actualDate: nc.submittedAt };
    } else if (base.stage === "nameCheck" && !nc && !base.issue) {
      base.stage = "documentReceive";
      receiveSchedule = newSchedule("documentReceive", base.schedule?.nameCheck?.timestamp ?? base.timestamp);
    }
  }
  // A case marked "done" before a new step was added moves to that new step.
  // Cash cases used to wait at a placeholder stage; they now start the Cash flow.
  if (base.stage === "cash") base.stage = "cashAskPayment";
  const path = stepPath(base);
  if (base.stage === "done" && Number(base.workflowVersion) >= 2) {
    const open = path.find((s) => base.steps[s]?.status !== "done");
    if (open) base.stage = open;
  }
  const schedule = { ...(base.schedule ?? {}) };
  if (reopenedInspectionAt) schedule[issueReturnStep] = newSchedule(issueReturnStep, reopenedInspectionAt);
  if (receiveSchedule && !schedule.documentReceive) schedule.documentReceive = receiveSchedule;
  if (surveyOpened) {
    schedule.paymentWorkStart ??= newSchedule("paymentWorkStart", surveyOpened);
    schedule.siteSurvey ??= newSchedule("siteSurvey", surveyOpened);
  }
  const reached = base.stage === "done" ? path.length : path.indexOf(base.stage);
  path.forEach((step, i) => {
    if (schedule[step] || i > reached) return;
    const ts = i === 0 ? base.timestamp : base.steps[path[i - 1]]?.submittedAt;
    if (!ts) return;
    const done = base.steps[step]?.status === "done";
    schedule[step] = {
      ...newSchedule(step, ts),
      actualDate: done ? base.steps[step].submittedAt : null,
    };
  });
  return { ...base, schedule };
}

export async function readCases() {
  const list = useSupabase ? await sqlReadCases() : ((await readList("cases")) ?? []);
  return list.map(normalize);
}

export async function getCase(id) {
  if (!useSupabase) return (await readCases()).find((c) => c.id === id) ?? null;
  const row = await sqlGetCase(id);
  return row ? normalize(row) : null;
}

// Save one case (insert or update); only that case's rows are written.
export async function saveCase(c) {
  return useSupabase ? sqlSaveCase(c) : saveListItem("cases", c);
}

export async function removeCase(id) {
  return useSupabase ? sqlRemoveCase(id) : removeListItem("cases", id);
}
