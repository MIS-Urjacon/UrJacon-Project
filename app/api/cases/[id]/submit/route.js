import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { ALL_STEPS, TAT_DAYS, nextStage, newSchedule } from "@/lib/workflow";
import { evaluate } from "@/lib/validate";
import { getSession } from "@/lib/session";
import { canSubmitStep } from "@/lib/access";

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
  if (!row) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (row.stage !== step) {
    return NextResponse.json({ error: "This case is not at this step" }, { status: 409 });
  }
  const result = evaluate(step, data, row);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const now = new Date().toISOString();
  row.steps = {
    ...row.steps,
    [step]: {
      ...result.data,
      status: result.hold ? "hold" : "done",
      submittedAt: now,
      submittedBy: (await getSession())?.name ?? "Unknown",
    },
  };
  if (!result.hold) {
    // Actual Date for this step; Timestamp + Planned Date for the next one.
    let next = nextStage(step, row);
    // Document Verification finished for a reported issue: resolve it and go back to the step it came from.
    if (step === "nameCheck" && row.issue?.open) {
      next = row.issue.fromStep;
      const resolved = { ...row.issue, open: false, resolvedAt: now, resolvedBy: row.steps[step].submittedBy };
      row.issues = (row.issues ?? []).map((i) => (i.reportedAt === resolved.reportedAt ? resolved : i));
      row.issue = resolved;
    }
    row.schedule = { ...row.schedule, [step]: { ...row.schedule?.[step], actualDate: now } };
    row.stage = next;
    if (next in TAT_DAYS) row.schedule[next] = newSchedule(next, now);
  }
  await saveCase(row);
  return NextResponse.json(row);
}
