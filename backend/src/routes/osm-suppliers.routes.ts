import { Router, Request, Response } from "express";

const router = Router();
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 12000;

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
    const radius = Math.max(500, Math.min(10000, toNumber(req.query.radius) ?? 3000));
    const q = String(req.query.q ?? "").trim().toLowerCase();

    if (lat === null || lng === null) {
      return res.status(400).json({ error: "lat and lng query params are required" });
    }

    const overpassQuery = [
      "[out:json][timeout:25];",
      "(",
      `  node[\"shop\"~\"wholesale|supermarket|convenience\"](around:${radius},${lat},${lng});`,
      `  way[\"shop\"~\"wholesale|supermarket|convenience\"](around:${radius},${lat},${lng});`,
      `  relation[\"shop\"~\"wholesale|supermarket|convenience\"](around:${radius},${lat},${lng});`,
      ");",
      "out center tags;",
    ].join("\n");

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

    const endpointErrors: string[] = [];
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
      return res.status(502).json({
        error: "Overpass API is currently busy or unavailable. Please retry in a few seconds.",
        detail: endpointErrors,
      });
    }

    const suppliers = (payload.elements ?? [])
      .map((el) => {
        const latitudeRaw = el.lat ?? el.center?.lat;
        const longitudeRaw = el.lon ?? el.center?.lon;
        if (typeof latitudeRaw !== "number" || typeof longitudeRaw !== "number") return null;
        if (!Number.isFinite(latitudeRaw) || !Number.isFinite(longitudeRaw)) return null;

        const latitude = latitudeRaw;
        const longitude = longitudeRaw;

        const tags = el.tags ?? {};
        const name = tags.name || tags.brand || "Unnamed Supplier";
        const category = tags.shop || "supplier";
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
      .filter((item) => {
        if (!q) return true;
        return [item.name, item.category].some((txt) => txt.toLowerCase().includes(q));
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 30);

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
