import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Connection + low-level storage helpers.
//  - With SUPABASE_URL and a key set, data lives in Supabase tables (lib/sql.js
//    maps records <-> columns) and uploads go to the Urjacon PMSG bucket (one folder per type).
//  - Without them it falls back to local JSON files in /data (local dev only).
// Server-side only: never expose these keys to the browser.

// Accept a URL pasted with a trailing slash or "/rest/v1": only the origin is needed.
const SB_URL = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL.trim()).origin : undefined;
  } catch {
    return undefined;
  }
})();
// Prefer the service role key; the anon key also works if supabase/schema.sql was run.
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const useSupabase = Boolean(SB_URL && SB_KEY);
const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
// Private bucket for uploads; files sit in one folder per type (Leads, Documents, ...).
// The old flat bucket is still read so files uploaded before the change keep opening.
const BUCKET = process.env.SUPABASE_BUCKET?.trim() || "Urjacon PMSG";
const OLD_BUCKET = "urjacon-uploads";

let client;
export function sb() {
  client ??= createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const fail = (error) => {
  throw new Error(error.message ?? String(error));
};

// On Vercel the disk is read-only, so the JSON fallback can never work there.
function assertWritableFallback() {
  if (process.env.VERCEL) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the Vercel project settings."
    );
  }
}

// ---- Local JSON fallback (used only when Supabase is not configured) ----
const fileOf = (name) => path.join(DATA_DIR, `${name}.json`);

async function readFile(name) {
  try {
    return JSON.parse(await fs.readFile(fileOf(name), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
async function writeFile(name, value) {
  assertWritableFallback();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileOf(name), JSON.stringify(value, null, 2));
}

// Records that each have a unique `id`. Returns null when nothing is stored yet.
export async function readList(name) {
  const rows = await readFile(name);
  return Array.isArray(rows) ? rows : null;
}
export async function saveListItem(name, item) {
  const list = (await readList(name)) ?? [];
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
  await writeFile(name, list);
}
export async function removeListItem(name, id) {
  const list = (await readList(name)) ?? [];
  await writeFile(name, list.filter((x) => x.id !== id));
}
export const readDoc = readFile;
export const writeDoc = writeFile;

// ---- Uploaded files (images / PDFs) ----
export async function saveUpload(name, buffer, contentType) {
  if (!useSupabase) {
    assertWritableFallback();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.dirname(path.join(UPLOAD_DIR, name)), { recursive: true });
    return fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  }
  const { error } = await sb().storage.from(BUCKET).upload(name, buffer, { contentType });
  if (error) fail(error);
}

// Returns a Buffer, or null if the file does not exist.
export async function loadUpload(name) {
  if (!useSupabase) {
    try {
      return await fs.readFile(path.join(UPLOAD_DIR, name));
    } catch {
      return null;
    }
  }
  for (const bucket of [BUCKET, OLD_BUCKET]) {
    const { data, error } = await sb().storage.from(bucket).download(name);
    if (!error && data) return Buffer.from(await data.arrayBuffer());
  }
  return null;
}
