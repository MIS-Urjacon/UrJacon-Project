"use client";
import { useState } from "react";
import UsersTab from "@/components/settings/UsersTab";
import MastersTab from "@/components/settings/MastersTab";
import AssigneesTab from "@/components/settings/AssigneesTab";

const TABS = [
  ["users", "User Management"],
  ["masters", "System Masters"],
  ["assignees", "Assignees"],
];

export default function SettingsPage() {
  const [tab, setTab] = useState("users");
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage users and the system masters. Admin only.</p>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-7 border-b border-slate-100 px-6">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 py-4 text-sm font-semibold transition ${
                tab === k
                  ? "border-brand text-brand-dark"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "users" ? <UsersTab /> : tab === "masters" ? <MastersTab /> : <AssigneesTab />}
      </section>
    </div>
  );
}
