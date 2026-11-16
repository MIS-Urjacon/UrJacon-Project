import { NextResponse } from "next/server";
import { readUsers, writeUsers, hashPassword, publicUser } from "@/lib/users";
import { requireAdmin } from "@/lib/session";

const ROLES = ["admin", "user"];
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
  if (activeAdmins(users) < 1) return bad("At least one active admin is required");
  await writeUsers(users);
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
  await writeUsers(rest);
  return NextResponse.json({ ok: true });
}
