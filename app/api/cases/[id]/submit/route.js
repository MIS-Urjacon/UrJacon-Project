import { NextResponse } from "next/server";
import { readCases, writeCases } from "@/lib/store";
import { ALL_STEPS, TAT_DAYS, nextStage, newSchedule } from "@/lib/workflow";
import { evaluate } from "@/lib/validate";
import { getSession } from "@/lib/session";

// Submit one pipeline step for a case. On success the case moves to the next
// stage and the step's data is kept as that step's history.
export async function POST(request, { params }) {
  const { id } = await params;
  const { step, data } = await request.json();
  if (!ALL_STEPS.includes(step)) {
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  }
  const cases = await readCases();
  const row = cases.find((c) => c.id === id);
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
    const next = nextStage(step, row);
    row.schedule = { ...row.schedule, [step]: { ...row.schedule?.[step], actualDate: now } };
    row.stage = next;
    if (next in TAT_DAYS) row.schedule[next] = newSchedule(next, now);
  }
  await writeCases(cases);
  return NextResponse.json(row);
}
