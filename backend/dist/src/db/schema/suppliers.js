"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppliers = exports.locationSourceEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.locationSourceEnum = (0, pg_core_1.pgEnum)("location_source", [
    "manual",
    "scraped",
    "google_maps",
]);
exports.suppliers = (0, pg_core_1.pgTable)("suppliers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    addressRaw: (0, pg_core_1.text)("address_raw"),
    lat: (0, pg_core_1.numeric)("lat", { precision: 10, scale: 7 }),
    lng: (0, pg_core_1.numeric)("lng", { precision: 10, scale: 7 }),
    locationSource: (0, exports.locationSourceEnum)("location_source").default("manual"),
    category: (0, pg_core_1.text)("category"), // type of goods supplied
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
