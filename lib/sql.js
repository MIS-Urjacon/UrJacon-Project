import { sb, fail } from "@/lib/db";

// Supabase storage with real columns (see supabase/schema.sql). Every function
// turns a table row back into exactly the object shape the app already uses, so
// the API output does not change.

const iso = (v) => (v ? new Date(v).toISOString() : null);
const num = (v) => (v === null || v === undefined ? null : Number(v));

async function selectAll(tbl, orderCols) {
  const out = [];
  const size = 1000; // Supabase returns at most 1000 rows per request
  for (let from = 0; ; from += size) {
    let q = sb().from(tbl).select("*");
    for (const c of orderCols) q = q.order(c);
    const { data, error } = await q.range(from, from + size - 1);
    if (error) fail(error);
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

const group = (rows, key) => {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r[key])) map.set(r[key], []);
    map.get(r[key]).push(r);
  }
  return map;
};

const pickExtra = (obj, known) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !known.has(k)));

// ===================== Cases =====================
// Case fields -> columns of urjacon_cases
const CASE_COLS = {
  id: "id",
  timestamp: "added_at",
  leadId: "lead_id",
  bpScNumber: "bp_sc_number",
  customerName: "customer_name",
  village: "village",
  productCode: "product_code",
  branch: "branch",
  dealer: "dealer",
  liaisoning: "liaisoning",
  route: "route",
  dealAmount: "deal_amount",
  preferredPaymentMode: "preferred_payment_mode",
  leadSource: "lead_source",
  stage: "stage",
};
const CASE_KNOWN = new Set([...Object.keys(CASE_COLS), "steps", "schedule"]);

// Step fields -> columns of urjacon_case_steps
const STEP_COLS = {
  workStatus: "work_status",
  remark: "remark",
  amount: "amount",
  bank: "bank",
  bankBranch: "bank_branch",
  bankQuotation: "bank_quotation",
  responsiblePerson: "responsible_person",
  approver: "approver",
  installerName: "installer_name",
  paymentReceived: "payment_received",
  loginCheck: "login_check",
  cashOrLoan: "cash_or_loan",
  corridor: "corridor",
  customerName: "customer_name",
  village: "village",
  surveyorName: "surveyor_name",
  contactNumber: "contact_number",
  surveyDate: "survey_date",
};
const STEP_NUMERIC = new Set(["amount", "bankQuotation"]);
const NAME_DOCS = ["aadhaar", "pan", "passbook", "bill"];
const STEP_KNOWN = new Set([
  ...Object.keys(STEP_COLS),
  ...NAME_DOCS,
  "images",
  "status",
  "submittedAt",
  "submittedBy",
]);

function stepRow(caseId, stepKey, s) {
  const row = {
    case_id: caseId,
    step_key: stepKey,
    status: s.status ?? null,
    submitted_at: s.submittedAt ?? null,
    submitted_by: s.submittedBy ?? null,
    images: s.images ?? null,
    extra: pickExtra(s, STEP_KNOWN),
  };
  for (const [k, col] of Object.entries(STEP_COLS)) row[col] = s[k] ?? null;
  for (const d of NAME_DOCS) {
    row[`${d}_name`] = s[d]?.name ?? null;
    row[`${d}_matched`] = s[d] ? Boolean(s[d].matched) : null;
    row[`${d}_files`] = s[d]?.files ?? null;
  }
  return row;
}

function stepFromRow(r) {
  const s = { ...r.extra };
  const documentReviews = r.extra?.documentReviews ?? {};
  for (const [k, col] of Object.entries(STEP_COLS)) {
    if (r[col] !== null) s[k] = STEP_NUMERIC.has(k) ? num(r[col]) : r[col];
  }
  if (r.images !== null) s.images = r.images;
  for (const d of NAME_DOCS) {
    if (r[`${d}_name`] !== null) {
      s[d] = {
        name: r[`${d}_name`],
        matched: r[`${d}_matched`],
        files: r[`${d}_files`] ?? [],
        ...(documentReviews[d] ? { reviewStatus: documentReviews[d] } : {}),
      };
    }
  }
  s.status = r.status;
  s.submittedAt = iso(r.submitted_at);
  s.submittedBy = r.submitted_by;
  return s;
}

