// Reads the Login MIS file (CSV or Excel .xlsx) in the browser and gives the template to download.
// No library: CSV is parsed here, and .xlsx (a zip of XML files) is opened with the browser's own
// DecompressionStream. Old .xls files are not supported (save them as .xlsx or .csv).

export const MIS_COLUMNS = ["BP SC Number", "Login Status", "Application No.", "Login Date", "Remark"];

// Header + one example row (its BP SC Number matches no case, so it can stay or be deleted).
export const MIS_TEMPLATE_ROWS = [
  MIS_COLUMNS,
  ["1000000000", "Logged In", "PMSG2026000000", "2026-11-22", "Example row: delete it and add your own"],
];

export function downloadMisTemplate() {
  const csv = MIS_TEMPLATE_ROWS.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  // The byte-order mark makes Excel open it as UTF-8.
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "login-mis-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ---- CSV ----
export function parseCsv(text) {
  const source = text.replace(/^﻿/, "");
  const first = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

// ---- XLSX ----
async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("not a zip");
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = {};
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (/^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(name)) files[name] = decoder.decode(method === 8 ? await inflate(data) : data);
    p += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const columnIndex = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export async function parseXlsx(buffer) {
  const files = await unzip(buffer);
  const sheetName = Object.keys(files).filter((name) => name.includes("worksheets/")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  if (!sheetName) throw new Error("no sheet");
  const parse = (xml) => new DOMParser().parseFromString(xml, "application/xml");
  const shared = files["xl/sharedStrings.xml"]
    ? [...parse(files["xl/sharedStrings.xml"]).getElementsByTagName("si")].map((si) => [...si.getElementsByTagName("t")].map((t) => t.textContent).join(""))
    : [];
  const rows = [];
  for (const rowNode of parse(files[sheetName]).getElementsByTagName("row")) {
    const row = [];
    for (const cell of rowNode.getElementsByTagName("c")) {
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      let value = raw;
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = [...cell.getElementsByTagName("t")].map((t) => t.textContent).join("");
      else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
      row[columnIndex(cell.getAttribute("r") ?? "A1")] = value;
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

// Excel stores dates as day numbers: 46000 -> 2025-12-09.
const fromSerial = (value) => new Date(Math.round((Number(value) - 25569) * 86400000)).toISOString().slice(0, 10);

// File -> [{ bp, status, applicationNo, loginDate, remark }]; throws a readable Error.
export async function readMisFile(file) {
  const name = file.name.toLowerCase();
  let rows;
  if (name.endsWith(".xlsx")) rows = await parseXlsx(await file.arrayBuffer());
  else if (name.endsWith(".csv") || name.endsWith(".txt")) rows = parseCsv(await file.text());
  else throw new Error("Upload a .csv or .xlsx file (use Export Template for the right format).");
  if (rows.length < 2) throw new Error("The file has no data rows.");

  const key = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
  const heads = rows[0].map(key);
  const find = (test) => heads.findIndex(test);
  const bp = find((h) => /^(bpsc|scbp|bp)/.test(h));
  if (bp < 0) throw new Error('The first row must have a "BP SC Number" column. Use Export Template.');
  const status = find((h) => h.includes("status"));
  const application = find((h) => h.includes("application"));
  const date = find((h) => h.includes("date"));
  const remark = find((h) => h.includes("remark"));
  const cell = (row, index) => (index >= 0 ? String(row[index] ?? "").trim() : "");
  return rows.slice(1).map((row) => {
    const rawDate = cell(row, date);
    return {
      bp: cell(row, bp).replace(/\.0+$/, ""),
      status: cell(row, status),
      applicationNo: cell(row, application),
      loginDate: /^\d{5}(\.\d+)?$/.test(rawDate) ? fromSerial(rawDate) : rawDate,
      remark: cell(row, remark),
    };
  }).filter((row) => row.bp);
}

// Does the MIS row say the consumer is logged in? A status word wins; with no status, an application
// number or login date means logged in.
export function misLoggedIn(row) {
  const status = row.status.toLowerCase().replace(/[^a-z]/g, "");
  if (status) return /^(loggedin|logindone|done|yes|y|true|completed|success)/.test(status);
  return Boolean(row.applicationNo || row.loginDate);
}
