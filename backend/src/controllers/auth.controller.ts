import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;

function signToken(userId: string, phone: string): string {
  return jwt.sign({ userId, phone }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

export async function register(data: {
  phone: string;
  password: string;
  name: string;
  businessType?: string;
  languagePreference?: string;
  city?: string;
  state?: string;
  businessName?: string;
}) {
  if (!data.phone) throw new Error("Phone is required");
  if (!data.password) throw new Error("Password is required");
  if (!data.name) throw new Error("Name is required");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, data.phone));

  if (existing.length > 0) {
    throw new Error("Phone number already registered");
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      phone: data.phone,
      passwordHash,
      name: data.name,
      businessType: (data.businessType as any) ?? "retail",
      languagePreference: data.languagePreference ?? "en",
      city: data.city,
      state: data.state,
      businessName: data.businessName,
    })
    .returning();

  const token = signToken(user.id, user.phone);
  return { token, user: sanitizeUser(user) };
}

export async function login(data: { phone: string; password: string }) {
  if (!data.phone || !data.password) {
    throw new Error("Phone and password are required");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, data.phone));

  if (!user || !user.passwordHash) {
    throw new Error("Invalid phone number or password");
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid phone number or password");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated. Please contact support.");
  }

  const token = signToken(user.id, user.phone);
  return { token, user: sanitizeUser(user) };
}