function caseFromRows(r, stepRows = [], schedRows = []) {
  const c = { ...r.extra };
  for (const [k, col] of Object.entries(CASE_COLS)) {
    c[k] = col === "added_at" ? iso(r[col]) : r[col] ?? (k === "leadId" ? null : "");
  }
  c.dealAmount = Number(r.deal_amount) || 0;
  c.steps = Object.fromEntries(stepRows.map((s) => [s.step_key, stepFromRow(s)]));
  c.schedule = Object.fromEntries(
    schedRows.map((s) => [
      s.step_key,
      { timestamp: iso(s.arrived_at), plannedDate: iso(s.planned_date), actualDate: iso(s.actual_date) },
    ])
  );
  return c;
}

export async function sqlReadCases() {
  const [cases, steps, sched] = await Promise.all([
    selectAll("urjacon_cases", ["id"]),
    selectAll("urjacon_case_steps", ["case_id", "step_key"]),
    selectAll("urjacon_case_schedule", ["case_id", "step_key"]),
  ]);
  const st = group(steps, "case_id");
  const sc = group(sched, "case_id");
  return cases.map((r) => caseFromRows(r, st.get(r.id), sc.get(r.id)));
}

export async function sqlGetCase(id) {
  const [c, s, sc] = await Promise.all([
    sb().from("urjacon_cases").select("*").eq("id", id).maybeSingle(),
    sb().from("urjacon_case_steps").select("*").eq("case_id", id),
    sb().from("urjacon_case_schedule").select("*").eq("case_id", id),
  ]);
  for (const x of [c, s, sc]) if (x.error) fail(x.error);
  return c.data ? caseFromRows(c.data, s.data, sc.data) : null;
}

export async function sqlSaveCase(c) {
  const row = { extra: pickExtra(c, CASE_KNOWN) };
  for (const [k, col] of Object.entries(CASE_COLS)) row[col] = c[k] ?? null;
  row.deal_amount = Number(c.dealAmount) || 0;
  row.updated_at = new Date().toISOString();
  const { error } = await sb().from("urjacon_cases").upsert(row);
  if (error) fail(error);

  const steps = Object.entries(c.steps ?? {}).map(([k, s]) => stepRow(c.id, k, s));
  const sched = Object.entries(c.schedule ?? {}).map(([k, s]) => ({
    case_id: c.id,
    step_key: k,
    arrived_at: s.timestamp ?? null,
    planned_date: s.plannedDate ?? null,
    actual_date: s.actualDate ?? null,
  }));
  const results = await Promise.all([
    steps.length
      ? sb().from("urjacon_case_steps").upsert(steps, { onConflict: "case_id,step_key" })
      : null,
    sched.length
      ? sb().from("urjacon_case_schedule").upsert(sched, { onConflict: "case_id,step_key" })
      : null,
  ]);
  for (const r of results) if (r?.error) fail(r.error);
}

export async function sqlRemoveCase(id) {
  // Steps and schedule rows are removed by ON DELETE CASCADE.
  const { error } = await sb().from("urjacon_cases").delete().eq("id", id);
  if (error) fail(error);
}

// ===================== Leads =====================
const LEAD_COLS = {
  id: "id",
  timestamp: "created_at",
  updatedAt: "updated_at",
  status: "status",
  lostReason: "lost_reason",
  convertedCaseId: "converted_case_id",
  convertedAt: "converted_at",
  createdBy: "created_by",
  updatedBy: "updated_by",
  customerName: "customer_name",
  mobile: "mobile",
  village: "village",
  address: "address",
  bpScNumber: "bp_sc_number",
  source: "source",
  agent: "agent",
  monthlyBill: "monthly_bill",
  kwWanted: "kw_wanted",
  productCode: "product_code",
  paymentMode: "payment_mode",
  temperature: "temperature",
  nextFollowUp: "next_follow_up",
  outcome: "outcome",
  quotationReference: "quotation_reference",
  commission: "commission",
  branch: "branch",
  dealer: "dealer",
  liaisoning: "liaisoning",
  route: "route",
  dealAmount: "deal_amount",
  leadStage: "lead_stage",
};
const LEAD_TIME = new Set(["created_at", "updated_at", "converted_at"]);
const LEAD_NUMERIC = new Set(["monthlyBill", "kwWanted", "commission", "dealAmount"]);
const LEAD_DOCS = { aadhaar: "doc_aadhaar", pan: "doc_pan", passbook: "doc_passbook", bill: "doc_bill", terracePhoto: "doc_terrace_photo" };
const LEAD_KNOWN = new Set([...Object.keys(LEAD_COLS), "documents", "followUps"]);

