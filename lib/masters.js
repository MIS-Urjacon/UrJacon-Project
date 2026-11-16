import { promises as fs } from "fs";
import path from "path";
import { MASTER_TYPES } from "@/lib/masterTypes";

// Dummy persistence: data/masters.json -> { branch: ["..."], dealer: [...], ... }
const FILE = path.join(process.cwd(), "data", "masters.json");

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
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(masters, null, 2));
}

export async function readMasters() {
  let data;
  try {
    data = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    data = SEED;
    await writeMasters(data);
  }
  // Always return every known type, even if empty.
  return Object.fromEntries(MASTER_TYPES.map((t) => [t.key, data[t.key] ?? []]));
}
