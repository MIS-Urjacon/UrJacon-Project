"use client";
import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Search, Upload } from "lucide-react";
import { Pill } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/workflow";
import { downloadMisTemplate, misLoggedIn, readMisFile } from "@/lib/misFile";

const th = "px-3 py-3 align-bottom text-[11px] font-semibold uppercase leading-tight tracking-wider";
const td = "whitespace-nowrap border-t border-slate-100 px-3 py-3.5";
const BEFORE_LOGIN = ["documentReceive", "nameCheck"];
const norm = (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase();

// What the system itself knows about a case's login.
function systemLogin(row) {
  if (row.steps?.login?.status === "done") return { text: "Login done", color: "green" };
  if (row.stage === "login") return { text: "Pending at Login PMSG", color: "amber" };
  if (BEFORE_LOGIN.includes(row.stage)) return { text: `Before login (${STAGE_LABEL[row.stage]})`, color: "gray" };
  return { text: STAGE_LABEL[row.stage] ?? row.stage, color: "blue" };
}

// Login page > Upload MIS: upload the MIS file (csv / xlsx, from the template) and see which BP SC numbers
// are logged in and which are not. It only reads the file; nothing in the cases is changed.
export default function LoginMisTab({ rows }) {
  const input = useRef(null);
  const [result, setResult] = useState(null); // { fileName, items }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      setResult({ fileName: file.name, items: await readMisFile(file) });
      setFilter("all");
    } catch (e) {
      setResult(null);
      setError(e.message || "Could not read the file.");
    }
    setBusy(false);
  }

  const analysis = useMemo(() => {
    if (!result) return null;
    const byBp = new Map(rows.map((row) => [norm(row.bpScNumber), row]));
    const inFile = new Set();
    const lines = result.items.map((item, index) => {
      const row = byBp.get(norm(item.bp));
      inFile.add(norm(item.bp));
      const loggedIn = misLoggedIn(item);
      const system = row ? systemLogin(row) : null;
      let check = { text: "BP SC Number is not in the system", color: "red" };
      if (row) {
        const systemDone = row.steps?.login?.status === "done";
        check = loggedIn === systemDone
          ? { text: "Matches the system", color: "green" }
          : loggedIn
          ? { text: "Logged in on the portal, but not marked here", color: "amber" }
          : { text: "Marked logged in here, MIS says not", color: "amber" };
      }
      return { index, item, row, loggedIn, system, check, group: !row ? "missing" : loggedIn ? "in" : "out" };
    });
    // Cases waiting at Login PMSG that the file does not mention.
    const notInFile = rows.filter((row) => row.stage === "login" && !inFile.has(norm(row.bpScNumber)));
    return { lines, notInFile };
  }, [result, rows]);

  const counts = analysis ? {
    in: analysis.lines.filter((l) => l.group === "in").length,
    out: analysis.lines.filter((l) => l.group === "out").length,
    missing: analysis.lines.filter((l) => l.group === "missing").length,
  } : null;
  const shown = (analysis?.lines ?? []).filter((l) => (filter === "all" || l.group === filter) && JSON.stringify([l.item, l.row?.customerName]).toLowerCase().includes(q.toLowerCase()));
  const chips = counts ? [["all", "All", analysis.lines.length], ["in", "Logged in", counts.in], ["out", "Not logged in", counts.out], ["missing", "Not in system", counts.missing]] : [];

  return (
    <div className="space-y-5 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-dark"><FileSpreadsheet size={20} /></span>
          <div>
            <div className="font-semibold text-slate-800">Upload MIS</div>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Upload the login MIS as .csv or .xlsx in the template format. The BP SC numbers in it are matched with the cases here, and you see who is logged in and who is not. Nothing is changed in the cases.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={downloadMisTemplate} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand-dark">
            <Download size={15} /> Export Template
          </button>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60">
            <Upload size={15} /> {busy ? "Reading..." : "Upload MIS file"}
          </button>
          <input ref={input} type="file" hidden accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pick} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {!analysis && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-slate-400">
          No file uploaded yet. Download the template, fill in the BP SC numbers and upload it.
        </div>
      )}

      {analysis && (
        <>
          <div className="text-sm text-slate-500">File: <b className="text-slate-700">{result.fileName}</b> · {analysis.lines.length} rows</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Logged in" value={counts.in} tone="green" />
            <Tile label="Not logged in" value={counts.out} tone="amber" />
            <Tile label="Not in the system" value={counts.missing} tone="red" />
            <Tile label="Pending at Login, not in file" value={analysis.notInFile.length} tone="slate" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {chips.map(([key, label, count]) => (
                <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === key ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand"}`}>
                  {label} <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>
            <div className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-brand">
              <Search size={16} />
              <input placeholder="Search BP SC number, customer..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className={th}>BP SC Number</th><th className={th}>Customer</th><th className={th}>MIS Login Status</th>
                  <th className={th}>Application No.</th><th className={th}>Login Date</th><th className={th}>System Status</th><th className={th}>Check</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ index, item, row, loggedIn, system, check }) => (
                  <tr key={index} className="hover:bg-slate-50/60">
                    <td className={`${td} font-mono text-[13px] font-medium text-slate-700`}>{item.bp}</td>
                    <td className={`${td} font-semibold text-slate-800`}>{row?.customerName ?? <span className="font-normal text-slate-300">-</span>}</td>
                    <td className={td}><Pill color={loggedIn ? "green" : "amber"}>{loggedIn ? "Logged in" : "Not logged in"}</Pill></td>
                    <td className={td}>{item.applicationNo || <span className="text-slate-300">-</span>}</td>
                    <td className={td}>{item.loginDate || <span className="text-slate-300">-</span>}</td>
                    <td className={td}>{system ? <Pill color={system.color}>{system.text}</Pill> : <span className="text-slate-300">-</span>}</td>
                    <td className={td}><Pill color={check.color}>{check.text}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No rows match.</div>}
          </div>

          {analysis.notInFile.length > 0 && (
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending at Login PMSG, not in this file ({analysis.notInFile.length})</div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {analysis.notInFile.map((row) => (
                  <span key={row.id} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600"><b className="font-mono text-slate-800">{row.bpScNumber}</b> · {row.customerName}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  const styles = { green: "border-emerald-200 bg-emerald-50 text-emerald-800", amber: "border-amber-200 bg-amber-50 text-amber-800", red: "border-rose-200 bg-rose-50 text-rose-700", slate: "border-slate-200 bg-slate-50 text-slate-800" };
  return <div className={`rounded-xl border p-4 ${styles[tone]}`}><div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div><div className="mt-1.5 text-2xl font-bold">{value}</div></div>;
}
