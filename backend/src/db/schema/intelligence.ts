import { pgTable, uuid, text, numeric, timestamp, jsonb, pgEnum, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { stock_items } from "./stock";

// ─── Pattern Detection ───────────────────────────────────────────────────────

export const patternTypeEnum = pgEnum("pattern_type", [
  "sales_trend",
  "stock_pattern",
  "expense_spike",
  "seasonal_behavior",
  "customer_payment",
]);

export const patternDetections = pgTable("pattern_detections", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  patternType:      patternTypeEnum("pattern_type").notNull(),
  data:             jsonb("data"),                    // computed pattern payload (flexible)
  periodStart:      date("period_start"),
  periodEnd:        date("period_end"),
  confidenceScore:  numeric("confidence_score", { precision: 4, scale: 3 }),  // 0.000 – 1.000

  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

// ─── Vendor Score ─────────────────────────────────────────────────────────────

export const vendorScores = pgTable("vendor_scores", {
  id:                       uuid("id").primaryKey().defaultRandom(),
  userId:                   uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  overallScore:             numeric("overall_score", { precision: 5, scale: 2 }),  // 0 – 100
  paymentRegularityScore:   numeric("payment_regularity_score", { precision: 5, scale: 2 }),
  salesConsistencyScore:    numeric("sales_consistency_score", { precision: 5, scale: 2 }),
  stockManagementScore:     numeric("stock_management_score", { precision: 5, scale: 2 }),
  factors:                  jsonb("factors"),          // full breakdown for loans/finance display

  calculatedAt:             timestamp("calculated_at").defaultNow().notNull(),
  validUntil:               timestamp("valid_until"),
});

// ─── Weather Suggestions ─────────────────────────────────────────────────────

export const weatherSuggestions = pgTable("weather_suggestions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stockItemId:    uuid("stock_item_id").references(() => stock_items.id, { onDelete: "set null" }),

  suggestionText: text("suggestion_text").notNull(),
  weatherData:    jsonb("weather_data"),               // raw weather API snapshot
  validFrom:      timestamp("valid_from"),
  validUntil:     timestamp("valid_until"),

  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

// ─── Daily Summaries (Call Agent) ─────────────────────────────────────────────

export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "sms",
  "whatsapp",
  "call_agent",
  "dashboard",
]);

export const dailySummaries = pgTable("daily_summaries", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  summaryText:      text("summary_text").notNull(),
  summaryAudioUrl:  text("summary_audio_url"),        // Cloudinary URL of TTS audio
  summaryDate:      date("summary_date").notNull(),
  deliveredVia:     deliveryChannelEnum("delivered_via"),
  deliveredAt:      timestamp("delivered_at"),

  createdAt:        timestamp("created_at").defaultNow().notNull(),
});
