"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUsers = exports.users = exports.businessTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.businessTypeEnum = (0, pg_core_1.pgEnum)("business_type", [
    "retail",
    "wholesale",
    "service",
    "agriculture",
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    phone: (0, pg_core_1.text)("phone").notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash"),
    name: (0, pg_core_1.text)("name").notNull(),
    businessName: (0, pg_core_1.text)("business_name"),
    profileImageUrl: (0, pg_core_1.text)("profile_image_url"),
    businessType: (0, exports.businessTypeEnum)("business_type"),
    languagePreference: (0, pg_core_1.text)("language_preference").default("en"), // en, hi, mr, gu …
    city: (0, pg_core_1.text)("city"),
    state: (0, pg_core_1.text)("state"),
    lat: (0, pg_core_1.numeric)("lat", { precision: 10, scale: 7 }),
    lng: (0, pg_core_1.numeric)("lng", { precision: 10, scale: 7 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.adminUsers = (0, pg_core_1.pgTable)("admin_users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    role: (0, pg_core_1.text)("role").default("support").notNull(), // super_admin | support
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
