"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailySummaries = exports.deliveryChannelEnum = exports.weatherSuggestions = exports.vendorScores = exports.patternDetections = exports.patternTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const stock_1 = require("./stock");
// ─── Pattern Detection ───────────────────────────────────────────────────────
exports.patternTypeEnum = (0, pg_core_1.pgEnum)("pattern_type", [
    "sales_trend",
    "stock_pattern",
    "expense_spike",
    "seasonal_behavior",
    "customer_payment",
]);
exports.patternDetections = (0, pg_core_1.pgTable)("pattern_detections", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    patternType: (0, exports.patternTypeEnum)("pattern_type").notNull(),
    data: (0, pg_core_1.jsonb)("data"), // computed pattern payload (flexible)
    periodStart: (0, pg_core_1.date)("period_start"),
    periodEnd: (0, pg_core_1.date)("period_end"),
    confidenceScore: (0, pg_core_1.numeric)("confidence_score", { precision: 4, scale: 3 }), // 0.000 – 1.000
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ─── Vendor Score ─────────────────────────────────────────────────────────────
exports.vendorScores = (0, pg_core_1.pgTable)("vendor_scores", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    overallScore: (0, pg_core_1.numeric)("overall_score", { precision: 5, scale: 2 }), // 0 – 100
    paymentRegularityScore: (0, pg_core_1.numeric)("payment_regularity_score", { precision: 5, scale: 2 }),
    salesConsistencyScore: (0, pg_core_1.numeric)("sales_consistency_score", { precision: 5, scale: 2 }),
    stockManagementScore: (0, pg_core_1.numeric)("stock_management_score", { precision: 5, scale: 2 }),
    factors: (0, pg_core_1.jsonb)("factors"), // full breakdown for loans/finance display
    calculatedAt: (0, pg_core_1.timestamp)("calculated_at").defaultNow().notNull(),
    validUntil: (0, pg_core_1.timestamp)("valid_until"),
});
// ─── Weather Suggestions ─────────────────────────────────────────────────────
exports.weatherSuggestions = (0, pg_core_1.pgTable)("weather_suggestions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    stockItemId: (0, pg_core_1.uuid)("stock_item_id").references(() => stock_1.stock_items.id, { onDelete: "set null" }),
    suggestionText: (0, pg_core_1.text)("suggestion_text").notNull(),
    weatherData: (0, pg_core_1.jsonb)("weather_data"), // raw weather API snapshot
    validFrom: (0, pg_core_1.timestamp)("valid_from"),
    validUntil: (0, pg_core_1.timestamp)("valid_until"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ─── Daily Summaries (Call Agent) ─────────────────────────────────────────────
exports.deliveryChannelEnum = (0, pg_core_1.pgEnum)("delivery_channel", [
    "sms",
    "whatsapp",
    "call_agent",
    "dashboard",
]);
exports.dailySummaries = (0, pg_core_1.pgTable)("daily_summaries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    summaryText: (0, pg_core_1.text)("summary_text").notNull(),
    summaryAudioUrl: (0, pg_core_1.text)("summary_audio_url"), // Cloudinary URL of TTS audio
    summaryDate: (0, pg_core_1.date)("summary_date").notNull(),
    deliveredVia: (0, exports.deliveryChannelEnum)("delivered_via"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
