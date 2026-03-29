import { Router, Request, Response } from "express";

const router = Router();
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 12000;
const CORE_SUPPLIER_FILTERS = [
  'node["shop"~"wholesale|supermarket|convenience|greengrocer|kiosk|general|department_store"]',
  'way["shop"~"wholesale|supermarket|convenience|greengrocer|kiosk|general|department_store"]',
  'relation["shop"~"wholesale|supermarket|convenience|greengrocer|kiosk|general|department_store"]',
  'node["amenity"="marketplace"]',
  'way["amenity"="marketplace"]',
  'relation["amenity"="marketplace"]',
];

const BROAD_SUPPLIER_FILTERS = [
  'node["shop"]',
  'way["shop"]',
  'relation["shop"]',
];

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function summarizeUpstreamError(detail: string): string {
  const oneLine = detail.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return oneLine.slice(0, 220);
}

const QUERY_TERM_GROUPS: Array<{ matcher: RegExp; terms: string[] }> = [
  { matcher: /\b(wheat|atta|flour|maida|grain)\b/i, terms: ["wheat", "atta", "flour", "grain", "mill", "chakki", "kirana"] },
  { matcher: /\b(sugar|chai|tea|coffee|masala|spice|salt|oil|rice|dal|lentil)\b/i, terms: ["sugar", "tea", "coffee", "grocery", "kirana", "provision", "wholesale"] },
  { matcher: /\b(milk|dairy|curd|paneer|butter|cheese|yogurt)\b/i, terms: ["milk", "dairy", "paneer", "curd", "cheese", "cream"] },
  { matcher: /\b(fruit|vegetable|veggie|onion|potato|tomato)\b/i, terms: ["fruit", "vegetable", "veggie", "greengrocer", "fresh"] },
  { matcher: /\b(meat|chicken|mutton|fish|egg|seafood)\b/i, terms: ["meat", "chicken", "fish", "butcher", "seafood", "poultry"] },
  { matcher: /\b(medicine|medical|pharma|tablet)\b/i, terms: ["pharmacy", "chemist", "medical", "drug"] },
];

const QUERY_CATEGORY_GROUPS: Array<{ matcher: RegExp; categories: string[] }> = [
  { matcher: /\b(wheat|atta|flour|maida|grain|sugar|chai|tea|coffee|rice|dal|lentil|oil|salt|spice|masala)\b/i, categories: ["supermarket", "convenience", "wholesale", "general", "department_store", "marketplace"] },
  { matcher: /\b(milk|dairy|curd|paneer|butter|cheese|yogurt)\b/i, categories: ["dairy", "supermarket", "convenience", "marketplace"] },
  { matcher: /\b(fruit|vegetable|veggie|onion|potato|tomato)\b/i, categories: ["greengrocer", "marketplace", "supermarket"] },
  { matcher: /\b(meat|chicken|mutton|fish|egg|seafood)\b/i, categories: ["butcher", "seafood", "supermarket", "marketplace"] },
  { matcher: /\b(medicine|medical|pharma|tablet)\b/i, categories: ["pharmacy"] },
];

function expandQueryTerms(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = new Set<string>(q.split(/\s+/).filter(Boolean));
  for (const group of QUERY_TERM_GROUPS) {
    if (group.matcher.test(q)) {
      for (const term of group.terms) terms.add(term);
    }
  }

  return Array.from(terms);
}

function preferredCategories(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const categories = new Set<string>();
  for (const group of QUERY_CATEGORY_GROUPS) {
    if (group.matcher.test(q)) {
      for (const category of group.categories) categories.add(category);
    }
  }

  return Array.from(categories);
}

