// Signed session cookie (HMAC-SHA256). Uses Web Crypto so it works both in
// proxy.js and in route handlers. The cookie holds who the user is; the server
// re-checks the user file on API calls (see lib/session.js), so a deleted or
// deactivated user loses access even if the cookie is still valid.
export const COOKIE_NAME = "urjacon_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Dummy default. Set AUTH_SECRET in the environment for anything real.
const SECRET = process.env.AUTH_SECRET || "urjacon-dev-secret-change-me";

const enc = new TextEncoder();
const toB64u = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createSession(user) {
  const payload = toB64u(
    enc.encode(
      JSON.stringify({
        id: user.id,
        u: user.username,
        n: user.name,
        r: user.role,
        p: Array.isArray(user.pages) ? user.pages : undefined,
        exp: Date.now() + SESSION_SECONDS * 1000,
      })
    )
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload)));
  return `${payload}.${toB64u(sig)}`;
}

// Returns the session payload, or null if missing, tampered with or expired.
export async function readSession(token) {
  try {
    if (!token) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64u(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(payload)));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
