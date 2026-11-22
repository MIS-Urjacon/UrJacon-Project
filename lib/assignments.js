// Assignment log: one row per assignee every time work is assigned (and one "removed" row when an
// assignment is taken back). It is the history behind the Assign Work page and the bell:
// a row addressed to me with no `seenAt` is a new assignment I have not read yet.
// Storage: table urjacon_assignments (supabase/add_assignments.sql) or data/assignments.json in dev.
//
// Delivery of the message is in-app (the bell). `logAssignments` is also the one place to send a
// WhatsApp / SMS to the assignee when that integration is connected.
import { randomUUID } from "crypto";
import { useSupabase, readList, saveListItem, sb } from "@/lib/db";

const TABLE = "urjacon_assignments";

const toRow = (a) => ({
  id: a.id,
  record_type: a.recordType,
  record_id: a.recordId,
  customer_name: a.customerName ?? "",
  bp_sc_number: a.bpScNumber ?? "",
  page: a.page ?? "",
  page_label: a.pageLabel ?? "",
  action: a.action,
  kind: a.kind ?? "temporary",
  assigned_to_id: a.assignedToId ?? "",
  assigned_to_name: a.assignedToName ?? "",
  assigned_by_id: a.assignedById ?? "",
  assigned_by_name: a.assignedByName ?? "",
  assigned_on: a.assignedOn || null,
  assigned_at: a.assignedAt,
  seen_at: a.seenAt || null,
});

const fromRow = (r) => ({
  id: r.id,
  recordType: r.record_type,
  recordId: r.record_id,
  customerName: r.customer_name ?? "",
  bpScNumber: r.bp_sc_number ?? "",
  page: r.page ?? "",
  pageLabel: r.page_label ?? "",
  action: r.action,
  kind: r.kind ?? "temporary",
  assignedToId: r.assigned_to_id ?? "",
  assignedToName: r.assigned_to_name ?? "",
  assignedById: r.assigned_by_id ?? "",
  assignedByName: r.assigned_by_name ?? "",
  assignedOn: r.assigned_on ?? "",
  assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : "",
  seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : "",
});

// The table is created by supabase/add_assignments.sql; until then the log is simply unavailable
// (assigning work itself keeps working).
const tableMissing = (error) => /does not exist|schema cache|42P01|PGRST205/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`);

// kind: "temporary" (Assign button: until the work moves on) | "permanent" (Settings > Assignees: a page's default assignees).
// entries: { recordType, recordId, customerName, bpScNumber, page, pageLabel, action: "assigned" | "removed",
//            assignedToId, assignedToName, assignedById, assignedByName, assignedOn, assignedAt }
export async function logAssignments(entries) {
  if (!entries.length) return { ok: true };
  const rows = entries.map((e) => ({
    ...e,
    id: `AS-${randomUUID()}`,
    kind: e.kind ?? "temporary",
    // Work assigned to myself needs no notification.
    seenAt: e.action !== "assigned" || e.assignedToId === e.assignedById ? e.assignedAt : "",
  }));
  try {
    if (useSupabase) {
      const { error } = await sb().from(TABLE).insert(rows.map(toRow));
      if (error) throw error;
    } else {
      for (const row of rows) await saveListItem("assignments", row);
    }
    return { ok: true };
  } catch (error) {
    console.error("assignment log not saved:", error?.message ?? error);
    return { ok: false, missing: tableMissing(error) };
  }
}

// Newest first. `available: false` means the table has not been created yet.
export async function readAssignments() {
  try {
    if (useSupabase) {
      const out = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb().from(TABLE).select("*").order("assigned_at", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return { rows: out.map(fromRow), available: true };
    }
    const list = (await readList("assignments")) ?? [];
    return { rows: [...list].sort((a, b) => String(b.assignedAt).localeCompare(String(a.assignedAt))), available: true };
  } catch (error) {
    if (!tableMissing(error)) console.error("assignment log not read:", error?.message ?? error);
    return { rows: [], available: false };
  }
}

// The user has opened the bell: their new assignments count as read.
export async function markAssignmentsSeen(userId) {
  const now = new Date().toISOString();
  try {
    if (useSupabase) {
      const { error } = await sb().from(TABLE).update({ seen_at: now }).eq("assigned_to_id", userId).is("seen_at", null);
      if (error) throw error;
      return;
    }
    const list = (await readList("assignments")) ?? [];
    for (const row of list) if (row.assignedToId === userId && !row.seenAt) await saveListItem("assignments", { ...row, seenAt: now });
  } catch (error) {
    console.error("assignment log not updated:", error?.message ?? error);
  }
}
