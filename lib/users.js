import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { useSupabase, readList, saveListItem, removeListItem } from "@/lib/db";
import { sqlReadUsers, sqlSaveUser, sqlRemoveUser } from "@/lib/sql";

// Users are stored through lib/db.js. Passwords are stored as salted scrypt hashes.

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

export async function saveUser(user) {
  return useSupabase ? sqlSaveUser(user) : saveListItem("users", user);
}

export async function removeUser(id) {
  return useSupabase ? sqlRemoveUser(id) : removeListItem("users", id);
}

// The only account at the start is the dummy admin (username admin, password admin123).
export async function readUsers() {
  const stored = useSupabase ? await sqlReadUsers() : await readList("users");
  if (stored?.length) return stored;
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
  await Promise.all(seed.map(saveUser));
  return seed;
}

// Never send the password hash to the browser.
export const publicUser = ({ passwordHash, ...rest }) => rest;
