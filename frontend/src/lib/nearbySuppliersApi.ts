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
      return await fetchJson<{ ok: boolean; suppliers: OsmSupplier[] }>(path);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
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
