import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { ALL_STEPS, STAGE_LABEL, TAT_DAYS, agreementFirst, nextStage, newSchedule, surveyOpen } from "@/lib/workflow";
import { evaluate } from "@/lib/validate";
import { getSession } from "@/lib/session";
import { canSubmitStep } from "@/lib/access";
import { canSee, assigneeIds, NO_ASSIGNMENT } from "@/lib/assign";
import { canSeeRecord } from "@/lib/defaultAssignees";
import { documentIssueReturnStep } from "@/lib/issues";

// Submit one pipeline step for a case. On success the case moves to the next
// stage and the step's data is kept as that step's history.
export async function POST(request, { params }) {
  const { id } = await params;
  const { step, data } = await request.json();
  if (!ALL_STEPS.includes(step)) {
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  }
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canSubmitStep(me, step)) {
    return NextResponse.json({ error: "Your role cannot update this step" }, { status: 403 });
  }
  const row = await getCase(id);
  if (!row || !(await canSeeRecord(me, row))) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  // A case that has not passed Login yet follows the new flow (Login -> corrections -> Agreement -> Survey / Payment).
  if (step === "login" && Number(row.workflowVersion) < 3 && !row.steps?.paymentWorkStart && !row.steps?.agreementUpload) row.workflowVersion = 3;
  // Site Survey is filled in parallel with Payment Work Start, so the case is not "at" it.
  const parallelSurvey = step === "siteSurvey" && row.stage !== "siteSurvey" && surveyOpen(row);
  if (row.stage !== step && !parallelSurvey) {
    return NextResponse.json({ error: "This case is not at this step" }, { status: 409 });
  }
  // Site Survey: the survey date and the surveyor are the day and the signed-in user, never typed.
  const surveyInput = step === "siteSurvey"
    ? { ...data, surveyDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), surveyorName: me.name ?? "", surveyorUsername: me.username ?? "" }
    : data;
  const result = evaluate(step, surveyInput, row);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const now = new Date().toISOString();
  // Document Receive sets the case price (price list, subsidy, system) that every later step reads.
  const priced = step === "documentReceive" ? result.data.pricing : null;
  if (priced) {
    Object.assign(row, {
      dealAmount: priced.price,
      kwWanted: priced.kw,
      productCode: priced.productCode || row.productCode || "",
      quotationCentralSubsidy: priced.centralSubsidy,
      quotationStateSubsidy: priced.stateSubsidy,
      quotationSubsidy: priced.subsidy,
      quotationGridType: priced.gridType,
      quotationDcrType: priced.dcrType,
      ...(priced.panelBrand ? { quotationPanelBrand: priced.panelBrand } : {}),
    });
  }
  row.steps = {
    ...row.steps,
    [step]: {
      ...result.data,
      status: result.hold ? "hold" : "done",
      submittedAt: now,
      submittedBy: (await getSession())?.name ?? "Unknown",
    },
  };
  if (!result.hold && parallelSurvey) {
    row.schedule = { ...row.schedule, siteSurvey: { ...(row.schedule?.siteSurvey ?? newSchedule("siteSurvey", now)), actualDate: now } };
  } else if (!result.hold) {
    // Actual Date for this step; Timestamp + Planned Date for the next one.
    let next = nextStage(step, row);
    const issueReturnStep =
      step === "documentReceive" ? documentIssueReturnStep(row.issue) : null;
    // Resolve the issue at its required checkpoint and go back to the step it came from.
    if ((step === "nameCheck" && row.issue?.open) || issueReturnStep) {
      next = row.issue.fromStep;
      const resolved = { ...row.issue, open: false, resolvedAt: now, resolvedBy: row.steps[step].submittedBy };
      row.issues = (row.issues ?? []).map((i) => (i.reportedAt === resolved.reportedAt ? resolved : i));
      row.issue = resolved;
    }
    row.schedule = { ...row.schedule, [step]: { ...row.schedule?.[step], actualDate: now } };
    row.stage = next;
    if (assigneeIds(row).length) Object.assign(row, NO_ASSIGNMENT); // next step: back to automatic
    if (next in TAT_DAYS) row.schedule[next] = newSchedule(next, now);
    // Login done also opens Site Survey (parallel to Payment Work Start).
    if (((step === "login" && !agreementFirst(row)) || (step === "agreementUpload" && agreementFirst(row))) && row.steps.siteSurvey?.status !== "done") {
      row.schedule.siteSurvey = row.schedule.siteSurvey?.timestamp ? row.schedule.siteSurvey : newSchedule("siteSurvey", now);
    }
  }
  // Login Hold: the case goes back to Document Receive (like a reported issue) and returns to Login PMSG
  // once the documents are verified again. Its explicit assignment is cleared, so Document Receive's
  // default assignee gets it.
  if (step === "login" && result.hold) {
    const saved = row.steps.login;
    const issue = {
      open: true,
      fromStep: "login",
      fromLabel: STAGE_LABEL.login,
      type: "Login / PMSG problem",
      description: [`${saved.holdCode} · ${saved.holdReason}`, saved.remark, saved.retryDate ? `Retry on ${saved.retryDate}` : ""].filter(Boolean).join(" — "),
      files: [],
      reportedAt: now,
      reportedBy: saved.submittedBy,
    };
    row.issue = issue;
    row.issues = [...(row.issues ?? []), issue];
    row.stage = "documentReceive";
    if (assigneeIds(row).length) Object.assign(row, NO_ASSIGNMENT);
    row.schedule = { ...row.schedule, documentReceive: newSchedule("documentReceive", now) };
  }
  // A rejected JE inspection or reverted portal approval goes back to Document Receive.
  const RETURN_ISSUE = {
    jeInspection: { type: "Site / technical issue", text: "JE rejected the site inspection" },
    portalInspectionApproval: { type: "Portal / DISCOM issue", text: "Portal reverted the inspection" },
  };
  if (RETURN_ISSUE[step] && result.hold) {
    const saved = row.steps[step];
    const issue = {
      open: true,
      fromStep: step,
      fromLabel: STAGE_LABEL[step],
      type: RETURN_ISSUE[step].type,
      description: `${RETURN_ISSUE[step].text} — ${saved.remark}`,
      files: [],
      reportedAt: now,
      reportedBy: saved.submittedBy,
    };
    row.issue = issue;
    row.issues = [...(row.issues ?? []), issue];
    row.stage = "documentReceive";
    if (assigneeIds(row).length) Object.assign(row, NO_ASSIGNMENT);
    row.schedule = { ...row.schedule, documentReceive: newSchedule("documentReceive", now) };
  }
  await saveCase(row);
  return NextResponse.json(row);
}
