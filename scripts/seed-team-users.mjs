// Creates one login per responsible person from /process-reference.
// Run:  node --env-file=.env scripts/seed-team-users.mjs
// Safe to re-run: existing usernames are skipped. Works with Supabase or data/users.json.
import { scryptSync, randomBytes } from "crypto";
import fs from "fs/promises";

// [username, name, role (team key in lib/access.js), password]
export const TEAM_USERS = [
  ["ankita", "Ankita Ahuja", "crm", "Ankita@2026"],
  ["reshmi", "Reshmi", "processing", "Reshmi@2026"],
  ["tripti", "Tripti", "login", "Tripti@2026"],
  ["rashmi", "Rashmi", "login", "Rashmi@2026"],
  ["soniya", "Soniya", "documentation", "Soniya@2026"],
  ["alok", "Alok", "banking", "Alok@2026"],
  ["kishan", "Kishan", "banking", "Kishan@2026"],
  ["pankaj", "Pankaj", "banking", "Pankaj@2026"],
  ["mahesh", "Mahesh", "banking", "Mahesh@2026"],
  ["akash", "Akash", "banking", "Akash@2026"],
  ["chetan", "Chetan", "accounts", "Chetan@2026"],
  ["sahil", "Sahil", "accounts", "Sahil@2026"],
  ["sameer", "Sameer", "dispatch", "Sameer@2026"],
  ["jitendra", "Jitendra", "dispatch", "Jitendra@2026"],
  ["arun", "Arun", "service", "Arun@2026"],
  ["khusboo", "Khusboo Panda", "service", "Khusboo@2026"],
  ["satya", "Satya", "discom", "Satya@2026"],
  ["khemdas", "Khemdas", "discom", "Khemdas@2026"],
  ["md", "MD (Management)", "management", "Md@2026"],
  ["marketing", "Field Marketing", "marketing", "Marketing@2026"],
];

const hash = (p) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
};

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const now = new Date().toISOString();

let existing, save;
if (url && key) {
  const base = `${new URL(url).origin}/rest/v1/urjacon_users`;
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`${base}?select=id,username`, { headers: h });
  if (!r.ok) throw new Error(`read users failed: ${r.status} ${await r.text()}`);
  existing = await r.json();
  save = async (u) => {
    const res = await fetch(base, {
      method: "POST",
      headers: { ...h, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: u.id, username: u.username, name: u.name, role: u.role, active: true,
        password_hash: u.passwordHash, created_at: u.createdAt,
      }),
    });
    if (!res.ok) throw new Error(`save ${u.username} failed: ${res.status} ${await res.text()}`);
  };
} else {
  const file = "data/users.json";
  const list = JSON.parse(await fs.readFile(file, "utf8").catch(() => "[]"));
  existing = list;
  save = async (u) => {
    list.push({ ...u, active: true });
    await fs.writeFile(file, JSON.stringify(list, null, 2));
  };
}

let n = Math.max(0, ...existing.map((u) => Number(u.id.split("-")[1])));
const have = new Set(existing.map((u) => u.username.toLowerCase()));
for (const [username, name, role, password] of TEAM_USERS) {
  if (have.has(username)) { console.log("skip  ", username); continue; }
  n += 1;
  await save({ id: `U-${String(n).padStart(4, "0")}`, username, name, role, passwordHash: hash(password), createdAt: now });
  console.log("added ", username, role);
}
