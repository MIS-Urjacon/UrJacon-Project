"use client";
import { Fragment, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import Modal from "@/components/Modal";
import { Button, Toast } from "@/components/ui";
import { ROLE_LABEL, GRANTABLE_PAGES, canAccessPage } from "@/lib/access";
import { canAssign } from "@/lib/assign";
import { ownerIds } from "@/lib/pageOwners";
import { STEPS } from "@/lib/steps";

const th = "whitespace-nowrap border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide";
const td = "border-t border-slate-100 px-4 py-3.5 align-middle";

// Settings > Assignees: the default assignees of every page. Work that arrives on a page (new, next
// step, or back from an issue) with no explicit assignment belongs to them. No default = automatic
// (everyone with access to the page).
export default function AssigneesTab() {
  const [defaults, setDefaults] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // page being edited
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    const [d, u] = await Promise.all([
      fetch("/api/assignee-defaults", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})),
      fetch("/api/assignees", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ]);
    setDefaults(d);
    setUsers(u);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const pages = STEPS.filter((s) => GRANTABLE_PAGES.includes(s.slug));
  const nameOf = (id) => users.find((u) => u.id === id)?.name;
  // The page's own people (lib/pageOwners.js). A page nobody owns yet falls back to everyone who has
  // access to it (admin and management see everything, so they are not part of the list).
  const autoIds = (slug) => {
    const owners = ownerIds(slug, users);
    return owners.length ? owners : users.filter((u) => !canAssign(u) && canAccessPage(u, slug)).map((u) => u.id);
  };
  const sameSet = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

  function open(step) {
    setEditing(step);
    setSelected(defaults[step.slug] ?? autoIds(step.slug));
    setError("");
  }
  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]));

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/assignee-defaults", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: editing.slug, userIds: sameSet(selected, autoIds(editing.slug)) ? [] : selected }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(j.error ?? "Could not save");
    setDefaults(j);
    setEditing(null);
    setToast("Permanent assignees saved");
    setTimeout(() => setToast(""), 2400);
  }

  return (
    <div>
      <p className="px-6 py-4 text-sm text-slate-500">
        Each page starts with its own owner (for example PHS / Loan Decision: Reshmi). The owner gets the work whenever
        it arrives on that page, including when it comes back after an issue. Change it here to give the page to someone
        else. Admin and management can still assign any work to a different person.
      </p>
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className={`${th} text-center`}>Action</th>
              <th className={th}>Page</th>
              <th className={th}>Default assignees</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="border-t border-slate-100 px-4 py-4">
                  <div className="skeleton h-5 w-full" />
                </td>
              </tr>
            )}
            {!loading &&
              pages.map((s, i) => {
                const saved = defaults[s.slug] ?? [];
                const ids = saved.length ? saved : autoIds(s.slug);
                return (
                  <Fragment key={s.slug}>
                    {s.group !== pages[i - 1]?.group && (
                      <tr>
                        <td colSpan={3} className="bg-slate-50/60 px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400">
                          {s.group}
                        </td>
                      </tr>
                    )}
                    <tr className="transition hover:bg-slate-50/70">
                      <td className="border-t border-slate-100 px-2.5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => open(s)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                        >
                          <Pencil size={13} />
                          Change
                        </button>
                      </td>
                      <td className={`${td} font-semibold text-slate-800`}>{s.label}</td>
                      <td className={td}>
                        {ids.length ? (
                          <div className="leading-tight">
                            <span className="font-medium text-slate-700">{ids.map(nameOf).filter(Boolean).join(", ")}</span>
                            {!saved.length && <div className="mt-0.5 text-[11px] text-slate-400">Page owner</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Default assignees" subtitle={editing?.label} maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Assign to ({selected.length} selected)</span>
            <button type="button" onClick={() => setSelected(autoIds(editing.slug))} className="text-xs font-semibold text-brand-dark hover:underline">
              Reset to page owner
            </button>
          </div>
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {users.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand)]"
                  checked={selected.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <span className="text-sm font-medium text-slate-800">{u.name}</span>
                <span className="ml-auto text-xs text-slate-400">{ROLE_LABEL[u.role] ?? u.role}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500"><b>Permanent assignment:</b> these employees get all work that comes to this page, now and in future, until you change it here. Admin and management can still give one piece of work to someone else with the Assign button (temporary).</p>
          <p className="text-xs text-slate-500">Ticked by default: the person who owns this page. Keeping exactly these stays on the page owner; change the ticks to give the page to someone else.</p>
          <div className="flex items-center justify-end gap-3">
            {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
      <Toast message={toast} />
    </div>
  );
}
