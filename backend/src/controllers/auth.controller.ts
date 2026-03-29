import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;

function canonicalizePhoneInput(phone: string): string {
  return phone
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizePhone(phone: string): string {
  const raw = canonicalizePhoneInput(phone);
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 0 && raw.startsWith("+")) return `+${digits}`;
  return raw;
}

function phoneCandidates(phone: string): string[] {
  const trimmed = canonicalizePhoneInput(phone);
  const normalized = normalizePhone(phone);
  const digits = trimmed.replace(/\D+/g, "");
  const local10 = digits.length >= 10 ? digits.slice(-10) : "";

  return [...new Set([trimmed, normalized, local10].filter(Boolean))];
}

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

  const normalizedPhone = normalizePhone(data.phone);
  const candidates = phoneCandidates(data.phone);
  if (candidates.length === 0) {
    throw new Error("Invalid phone number");
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(...candidates.map((candidate) => eq(users.phone, candidate))));

  if (existing.length > 0) {
    throw new Error("Phone number already registered");
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      phone: normalizedPhone,
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

  const candidates = phoneCandidates(data.phone);
  if (candidates.length === 0) {
    throw new Error("Invalid phone number or password");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(or(...candidates.map((candidate) => eq(users.phone, candidate))));

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
