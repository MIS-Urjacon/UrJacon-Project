import { NextResponse } from "next/server";
import { readUsers, saveUser, removeUser, hashPassword, publicUser } from "@/lib/users";
import { requireAdmin } from "@/lib/session";
import { ROLE_KEYS, GRANTABLE_PAGES, defaultPages } from "@/lib/access";

const ROLES = ROLE_KEYS;

// Same rule as POST /api/users: null = follow the role, false = invalid.
function cleanPages(input, role) {
  if (input == null) return null;
  if (!Array.isArray(input) || input.some((p) => !GRANTABLE_PAGES.includes(p))) return false;
  const list = GRANTABLE_PAGES.filter((p) => input.includes(p));
  const def = defaultPages(role);
  return list.length === def.length && list.every((p) => def.includes(p)) ? null : list;
}
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Keep at least one active admin so nobody can lock everyone out.
const activeAdmins = (users) => users.filter((u) => u.active && u.role === "admin").length;

export async function PUT(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const users = await readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return bad("User not found", 404);

  const name = String(b.name ?? user.name).trim();
  const role = b.role ?? user.role;
  const active = b.active ?? user.active;
  if (!name || name.length > 80) return bad("Enter the user's name");
  if (!ROLES.includes(role)) return bad("Select a role");
  if (id === auth.user.id && (role !== "admin" || !active)) {
    return bad("You cannot remove your own admin access or deactivate yourself");
  }
  if (b.password) {
    if (String(b.password).length < 6) return bad("Password must be at least 6 characters");
    user.passwordHash = hashPassword(String(b.password));
  }
  Object.assign(user, { name, role, active: Boolean(active) });
  if ("pages" in b) {
    const pages = cleanPages(b.pages, role);
    if (pages === false) return bad("Invalid page list");
    user.pages = pages;
  }
  if (activeAdmins(users) < 1) return bad("At least one active admin is required");
  await saveUser(user);
  return NextResponse.json(publicUser(user));
}

export async function DELETE(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (id === auth.user.id) return bad("You cannot delete your own account");
  const users = await readUsers();
  const rest = users.filter((u) => u.id !== id);
  if (activeAdmins(rest) < 1) return bad("At least one active admin is required");
  await removeUser(id);
  return NextResponse.json({ ok: true });
}
