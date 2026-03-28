import { pgTable, uuid, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const locationSourceEnum = pgEnum("location_source", [
  "manual",
  "scraped",
  "google_maps",
]);

export const suppliers = pgTable("suppliers", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name:            text("name").notNull(),
  phone:           text("phone"),
  addressRaw:      text("address_raw"),
  lat:             numeric("lat", { precision: 10, scale: 7 }),
  lng:             numeric("lng", { precision: 10, scale: 7 }),
  locationSource:  locationSourceEnum("location_source").default("manual"),
  category:        text("category"),                  // type of goods supplied
  notes:           text("notes"),

  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});
