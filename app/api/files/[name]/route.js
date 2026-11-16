import { loadUpload } from "@/lib/db";

const NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif|pdf)$/;
const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export async function GET(_request, { params }) {
  const { name } = await params;
  if (!NAME_RE.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = await loadUpload(name);
    if (!buf) return new Response("Not found", { status: 404 });
    return new Response(buf, {
      headers: {
        "Content-Type": MIME[name.split(".").pop()],
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
