import { NextResponse } from "next/server";
import { readCases } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await readCases());
}

export async function POST(request) {
  await request.json().catch(() => null);
  return NextResponse.json(
    { error: "Create and confirm a lead before starting a case" },
    { status: 400 }
  );
}