function leadFromRows(r, followRows = []) {
  const l = { ...r.extra };
  for (const [k, col] of Object.entries(LEAD_COLS)) {
    if (r[col] === null || r[col] === undefined) {
      if (k === "convertedAt") continue; // only present once converted
      l[k] = k === "convertedCaseId" ? null : LEAD_NUMERIC.has(k) ? 0 : "";
      continue;
    }
    l[k] = LEAD_TIME.has(col) ? iso(r[col]) : LEAD_NUMERIC.has(k) ? Number(r[col]) : r[col];
  }
  l.documents = Object.fromEntries(Object.entries(LEAD_DOCS).map(([k, col]) => [k, Boolean(r[col])]));
  l.followUps = followRows.map((f) => ({
    at: iso(f.followed_at),
    type: f.contact_type,
    outcome: f.outcome,
    nextFollowUp: f.next_follow_up,
    remark: f.remark,
    by: f.by_user,
  }));
  // "Visit By" of each interaction is kept in extra (no column in urjacon_lead_followups).
  for (const [seq, name] of Object.entries(l.followUpVisitBy ?? {})) if (l.followUps[seq]) l.followUps[seq].visitBy = name;
  delete l.followUpVisitBy;
  return l;
}

export async function sqlReadLeads() {
  const [leads, follow] = await Promise.all([
    selectAll("urjacon_leads", ["id"]),
    selectAll("urjacon_lead_followups", ["lead_id", "seq"]),
  ]);
  const f = group(follow, "lead_id");
  return leads.map((r) => leadFromRows(r, f.get(r.id)));
}

export async function sqlGetLead(id) {
  const [l, f] = await Promise.all([
    sb().from("urjacon_leads").select("*").eq("id", id).maybeSingle(),
    sb().from("urjacon_lead_followups").select("*").eq("lead_id", id).order("seq"),
  ]);
  for (const x of [l, f]) if (x.error) fail(x.error);
  return l.data ? leadFromRows(l.data, f.data) : null;
}

export async function sqlSaveLead(l) {
  const row = { extra: pickExtra(l, LEAD_KNOWN) };
  const visits = Object.fromEntries((l.followUps ?? []).map((f, i) => [i, f.visitBy]).filter(([, name]) => name));
  if (Object.keys(visits).length) row.extra = { ...row.extra, followUpVisitBy: visits };
  for (const [k, col] of Object.entries(LEAD_COLS)) row[col] = l[k] ?? null;
  for (const [k, col] of Object.entries(LEAD_DOCS)) row[col] = Boolean(l.documents?.[k]);
  const { error } = await sb().from("urjacon_leads").upsert(row);
  if (error) fail(error);

  const follows = (l.followUps ?? []).map((f, i) => ({
    lead_id: l.id,
    seq: i,
    followed_at: f.at ?? null,
    contact_type: f.type ?? "",
    outcome: f.outcome ?? "",
    next_follow_up: f.nextFollowUp ?? "",
    remark: f.remark ?? "",
    by_user: f.by ?? "",
  }));
  if (follows.length) {
    const r = await sb().from("urjacon_lead_followups").upsert(follows, { onConflict: "lead_id,seq" });
    if (r.error) fail(r.error);
  }
}

export async function sqlRemoveLead(id) {
  const { error } = await sb().from("urjacon_leads").delete().eq("id", id);
  if (error) fail(error);
}

// ===================== Users =====================
const userFromRow = (r) => ({
  id: r.id,
  username: r.username,
  name: r.name,
  role: r.role,
  active: r.active,
  pages: Array.isArray(r.pages) ? r.pages : null, // custom page access; null = role default
  passwordHash: r.password_hash,
  createdAt: iso(r.created_at),
});