function filterByItemQueryOrFallback<T extends { name: string; category: string }>(rows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  const terms = expandQueryTerms(q);
  const categories = preferredCategories(q);

  const scoreRows = rows.map((item) => {
    const hay = `${item.name} ${item.category}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (hay.includes(term)) score += 2;
    }

    const category = item.category.toLowerCase();
    for (const preferred of categories) {
      if (category.includes(preferred)) score += 3;
    }

    return { item, score };
  });

  const relevant = scoreRows
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);

  if (relevant.length) return relevant;

  const categoryOnly = rows.filter((item) => {
    const category = item.category.toLowerCase();
    return categories.some((preferred) => category.includes(preferred));
  });

  return categoryOnly.length ? categoryOnly : rows;
}

function buildOverpassQuery(filters: string[], radius: number, lat: number, lng: number): string {
  return [
    "[out:json][timeout:18];",
    "(",
    ...filters.map((f) => `  ${f}(around:${radius},${lat},${lng});`),
    ");",
    "out center tags;",
  ].join("\n");
}

async function callOverpass(query: string, endpoint: string): Promise<{
  ok: true;
  payload: {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };
} | {
  ok: false;
  status?: number;
  message: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        status: response.status,
        message: summarizeUpstreamError(detail) || "Upstream request failed",
      };
    }

    const payload = (await response.json()) as {
      elements?: Array<{
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    return { ok: true, payload };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return { ok: false, message: "Request timed out" };
    }
    return { ok: false, message: error?.message || "Network error" };
  } finally {
    clearTimeout(timer);
  }
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    const requestedRadius = Math.max(500, Math.min(25000, toNumber(req.query.radius) ?? 3500));
    const q = String(req.query.q ?? "").trim().toLowerCase();

    if (lat === null || lng === null) {
      return res.status(400).json({ error: "lat and lng query params are required" });
    }

    const coreRadiusPlan = Array.from(new Set([
      requestedRadius,
      Math.max(requestedRadius, 10000),
      Math.max(requestedRadius, 25000),
    ])).sort((a, b) => a - b);

    const broadRadiusPlan = Array.from(new Set([
      requestedRadius,
      Math.max(requestedRadius, 10000),
      Math.max(requestedRadius, 25000),
    ])).sort((a, b) => a - b);

    let mappedSuppliers: Array<{
      name: string;
      latitude: number;
      longitude: number;
      category: string;
      phone?: string;
      distanceKm: number;
    }> = [];

    const endpointErrors: string[] = [];

    const queryPlan: Array<{ filters: string[]; radii: number[] }> = [
      { filters: CORE_SUPPLIER_FILTERS, radii: coreRadiusPlan },
      { filters: BROAD_SUPPLIER_FILTERS, radii: broadRadiusPlan },
    ];

    for (const step of queryPlan) {
      for (const radius of step.radii) {
      let payload:
        | {
            elements?: Array<{
              lat?: number;
              lon?: number;
              center?: { lat: number; lon: number };
              tags?: Record<string, string>;
            }>;
          }
        | null = null;

        const overpassQuery = buildOverpassQuery(step.filters, radius, lat, lng);

        for (const endpoint of OVERPASS_ENDPOINTS) {
          const result = await callOverpass(overpassQuery, endpoint);
          if (result.ok) {
            payload = result.payload;
            break;
          }

          const statusText = result.status ? `${result.status}` : "no-status";
          endpointErrors.push(`${endpoint} -> ${statusText}: ${result.message}`);
        }

        if (!payload) {
          continue;
        }

        mappedSuppliers = (payload.elements ?? [])
          .map((el) => {
            const latitudeRaw = el.lat ?? el.center?.lat;
            const longitudeRaw = el.lon ?? el.center?.lon;
            if (typeof latitudeRaw !== "number" || typeof longitudeRaw !== "number") return null;
            if (!Number.isFinite(latitudeRaw) || !Number.isFinite(longitudeRaw)) return null;

            const latitude = latitudeRaw;
            const longitude = longitudeRaw;

            const tags = el.tags ?? {};
            const name = tags.name || tags.brand || "Unnamed Supplier";
            const category = tags.shop || tags.amenity || "supplier";
            const phone = tags.phone || tags["contact:phone"] || undefined;
            const distanceKm = haversineKm(lat, lng, latitude, longitude);

            return {
              name,
              latitude,
              longitude,
              category,
              phone,
              distanceKm: Number(distanceKm.toFixed(2)),
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (mappedSuppliers.length > 0) {
          break;
        }
      }

      if (mappedSuppliers.length > 0) {
        break;
      }
    }

    if (!mappedSuppliers.length && endpointErrors.length) {
      return res.status(200).json({
        ok: false,
        center: { lat, lng },
        count: 0,
        suppliers: [],
        warning: "Overpass API is currently busy or unavailable. Showing empty nearby list.",
        detail: endpointErrors,
      });
    }

    const suppliers = filterByItemQueryOrFallback(mappedSuppliers, q).slice(0, 30);

    res.json({
      ok: true,
      center: { lat, lng },
      count: suppliers.length,
      suppliers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch OSM suppliers" });
  }
});

export default router;
