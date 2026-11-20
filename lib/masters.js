import { MASTER_TYPES } from "@/lib/masterTypes";
import { useSupabase, readDoc, writeDoc } from "@/lib/db";
import { sqlReadMasters, sqlWriteMasters } from "@/lib/sql";

// Masters are stored through lib/db.js as { branch: ["..."], dealer: [...], ... }

// Starting values come from the design reference and the dummy cases.
const SEED = {
  branch: ["Sarangarh", "Padampur", "Bargarh", "Sohela", "Jharband", "Saraipali"],
  dealer: ["Bantu Sahu", "Rohan", "Sohan", "Dev Kumar", "Net Kumar"],
  liaisoning: ["Satya Kumar Sahu", "Khemdas"],
  productCode: ["PMSG-3KW", "PMSG-5KW"],
  bank: [],
  responsiblePerson: ["Alok", "Kishan", "Pankaj", "Mahesh", "Akash"],
  installer: [],
  // Cleaned list: spelling and spacing/case duplicates merged (Saranagrh -> Sarangarh, Jharbandh -> Jharband, Sohelai -> Sohela).
  route: [
    "Baloda", "Bargarh", "Basna", "Bhanwarpur", "Gaisilat", "Jharband", "Padampur", "Pirda", "Pithora",
    "Raigarh", "Raipur", "Saraipali", "Sarangarh", "Saria", "Sarsiwa", "Sohela",
  ],
  // Starter list; the admin edits it in Settings > System Masters > Brand.
  brand: ["Tata Power Solar", "Adani Solar", "Waaree", "Vikram Solar", "Premier Energies", "Luminous"],
};

// Every known master type is marked "seeded" on each write (see lib/sql.js), so a list the
// admin empties on purpose is never filled again.
export async function writeMasters(masters) {
  const data = { ...masters, _seeded: MASTER_TYPES.map((t) => t.key) };
  return useSupabase ? sqlWriteMasters(data) : writeDoc("masters", data);
}

export async function readMasters() {
  let data = useSupabase ? await sqlReadMasters() : await readDoc("masters");
  // A database from before the newer masters existed: its original seven count as seeded.
  const LEGACY = ["branch", "dealer", "liaisoning", "productCode", "bank", "responsiblePerson", "installer"];
  const seeded = new Set(data ? data._seeded ?? LEGACY : []);
  const missing = MASTER_TYPES.filter((t) => !seeded.has(t.key));
  if (missing.length) {
    data = { ...(data ?? {}) };
    for (const t of missing) data[t.key] = SEED[t.key] ?? [];
    await writeMasters(data);
  }
  // Always return every known type, even if empty.
  return Object.fromEntries(MASTER_TYPES.map((t) => [t.key, data[t.key] ?? []]));
}
