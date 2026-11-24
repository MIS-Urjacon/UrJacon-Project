"use client";
import { useEffect, useState } from "react";
import DropSelect from "@/components/Select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import { Avatar, Button, Pill, Toast } from "@/components/ui";
import { FormActions, Label } from "@/components/steps/shared";
import { useMe } from "@/lib/useMe";
import { ROLE_LABEL, GRANTABLE_PAGES, defaultPages } from "@/lib/access";
import { STEPS } from "@/lib/steps";

const EMPTY = { name: "", username: "", role: "user", password: "", active: true, pages: defaultPages("user") };
// Grantable pages grouped for the checkbox list, in sidebar order.
const PAGE_GROUPS = STEPS.filter((s) => GRANTABLE_PAGES.includes(s.slug)).reduce((acc, s) => {
  (acc[s.group] ??= []).push(s);
  return acc;
}, {});
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const th = "px-2 py-3 align-bottom text-[11px] font-semibold uppercase leading-tight tracking-wider";
const td = "whitespace-nowrap border-t border-slate-100 px-2 py-3.5";

export default function UsersTab() {
  const me = useMe();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: "add" } | { mode: "edit", user }
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function openAdd() {
    setForm(EMPTY);
    setErr("");
    setModal({ mode: "add" });
  }
  function openEdit(u) {
    setForm({ name: u.name, username: u.username, role: u.role, password: "", active: u.active, pages: u.pages ?? defaultPages(u.role) });
    setErr("");
    setModal({ mode: "edit", user: u });
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const editing = modal.mode === "edit";
    const res = await fetch(editing ? `/api/users/${modal.user.id}` : "/api/users", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error || "Could not save the user");
    setModal(null);
    notify(editing ? "User updated" : "User added");
    load();
  }

  async function remove() {
    if (!confirm(`Delete ${modal.user.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${modal.user.id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    setModal(null);
    notify("User deleted");
    load();
  }

  const editing = modal?.mode === "edit";
  const isSelf = editing && modal.user.id === me?.id;

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-slate-500">Create accounts and control who can sign in.</p>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add user
        </Button>
      </div>

      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className={`${th} text-center`}>Action</th>
              <th className={th}>Name</th>
              <th className={th}>Username</th>
              <th className={th}>Role</th>
              <th className={th}>Page access</th>
              <th className={th}>Status</th>
              <th className={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="border-t border-slate-100 px-4 py-4">
                  <div className="skeleton h-5 w-full" />
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="transition hover:bg-slate-50/70">
                <td className="border-t border-slate-100 px-2.5 py-3.5 text-center">
                  <button
                    onClick={() => openEdit(u)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="font-semibold text-slate-800">
                      {u.name}
                      {u.id === me?.id && <span className="ml-2 text-xs font-medium text-slate-400">(you)</span>}
                    </div>
                  </div>
                </td>
                <td className={`${td} font-mono text-[13px] font-medium text-slate-700`}>{u.username}</td>
                <td className={td}>
                  <Pill color={u.role === "admin" ? "blue" : "gray"}>{ROLE_LABEL[u.role] ?? u.role}</Pill>
                </td>
                <td className={td}>
                  {u.role === "admin" ? (
                    <span className="text-slate-500">All pages + Settings</span>
                  ) : u.pages ? (
                    <Pill color="amber">Custom · {u.pages.length} pages</Pill>
                  ) : (
                    <span className="text-slate-500">Role default · {defaultPages(u.role).length} pages</span>
                  )}
                </td>
                <td className={td}>
                  <Pill color={u.active ? "green" : "red"}>{u.active ? "Active" : "Inactive"}</Pill>
                </td>
                <td className={`${td} text-slate-500`}>
                  {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={editing ? "Edit user" : "Add user"}
        subtitle={editing ? `${modal.user.name} · ${modal.user.username}` : "Create a new account."}
        maxWidth="max-w-3xl"
      >
        {modal && (
          <form onSubmit={save} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <Label required>Name</Label>
                <input className="field" required value={form.name} placeholder="Full name"
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <Label required>Username</Label>
                <input className="field" required disabled={editing} value={form.username} placeholder="Username"
                  autoComplete="off"
                  onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </label>
              <label className="block">
                <Label required>Role</Label>
                <DropSelect className="field" disabled={isSelf} value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, pages: defaultPages(e.target.value) })}>
                  <option value="user">User (all steps)</option>
                  <option value="admin">Admin (steps + Settings)</option>
                  {Object.entries(ROLE_LABEL)
                    .filter(([k]) => k !== "admin" && k !== "user")
                    .map(([k, label]) => (
                      <option key={k} value={k}>{label} (own pages only)</option>
                    ))}
                </DropSelect>
              </label>
              <label className="block">
                <Label required={!editing}>Password</Label>
                <input className="field" type="password" autoComplete="new-password" required={!editing}
                  minLength={editing && !form.password ? undefined : 6}
                  placeholder={editing ? "Leave blank to keep" : "At least 6 characters"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              {editing && (
                <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" disabled={isSelf}
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="font-medium text-slate-700">Active (can sign in)</span>
                  {isSelf && <span className="text-xs text-slate-400">You cannot deactivate yourself</span>}
                </label>
              )}
            </div>
            {form.role !== "admin" && (
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Label>Page access</Label>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    {!sameSet(form.pages, defaultPages(form.role)) && (
                      <Pill color="amber">Custom (differs from role)</Pill>
                    )}
                    <button type="button" className="text-brand-dark hover:underline"
                      onClick={() => setForm({ ...form, pages: defaultPages(form.role) })}>Role default</button>
                    <button type="button" className="text-brand-dark hover:underline"
                      onClick={() => setForm({ ...form, pages: [...GRANTABLE_PAGES] })}>Select all</button>
                    <button type="button" className="text-slate-500 hover:underline"
                      onClick={() => setForm({ ...form, pages: [] })}>Clear</button>
                  </div>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Ticked pages are checked from the role. Tick or untick to give this user more or less access.
                  Dashboard, Reports and Process Reference are always available.
                </p>
                <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-4">
                  {Object.entries(PAGE_GROUPS).map(([group, items]) => (
                    <div key={group}>
                      <div className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-slate-400">{group}</div>
                      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        {items.map((s) => (
                          <label key={s.slug} className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]"
                              checked={form.pages.includes(s.slug)}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  pages: e.target.checked
                                    ? [...form.pages, s.slug]
                                    : form.pages.filter((p) => p !== s.slug),
                                })
                              } />
                            {s.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormActions
              onCancel={() => setModal(null)}
              saving={saving}
              error={err}
              submitLabel={editing ? "Save changes" : "Add user"}
              left={
                editing && !isSelf ? (
                  <button type="button" onClick={remove}
                    className="mr-auto inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700">
                    <Trash2 size={15} /> Delete user
                  </button>
                ) : null
              }
            />
          </form>
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
