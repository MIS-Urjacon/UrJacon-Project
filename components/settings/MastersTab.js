"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Toast } from "@/components/ui";
import { MASTER_TYPES } from "@/lib/masterTypes";

export default function MastersTab() {
  const [masters, setMasters] = useState({});
  const [type, setType] = useState(MASTER_TYPES[0].key);
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setMasters(await (await fetch("/api/masters", { cache: "no-store" })).json());
  }
  useEffect(() => {
    load();
  }, []);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  async function add(e) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/masters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: value }),
    });
    if (!res.ok) return setErr((await res.json()).error);
    setMasters(await res.json());
    setValue("");
    notify("Added");
  }

  async function remove(name) {
    const res = await fetch(`/api/masters?type=${type}&name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMasters(await res.json());
      notify("Removed");
    }
  }

  const current = MASTER_TYPES.find((t) => t.key === type);
  const items = masters[type] ?? [];

  return (
    <div className="grid border-t border-slate-100 md:grid-cols-[240px_1fr]">
      <div className="border-b border-slate-100 p-3 md:border-b-0 md:border-r">
        {MASTER_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setType(t.key);
              setErr("");
              setValue("");
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
              type === t.key
                ? "bg-brand-50 font-semibold text-brand-dark"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${type === t.key ? "bg-white text-brand-dark" : "bg-slate-100 text-slate-500"}`}>
              {(masters[t.key] ?? []).length}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        <h3 className="text-base font-semibold">{current.label}</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          Values for {current.label.toLowerCase()}. Add or remove them here.
        </p>

        <form onSubmit={add} className="mt-4 flex max-w-lg gap-3">
          <input
            className="field"
            placeholder={`Add ${current.label.toLowerCase()}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit">
            <Plus size={16} /> Add
          </Button>
        </form>
        {err && <div className="mt-2 text-sm font-medium text-rose-600">{err}</div>}

        <ul className="mt-5 max-w-lg divide-y divide-slate-100 rounded-xl border border-slate-200">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">Nothing added yet</li>
          )}
          {items.map((name) => (
            <li key={name} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-medium text-slate-700">{name}</span>
              <button
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Toast message={toast} />
    </div>
  );
}
