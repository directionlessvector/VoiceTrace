import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

export async function createUser(data: {
  phone: string;
  name: string;
  businessName?: string;
  businessType?: "retail" | "wholesale" | "service" | "agriculture";
  languagePreference?: string;
  city?: string;
  state?: string;
  lat?: string;
  lng?: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function getUserByPhone(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  return user ?? null;
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    businessName: string;
    businessType: "retail" | "wholesale" | "service" | "agriculture";
    languagePreference: string;
    city: string;
    state: string;
    lat: string;
    lng: string;
  }>
) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated ?? null;
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const [updated] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated ?? null;
}

// Admin — list all vendors with basic profile
export async function listAllUsers(filters?: { isActive?: boolean }) {
  let query = db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      businessName: users.businessName,
      businessType: users.businessType,
      city: users.city,
      state: users.state,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users);

  if (filters?.isActive !== undefined) {
    return query.where(eq(users.isActive, filters.isActive));
  }
  return query;
}
