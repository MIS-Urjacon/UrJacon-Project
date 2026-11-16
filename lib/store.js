import { promises as fs } from "fs";
import path from "path";
import { FLOW, stepPath, newSchedule } from "@/lib/workflow";

// Dummy persistence: one JSON file. Replace with a real DB later.
const FILE = path.join(process.cwd(), "data", "cases.json");
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

// Older records may lack pipeline fields. Fill them in from what they have:
// each step's Timestamp is when the previous step was submitted.
function normalize(c) {
  const base = { stage: FLOW[0], steps: {}, ...c };
  // The order of the first steps changed (Name Check now comes before Login).
  // Cases still in those two steps go to the first one they have not finished.
  if (base.stage === "login" || base.stage === "nameCheck") {
    base.stage = FLOW.find((s) => base.steps[s]?.status !== "done") ?? base.stage;
  }
  // A case marked "done" before a new step was added moves to that new step.
  // Cash cases used to wait at a placeholder stage; they now start the Cash flow.
  if (base.stage === "cash") base.stage = "cashAskPayment";
  const path = stepPath(base);
  if (base.stage === "done") {
    const open = path.find((s) => base.steps[s]?.status !== "done");
    if (open) base.stage = open;
  }
  const schedule = { ...(base.schedule ?? {}) };
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
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {}
  return list.map(normalize);
}

export async function writeCases(cases) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(cases, null, 2));
}
