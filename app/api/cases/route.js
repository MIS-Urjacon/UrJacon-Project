import { NextResponse } from "next/server";
import { readCases } from "@/lib/store";
import { getSession } from "@/lib/session";
import { canSee, withAssignees } from "@/lib/assign";
import { readAssigneeDefaults } from "@/lib/defaultAssignees";
import { readUsers } from "@/lib/users";

export async function GET() {
  const me = await getSession();
  const users = await readUsers();
  const defaults = await readAssigneeDefaults(users);
  return NextResponse.json((await readCases()).filter((row) => canSee(me, row, defaults)).map((row) => withAssignees(row, users, defaults)));
}

export async function POST(request) {
  await request.json().catch(() => null);
  return NextResponse.json(
    { error: "Create and confirm a lead before starting a case" },
    { status: 400 }
  );
}
