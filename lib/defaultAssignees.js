import { useSupabase, readDoc, writeDoc } from "@/lib/db";
import { sqlReadAssigneeDefaults, sqlWriteAssigneeDefaults } from "@/lib/sql";
import { readUsers } from "@/lib/users";
import { canSee } from "@/lib/assign";
import { PAGE_OWNERS, ownerIds } from "@/lib/pageOwners";

// Default assignees per page: { "<page slug>": [userId, ...] }. Managed in Settings > Assignees.

export async function readAssigneeDefaultsRaw() {
  return (useSupabase ? await sqlReadAssigneeDefaults() : await readDoc("assignee-defaults")) ?? {};
}

export async function writeAssigneeDefault(slug, userIds) {
  if (useSupabase) return sqlWriteAssigneeDefaults(slug, userIds);
  const all = await readAssigneeDefaultsRaw();
  if (userIds.length) all[slug] = userIds;
  else delete all[slug];
  return writeDoc("assignee-defaults", all);
}

// What the visibility rules use. A page's saved list wins; without one the page owners from
// lib/pageOwners.js apply. Only active employees count, so a deactivated or deleted assignee never
// hides work from everyone (the page then falls back to automatic).
export async function readAssigneeDefaults(users) {
  const all = users ?? (await readUsers());
  const active = new Set(all.filter((u) => u.active).map((u) => u.id));
  const saved = await readAssigneeDefaultsRaw();
  const out = {};
  for (const slug of new Set([...Object.keys(PAGE_OWNERS), ...Object.keys(saved)])) {
    const live = (saved[slug] ?? []).filter((id) => active.has(id));
    const ids = live.length ? live : ownerIds(slug, all);
    if (ids.length) out[slug] = ids;
  }
  return out;
}

export async function canSeeRecord(user, record) {
  return canSee(user, record, await readAssigneeDefaults());
}
