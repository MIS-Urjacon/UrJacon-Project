"use client";
import { useEffect, useState } from "react";

// The signed-in user ({ id, username, name, role }), fetched once and shared.
let cache = null;
let inflight = null;

export function useMe() {
  const [me, setMe] = useState(cache);
  useEffect(() => {
    if (cache) return;
    inflight ??= fetch("/api/auth/me").then(async (r) => {
      if (r.status === 401) {
        window.location.assign("/login"); // session ended
        return null;
      }
      cache = await r.json();
      return cache;
    });
    inflight.then(setMe);
  }, []);
  return me;
}