export async function sqlReadUsers() {
  return (await selectAll("urjacon_users", ["id"])).map(userFromRow);
}

export async function sqlSaveUser(u) {
  const row = {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: Boolean(u.active),
    password_hash: u.passwordHash,
    created_at: u.createdAt ?? new Date().toISOString(),
  };
  let { error } = await sb().from("urjacon_users").upsert({ ...row, pages: u.pages ?? null });
  // Database without the `pages` column yet (supabase/add_user_pages.sql): fine unless custom pages are needed.
  if (error && /pages/i.test(error.message ?? "")) {
    if (Array.isArray(u.pages)) {
      throw new Error("Run supabase/add_user_pages.sql in Supabase to enable custom page access");
    }
    ({ error } = await sb().from("urjacon_users").upsert(row));
  }
  if (error) fail(error);
}

export async function sqlRemoveUser(id) {
  const { error } = await sb().from("urjacon_users").delete().eq("id", id);
  if (error) fail(error);
}

// ===================== Masters =====================
// One row per value (type, value, sort_order). A "_seeded" row marks that the
// starting values were loaded, so a list emptied on purpose is not re-seeded.
const SEEDED = "_seeded";
const ASSIGNEE_PREFIX = "assignee:";

// Returns { type: [values] } or null if nothing was ever stored.
export async function sqlReadMasters() {
  const rows = await selectAll("urjacon_masters", ["type", "sort_order"]);
  if (!rows.length) return null;
  const out = {};
  for (const r of rows) {
    // "_seeded" rows: value "1" is the old single marker, other values are seeded master types.
    if (r.type === SEEDED) {
      if (r.value !== "1") (out._seeded ??= []).push(r.value);
      continue;
    }
    if (r.type.startsWith(ASSIGNEE_PREFIX)) continue; // default assignees live in the same table
    (out[r.type] ??= []).push(r.value);
  }
  return out;
}

export async function sqlWriteMasters(masters) {
  const existing = await selectAll("urjacon_masters", ["type", "sort_order"]);
  const keep = new Set();
  const rows = [{ type: SEEDED, value: "1", sort_order: 0 }];
  for (const [type, values] of Object.entries(masters)) {
    if (type === SEEDED) {
      values.forEach((key) => {
        keep.add(`${SEEDED}\u0000${key}`);
        rows.push({ type: SEEDED, value: key, sort_order: 0 });
      });
      continue;
    }
    values.forEach((value, i) => {
      keep.add(`${type}\u0000${value}`);
      rows.push({ type, value, sort_order: i });
    });
  }
  const gone = existing.filter((r) => !r.type.startsWith(ASSIGNEE_PREFIX) && !(r.type === SEEDED && r.value === "1") && !keep.has(`${r.type}\u0000${r.value}`));
  const ops = [sb().from("urjacon_masters").upsert(rows, { onConflict: "type,value" })];
  for (const [type, list] of group(gone, "type")) {
    ops.push(sb().from("urjacon_masters").delete().eq("type", type).in("value", list.map((r) => r.value)));
  }
  for (const r of await Promise.all(ops)) if (r.error) fail(r.error);
}

// ===================== Default assignees (per page) =====================
// Stored in urjacon_masters as type "assignee:<page slug>", value = user id (no new table needed).
export async function sqlReadAssigneeDefaults() {
  const rows = await selectAll("urjacon_masters", ["type", "sort_order"]);
  const out = {};
  for (const r of rows) {
    if (r.type.startsWith(ASSIGNEE_PREFIX)) (out[r.type.slice(ASSIGNEE_PREFIX.length)] ??= []).push(r.value);
  }
  return out;
}

export async function sqlWriteAssigneeDefaults(slug, userIds) {
  const type = ASSIGNEE_PREFIX + slug;
  const { error: delError } = await sb().from("urjacon_masters").delete().eq("type", type);
  if (delError) fail(delError);
  if (!userIds.length) return;
  const { error } = await sb().from("urjacon_masters").insert(userIds.map((value, i) => ({ type, value, sort_order: i })));
  if (error) fail(error);
}
