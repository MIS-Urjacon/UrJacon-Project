"use client";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Sun, Settings } from "lucide-react";
import { STEPS } from "@/lib/steps";
import { useMe } from "@/lib/useMe";

export default function Sidebar() {
  const pathname = usePathname();
  const me = useMe();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm">
          <Sun size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-wide">URJACON</div>
          <div className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            SOLAR PROCESS
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-slate-400 focus-within:border-brand focus-within:bg-white">
          <Search size={15} />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="px-3 pt-4">
        <Link
          href="/dashboard"
          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
            pathname === "/dashboard"
              ? "bg-brand-50 font-semibold text-brand-dark"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          {pathname === "/dashboard" && (
            <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand" />
          )}
          <LayoutDashboard size={18} />
          <span className="flex-1">Dashboard</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {STEPS.map((s, i) => {
          const active = pathname === `/${s.slug}`;
          const Icon = s.icon;
          return (
            <Fragment key={s.slug}>
            {s.group !== STEPS[i - 1]?.group && (
              <div
                className={`px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 ${
                  i === 0 ? "pt-7" : "pt-6"
                }`}
              >
                {s.group}
              </div>
            )}
            <Link
              href={`/${s.slug}`}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-brand-50 font-semibold text-brand-dark"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {active && (
                <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand" />
              )}
              <Icon size={18} />
              <span className="flex-1">{s.label}</span>
              <span
                className={`text-[11px] font-semibold ${
                  active ? "text-brand-dark/70" : "text-slate-300"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </Link>
            </Fragment>
          );
        })}
      </nav>

      {me?.role === "admin" && (
        <div className="border-t border-slate-100 p-3">
          <Link
            href="/settings"
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              pathname === "/settings"
                ? "bg-brand-50 font-semibold text-brand-dark"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {pathname === "/settings" && (
              <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand" />
            )}
            <Settings size={18} />
            Settings
          </Link>
        </div>
      )}
    </aside>
  );
}
