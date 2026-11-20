"use client";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import AssignDialog from "@/components/AssignDialog";
import { useMe } from "@/lib/useMe";
import { canAssign, assigneeIds } from "@/lib/assign";

// Checkbox selection + bulk "Assign" for a table. Only admin and management get the
// checkboxes (see `useCanAssign`); everyone else sees the table as before.
export function useCanAssign() {
  return canAssign(useMe());
}

export function useSelection(rows) {
  const [ids, setIds] = useState([]);
  const selected = rows.filter((row) => ids.includes(row.id));
  const all = rows.length > 0 && selected.length === rows.length;
  return {
    selected,
    all,
    some: selected.length > 0 && !all,
    isChecked: (id) => ids.includes(id),
    toggle: (id, on) => setIds((current) => (on ? [...current, id] : current.filter((value) => value !== id))),
    toggleAll: (on) => setIds(on ? rows.map((row) => row.id) : []),
    clear: () => setIds([]),
  };
}

const box = "h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--color-brand)]";

export function SelectAllBox({ sel }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className={box}
      checked={sel.all}
      ref={(element) => { if (element) element.indeterminate = sel.some; }}
      onChange={(event) => sel.toggleAll(event.target.checked)}
    />
  );
}

export function RowBox({ sel, row }) {
  return (
    <input
      type="checkbox"
      aria-label={`Select ${row.customerName ?? row.id}`}
      className={box}
      checked={sel.isChecked(row.id)}
      onChange={(event) => sel.toggle(row.id, event.target.checked)}
    />
  );
}

// Toolbar button: assigns every ticked row to one employee in a single step.
export function BulkAssign({ type, sel, onDone }) {
  const [open, setOpen] = useState(false);
  const count = sel.selected.length;
  const first = sel.selected[0];
  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <UserPlus size={15} />
          Assign{count > 1 ? ` (${count})` : ""}
        </button>
      )}
      <AssignDialog
        open={open}
        type={type}
        ids={sel.selected.map((row) => row.id)}
        current={count === 1 ? assigneeIds(first) : []}
        onClose={() => setOpen(false)}
        onDone={(message) => {
          setOpen(false);
          onDone(message);
        }}
      />
    </>
  );
}
