"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

// The bell in the top bar: work assigned to me. A red dot shows while there is something unread;
// opening the list marks it as read.
export default function NotificationBell() {
  const [data, setData] = useState({ unseen: 0, rows: [] });
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assignments?mine=1", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (data.unseen > 0) {
        await fetch("/api/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seen" }) });
        setData((current) => ({ ...current, unseen: 0 }));
      }
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        <Bell size={16} />
        {data.unseen > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{data.unseen > 9 ? "9+" : data.unseen}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Work assigned to you</div>
          <div className="max-h-80 overflow-y-auto">
            {data.rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing assigned to you yet.</div>}
            {data.rows.map((row) => (
              <Link key={row.id} href={`/${row.page}`} onClick={() => setOpen(false)} className="block border-b border-slate-50 px-4 py-3 hover:bg-slate-50">
                <div className="text-sm font-semibold text-slate-800">{row.customerName || row.recordId}</div>
                <div className="text-xs text-slate-500">{row.pageLabel} · {row.bpScNumber || row.recordId}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  By {row.assignedByName} · {row.assignedOn ? new Date(`${row.assignedOn}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </div>
              </Link>
            ))}
          </div>
          <Link href="/assign-work" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-xs font-semibold text-brand-dark hover:bg-slate-50">View all assignments</Link>
        </div>
      )}
    </div>
  );
}
