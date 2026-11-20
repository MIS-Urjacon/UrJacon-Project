"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/access";

// Pick one or several employees for a lead / case. With nobody ticked, the work is automatic:
// everyone who has access to the page it is on can see it. `ids` can hold several records.
export default function AssignDialog({ open, type, ids, current = [], onClose, onDone }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(current);
    setError("");
    fetch("/api/assignees")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current.join(",")]);

  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]));

  async function save() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ids, userIds: selected }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) return setError(j.error ?? "Could not assign");
    onDone(j.message);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign work"
      subtitle={`${ids.length} ${type === "case" ? "case" : "lead"}${ids.length > 1 ? "s" : ""} selected`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Assign to ({selected.length} selected)</span>
          <div className="flex gap-3 text-xs font-semibold text-brand-dark">
            <button type="button" onClick={() => setSelected(users.map((u) => u.id))} className="hover:underline">Select all</button>
            <button type="button" onClick={() => setSelected([])} className="hover:underline">Clear</button>
          </div>
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
        <p className="text-xs text-slate-500">
          Nobody ticked = automatic: every employee who has access to this page sees the work. Ticked employees
          (plus admin and management) see it only until it moves to the next step.
        </p>
        <div className="flex items-center justify-end gap-3">
          {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
