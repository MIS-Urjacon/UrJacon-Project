import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/store";
import { ALL_STEPS, STAGE_LABEL, newSchedule } from "@/lib/workflow";
import { ISSUE_TYPES, issueFilePattern } from "@/lib/issues";
import { getSession } from "@/lib/session";
import { canSubmitStep } from "@/lib/access";

// Report an issue from the case's current step. The case goes back to Document
// Verification & Name Check, where the issue is shown; after it is resolved there the
// case returns to the step it was reported from.
export async function POST(request, { params }) {
  const { id } = await params;
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const row = await getCase(id);
  if (!row) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const from = row.stage;
  if (from === "nameCheck" || !ALL_STEPS.includes(from)) {
    return NextResponse.json({ error: "An issue can only be reported from a step after Document Verification" }, { status: 409 });
  }
  if (!canSubmitStep(me, from)) {
    return NextResponse.json({ error: "Your role cannot report an issue on this step" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const type = (body.type ?? "").toString();
  const description = (body.description ?? "").toString().trim().slice(0, 1000);
  if (!ISSUE_TYPES.includes(type)) return NextResponse.json({ error: "Select the issue type" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Describe the issue" }, { status: 400 });
  const files = (Array.isArray(body.files) ? body.files : [])
    .filter((f) => f && typeof f.url === "string" && issueFilePattern.test(f.url))
    .slice(0, 3)
    .map((f) => ({ url: f.url, name: (f.name ?? "Attachment").toString().slice(0, 120) }));

  const now = new Date().toISOString();
  const issue = {
    open: true,
    fromStep: from,
    fromLabel: STAGE_LABEL[from] ?? from,
    type,
    description,
    files,
    reportedAt: now,
    reportedBy: me.name ?? "Unknown",
  };
  row.issue = issue;
  row.issues = [...(row.issues ?? []), issue];
  row.stage = "nameCheck";
  row.schedule = { ...row.schedule, nameCheck: newSchedule("nameCheck", now) };
  await saveCase(row);
  return NextResponse.json(row);
}
