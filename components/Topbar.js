"use client";
import { useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/access";
import { CalendarDays, Bell, LogOut } from "lucide-react";
import { useMe } from "@/lib/useMe";

export default function Topbar() {
  const me = useMe();
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const initials = (me?.name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">
          <CalendarDays size={15} className="text-slate-400" />
          {today || " "}
        </div>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {initials || "·"}
          </div>
          <div className="hidden leading-tight lg:block">
            <div className="text-sm font-semibold">{me?.name ?? " "}</div>
            <div className="text-xs text-slate-400">{ROLE_LABEL[me?.role] ?? me?.role ?? " "}</div>
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
