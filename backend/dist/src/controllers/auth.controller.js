"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;
function canonicalizePhoneInput(phone) {
    return phone
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
        .replace(/\s+/g, "")
        .trim();
}
function normalizePhone(phone) {
    const raw = canonicalizePhoneInput(phone);
    const digits = raw.replace(/\D+/g, "");
    if (digits.length === 10)
        return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91"))
        return `+${digits}`;
    if (digits.length > 0 && raw.startsWith("+"))
        return `+${digits}`;
    return raw;
}
function phoneCandidates(phone) {
    const trimmed = canonicalizePhoneInput(phone);
    const normalized = normalizePhone(phone);
    const digits = trimmed.replace(/\D+/g, "");
    const local10 = digits.length >= 10 ? digits.slice(-10) : "";
    return [...new Set([trimmed, normalized, local10].filter(Boolean))];
}
function signToken(userId, phone) {
    return jsonwebtoken_1.default.sign({ userId, phone }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function sanitizeUser(user) {
    const { passwordHash: _pw, ...rest } = user;
    return rest;
}
async function register(data) {
    if (!data.phone)
        throw new Error("Phone is required");
    if (!data.password)
        throw new Error("Password is required");
    if (!data.name)
        throw new Error("Name is required");
    const normalizedPhone = normalizePhone(data.phone);
    const candidates = phoneCandidates(data.phone);
    if (candidates.length === 0) {
        throw new Error("Invalid phone number");
    }
    const existing = await client_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)(...candidates.map((candidate) => (0, drizzle_orm_1.eq)(schema_1.users.phone, candidate))));
    if (existing.length > 0) {
        throw new Error("Phone number already registered");
    }
    const passwordHash = await bcryptjs_1.default.hash(data.password, BCRYPT_ROUNDS);
    const [user] = await client_1.db
        .insert(schema_1.users)
        .values({
        phone: normalizedPhone,
        passwordHash,
        name: data.name,
        businessType: data.businessType ?? "retail",
        languagePreference: data.languagePreference ?? "en",
        city: data.city,
        state: data.state,
        businessName: data.businessName,
    })
        .returning();
    const token = signToken(user.id, user.phone);
    return { token, user: sanitizeUser(user) };
}
async function login(data) {
    if (!data.phone || !data.password) {
        throw new Error("Phone and password are required");
    }
    const candidates = phoneCandidates(data.phone);
    if (candidates.length === 0) {
        throw new Error("Invalid phone number or password");
    }
    const [user] = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)(...candidates.map((candidate) => (0, drizzle_orm_1.eq)(schema_1.users.phone, candidate))));
    if (!user || !user.passwordHash) {
        throw new Error("Invalid phone number or password");
    }
    const valid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
    if (!valid) {
        throw new Error("Invalid phone number or password");
    }
    if (!user.isActive) {
        throw new Error("Account is deactivated. Please contact support.");
    }
    const token = signToken(user.id, user.phone);
    return { token, user: sanitizeUser(user) };
}
