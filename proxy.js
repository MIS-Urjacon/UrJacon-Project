import { NextResponse } from "next/server";
import { COOKIE_NAME, readSession } from "@/lib/auth";
import { canAccessPage, slugOf } from "@/lib/access";

// First line of defence: everything except the login page and login API needs a
// valid session cookie. Route handlers re-check the user where it matters
// (see lib/session.js). Settings is admin-only.
const PUBLIC = ["/login", "/api/auth/login"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request.cookies.get(COOKIE_NAME)?.value);
  const isApi = pathname.startsWith("/api/");

  if (PUBLIC.includes(pathname)) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  if (!session) {
    return isApi
      ? NextResponse.json({ error: "Not signed in" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/settings") && session.r !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Role-based page access (see lib/access.js). Pages only; API routes re-check themselves.
  const slug = slugOf(pathname);
  if (!isApi && slug && !canAccessPage({ role: session.r, pages: session.p }, slug)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
