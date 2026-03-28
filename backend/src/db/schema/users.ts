import { pgTable, uuid, text, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";

export const businessTypeEnum = pgEnum("business_type", [
  "retail",
  "wholesale",
  "service",
  "agriculture",
]);

export const users = pgTable("users", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  phone:                text("phone").notNull().unique(),
  passwordHash:         text("password_hash"),
  name:                 text("name").notNull(),
  businessName:         text("business_name"),
  profileImageUrl:      text("profile_image_url"),
  businessType:         businessTypeEnum("business_type"),
  languagePreference:   text("language_preference").default("en"),  // en, hi, mr, gu …
  city:                 text("city"),
  state:                text("state"),
  lat:                  numeric("lat", { precision: 10, scale: 7 }),
  lng:                  numeric("lng", { precision: 10, scale: 7 }),
  isActive:             boolean("is_active").default(true).notNull(),
  createdAt:            timestamp("created_at").defaultNow().notNull(),
  updatedAt:            timestamp("updated_at").defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role:         text("role").default("support").notNull(),   // super_admin | support
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});
