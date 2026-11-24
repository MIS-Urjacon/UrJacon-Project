import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// GET /api/village?lat=..&lng=.. -> the village of a point, for the Lead form (after "Capture Live Location").
// The village the point is IN comes first, from:
//   1. Google Geocoding (the same names as Google Maps) when GOOGLE_MAPS_API_KEY is set,
//   2. otherwise OpenStreetMap Nominatim (free, no key).
// VoiceOfVillage (VILLAGE_API_KEY, Bearer token) adds nearby villages, but only those within 5 km: its list
// only holds villages that have coordinates, so farther ones are not "the" village of the point.
// Keys stay on the server.
const timeout = () => AbortSignal.timeout(8000);
const clean = (value) => String(value ?? "").trim();
const unique = (list) => [...new Map(list.filter((v) => v.name).map((v) => [v.name.toLowerCase(), v])).values()];

// Google Maps naming: sub-locality / locality / third-level area.
async function fromGoogle(lat, lng, key) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({ latlng: `${lat},${lng}`, language: "en", key })}`;
  const data = await (await fetch(url, { cache: "no-store", signal: timeout() })).json();
  const order = ["sublocality_level_1", "sublocality", "locality", "administrative_area_level_3"];
  const found = [];
  for (const result of data.results ?? []) {
    for (const component of result.address_components ?? []) {
      const rank = order.findIndex((type) => component.types?.includes(type));
      if (rank >= 0) found.push({ rank, name: clean(component.long_name), place: clean(result.formatted_address) });
    }
  }
  found.sort((a, b) => a.rank - b.rank);
  return unique(found.map(({ name, place }) => ({ name, place, km: null })));
}

// OpenStreetMap: the village / hamlet / town the point lies in.
async function fromOsm(lat, lng) {
  const found = [];
  for (const zoom of [16, 13]) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: String(zoom), addressdetails: "1", "accept-language": "en" })}`,
      { headers: { "User-Agent": "UrjaconProcessSystem/1.0", Accept: "application/json" }, cache: "no-store", signal: timeout() }
    );
    if (!response.ok) continue;
    const data = await response.json();
    const a = data.address ?? {};
    const place = [a.state_district ?? a.county, a.state].filter(Boolean).join(", ");
    for (const field of ["hamlet", "village", "suburb", "neighbourhood", "town", "city_district", "city"]) {
      if (a[field]) found.push({ name: clean(a[field]), place, km: null });
    }
  }
  return unique(found);
}

// VoiceOfVillage: nearby villages, kept only when really close.
async function fromVoice(lat, lng, key) {
  const response = await fetch(
    `https://www.voiceofvillage.com/api/near?${new URLSearchParams({ lat: lat.toFixed(4), lng: lng.toFixed(4), lang: "en" })}`,
    { headers: { Accept: "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) }, cache: "no-store", signal: timeout() }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (Array.isArray(data.villages) ? data.villages : [])
    .map((v) => ({ name: clean(v.name), place: clean(v.place), km: Number(v.km) || null }))
    .filter((v) => v.name && v.km !== null && v.km <= 5);
}

export async function GET(request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const [main, voice] = await Promise.all([
    (googleKey ? fromGoogle(lat, lng, googleKey) : fromOsm(lat, lng)).catch(() => []),
    fromVoice(lat, lng, process.env.VILLAGE_API_KEY?.trim()).catch(() => []),
  ]);
  const villages = unique([...main, ...voice]).slice(0, 4);
  if (!villages.length) return NextResponse.json({ error: "No village found for this location. Type it yourself." }, { status: 404 });
  return NextResponse.json({ village: villages[0].name, villages });
}
