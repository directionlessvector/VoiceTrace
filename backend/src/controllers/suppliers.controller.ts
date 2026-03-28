import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { suppliers } from "../db/schema";

export async function createSupplier(data: {
  userId: string;
  name: string;
  phone?: string;
  addressRaw?: string;
  lat?: string;
  lng?: string;
  locationSource?: "manual" | "scraped" | "google_maps";
  category?: string;
  notes?: string;
}) {
  const [supplier] = await db.insert(suppliers).values(data).returning();
  return supplier;
}

export async function getSupplier(id: string) {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id));
  return supplier ?? null;
}

export async function listSuppliers(
  userId: string,
  filters?: { category?: string; locationSource?: "manual" | "scraped" | "google_maps" }
) {
  const conditions = [eq(suppliers.userId, userId)];

  if (filters?.category)       conditions.push(eq(suppliers.category, filters.category));
  if (filters?.locationSource) conditions.push(eq(suppliers.locationSource, filters.locationSource));

  return db
    .select()
    .from(suppliers)
    .where(and(...conditions))
    .orderBy(suppliers.name);
}

export async function updateSupplier(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    addressRaw: string;
    lat: string;
    lng: string;
    locationSource: "manual" | "scraped" | "google_maps";
    category: string;
    notes: string;
  }>
) {
  const [updated] = await db
    .update(suppliers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteSupplier(id: string) {
  const [deleted] = await db
    .delete(suppliers)
    .where(eq(suppliers.id, id))
    .returning();
  return deleted ?? null;
}

// Returns suppliers that have lat/lng set — for map view
export async function listMappedSuppliers(userId: string) {
  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      phone: suppliers.phone,
      addressRaw: suppliers.addressRaw,
      lat: suppliers.lat,
      lng: suppliers.lng,
      category: suppliers.category,
    })
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .orderBy(desc(suppliers.createdAt));
}
