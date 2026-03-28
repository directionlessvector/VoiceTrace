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

  return fetchJson<{ ok: boolean; suppliers: OsmSupplier[] }>(`/api/osm-suppliers?${params.toString()}`);
}

export async function fetchLowStockItems() {
  const userId = await resolveActiveUserId();
  return fetchJson<LowStockItem[]>(`/stock/user/${userId}/low`);
}

export async function fetchUserSuppliers() {
  const userId = await resolveActiveUserId();
  return fetchJson<UserSupplier[]>(`/suppliers/user/${userId}`);
}
