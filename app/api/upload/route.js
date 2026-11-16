import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { saveUpload } from "@/lib/db";

const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
const MAX = 5 * 1024 * 1024;

export async function POST(request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP, GIF or PDF allowed" }, { status: 415 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "File is larger than 5 MB" }, { status: 413 });
  }
  const name = `${randomUUID()}.${ext}`;
  try {
    await saveUpload(name, Buffer.from(await file.arrayBuffer()), file.type);
  } catch (e) {
    console.error("upload failed:", e);
    return NextResponse.json({ error: "Could not save the file. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ url: `/api/files/${name}`, name: file.name, type: file.type });
}
