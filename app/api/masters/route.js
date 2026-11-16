import { NextResponse } from "next/server";
import { readMasters, writeMasters } from "@/lib/masters";
import { MASTER_TYPES } from "@/lib/masterTypes";
import { requireAdmin } from "@/lib/session";

const valid = (type) => MASTER_TYPES.some((t) => t.key === type);

// Anyone signed in can read the masters (forms use them for suggestions).
export async function GET() {
  return NextResponse.json(await readMasters());
}

// Admin only: add a value to a master.
export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { type, name } = await request.json().catch(() => ({}));
  const value = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!valid(type)) return NextResponse.json({ error: "Unknown master" }, { status: 400 });
  if (!value || value.length > 80) {
    return NextResponse.json({ error: "Enter a value (up to 80 characters)" }, { status: 400 });
  }
  const masters = await readMasters();
  if (masters[type].some((v) => v.toLowerCase() === value.toLowerCase())) {
    return NextResponse.json({ error: "This value already exists" }, { status: 409 });
  }
  masters[type].push(value);
  await writeMasters(masters);
  return NextResponse.json(masters, { status: 201 });
}

// Admin only: remove a value. /api/masters?type=branch&name=Sarangarh
export async function DELETE(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const type = request.nextUrl.searchParams.get("type");
  const name = request.nextUrl.searchParams.get("name");
  if (!valid(type)) return NextResponse.json({ error: "Unknown master" }, { status: 400 });
  const masters = await readMasters();
  masters[type] = masters[type].filter((v) => v !== name);
  await writeMasters(masters);
  return NextResponse.json(masters);
}
