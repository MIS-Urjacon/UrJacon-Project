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
};

export async function writeMasters(masters) {
  return useSupabase ? sqlWriteMasters(masters) : writeDoc("masters", masters);
}

export async function readMasters() {
  let data = useSupabase ? await sqlReadMasters() : await readDoc("masters");
  if (!data) {
    data = SEED;
    await writeMasters(data);
  }
  // Always return every known type, even if empty.
  return Object.fromEntries(MASTER_TYPES.map((t) => [t.key, data[t.key] ?? []]));
}
