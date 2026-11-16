import { NextResponse } from "next/server";
import { readCases, writeCases } from "@/lib/store";

const FIELDS = [
  "bpScNumber",
  "customerName",
  "village",
  "productCode",
  "branch",
  "dealer",
  "liaisoning",
  "route",
];

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const cases = await readCases();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  const bp = body.bpScNumber?.trim();
  if (!bp || !body.customerName?.trim()) {
    return NextResponse.json(
      { error: "BP SC Number and Customer Name are required" },
      { status: 400 }
    );
  }
  if (cases.some((c) => c.id !== id && c.bpScNumber === bp)) {
    return NextResponse.json(
      { error: "This BP SC Number already exists" },
      { status: 409 }
    );
  }
  const updated = { ...cases[idx] };
  for (const f of FIELDS) updated[f] = (body[f] ?? "").toString().trim();
  updated.dealAmount = Number(body.dealAmount) || 0;
  cases[idx] = updated;
  await writeCases(cases);
  return NextResponse.json(updated);
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const cases = await readCases();
  await writeCases(cases.filter((c) => c.id !== id));
  return NextResponse.json({ ok: true });
}
