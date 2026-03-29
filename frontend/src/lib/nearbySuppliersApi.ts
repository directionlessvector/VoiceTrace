import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type OsmSupplier = {
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  phone?: string;
  distanceKm: number;
};

export type LowStockItem = {
  id: string;
  name: string;
  unit: string;
  currentQuantity: string;
  lowStockThreshold: string | null;
};

export type UserSupplier = {
  id: string;
  name: string;
  phone: string | null;
  addressRaw: string | null;
  lat: string | null;
  lng: string | null;
  category: string | null;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

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

async function fetchNearbyOsmSuppliersDirect(lat: number, lng: number, q: string): Promise<{ ok: boolean; suppliers: OsmSupplier[] }> {
  const coreRadiusPlan = [3500, 10000, 25000];
  const broadRadiusPlan = [3500, 10000, 25000];
  const plan: Array<{ filters: string[]; radii: number[] }> = [
    { filters: CORE_SUPPLIER_FILTERS, radii: coreRadiusPlan },
    { filters: BROAD_SUPPLIER_FILTERS, radii: broadRadiusPlan },
  ];

  let lastError: unknown;

  for (const step of plan) {
    for (const radius of step.radii) {
      const overpassQuery = [
        "[out:json][timeout:18];",
        "(",
        ...step.filters.map((f) => `  ${f}(around:${radius},${lat},${lng});`),
        ");",
        "out center tags;",
      ].join("\n");

      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: overpassQuery,
          });

          if (!response.ok) {
            lastError = new Error(`Overpass failed: ${response.status}`);
            continue;
          }

          const payload = (await response.json()) as {
            elements?: Array<{
              lat?: number;
              lon?: number;
              center?: { lat: number; lon: number };
              tags?: Record<string, string>;
            }>;
          };

          const mappedSuppliers = (payload.elements ?? [])
            .map((el) => {
              const latitude = el.lat ?? el.center?.lat;
              const longitude = el.lon ?? el.center?.lon;
              if (typeof latitude !== "number" || typeof longitude !== "number") return null;
              const tags = el.tags ?? {};
              const name = tags.name || tags.brand || "Unnamed Supplier";
              const category = tags.shop || tags.amenity || "supplier";
              const phone = tags.phone || tags["contact:phone"] || undefined;
              const distanceKm = Number(haversineKm(lat, lng, latitude, longitude).toFixed(2));

              return { name, latitude, longitude, category, phone, distanceKm };
            })
            .filter((row): row is OsmSupplier => row !== null)
            .sort((a, b) => a.distanceKm - b.distanceKm);

          const suppliers = filterByItemQueryOrFallback(mappedSuppliers, q).slice(0, 30);

          if (suppliers.length > 0) {
            return { ok: true, suppliers };
          }
        } catch (error) {
          lastError = error;
        }
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error("Failed to fetch nearby suppliers"));
}

export async function fetchNearbyOsmSuppliers(lat: number, lng: number, q: string) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    q,
    radius: "3500",
  });

  const path = `/api/osm-suppliers?${params.toString()}`;
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchJson<{ ok: boolean; suppliers: OsmSupplier[]; warning?: string }>(path);

      if (response.ok === false) {
        return fetchNearbyOsmSuppliersDirect(lat, lng, q);
      }

      if ((response.suppliers?.length ?? 0) === 0 && q.trim()) {
        return fetchNearbyOsmSuppliersDirect(lat, lng, q);
      }

      return response;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      const backendUnavailable =
        message.includes("Cannot connect to backend") ||
        message.includes("Request failed: 404") ||
        message.includes("Request failed: 502");

      if (backendUnavailable) {
        return fetchNearbyOsmSuppliersDirect(lat, lng, q);
      }

      const transient =
        message.includes("Overpass API is currently busy") ||
        message.includes("Overpass API failed: 5") ||
        message.includes("Request failed: 502") ||
        message.includes("Request failed: 503") ||
        message.includes("Request failed: 504");

      if (!transient || attempt === maxAttempts) {
        throw error;
      }

      const backoffMs = attempt * 1200;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw (lastError instanceof Error ? lastError : new Error("Failed to fetch nearby suppliers"));
}

export async function fetchLowStockItems() {
  const userId = await resolveActiveUserId();
  return fetchJson<LowStockItem[]>(`/stock/user/${userId}/low`);
}

export async function fetchUserSuppliers() {
  const userId = await resolveActiveUserId();
  return fetchJson<UserSupplier[]>(`/suppliers/user/${userId}`);
}
