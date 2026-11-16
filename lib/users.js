import { promises as fs } from "fs";
import path from "path";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Dummy persistence: data/users.json. Passwords are stored as salted scrypt hashes.
const FILE = path.join(process.cwd(), "data", "users.json");

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function writeUsers(users) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(users, null, 2));
}

// The only account at the start is the dummy admin (username admin, password admin123).
export async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    const seed = [
      {
        id: "U-0001",
        username: "admin",
        name: "Admin",
        role: "admin",
        active: true,
        passwordHash: hashPassword("admin123"),
        createdAt: new Date().toISOString(),
      },
    ];
    await writeUsers(seed);
    return seed;
  }
}

// Never send the password hash to the browser.
export const publicUser = ({ passwordHash, ...rest }) => rest;
