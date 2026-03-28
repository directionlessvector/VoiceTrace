import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { patternDetections, vendorScores, weatherSuggestions, dailySummaries } from "../db/schema";

// ─── Pattern Detections ───────────────────────────────────────────────────────

export async function createPatternDetection(data: {
  userId: string;
  patternType: "sales_trend" | "stock_pattern" | "expense_spike" | "seasonal_behavior" | "customer_payment";
  data?: object;
  periodStart?: string;
  periodEnd?: string;
  confidenceScore?: string;
}) {
  const [pattern] = await db.insert(patternDetections).values(data).returning();
  return pattern;
}

export async function listPatternDetections(
  userId: string,
  filters?: {
    patternType?: "sales_trend" | "stock_pattern" | "expense_spike" | "seasonal_behavior" | "customer_payment";
  }
) {
  const conditions = [eq(patternDetections.userId, userId)];
  if (filters?.patternType) conditions.push(eq(patternDetections.patternType, filters.patternType));

  return db
    .select()
    .from(patternDetections)
    .where(and(...conditions))
    .orderBy(desc(patternDetections.createdAt));
}

// ─── Vendor Scores ────────────────────────────────────────────────────────────

export async function upsertVendorScore(data: {
  userId: string;
  overallScore: string;
  paymentRegularityScore?: string;
  salesConsistencyScore?: string;
  stockManagementScore?: string;
  factors?: object;
  validUntil?: Date;
}) {
  const [score] = await db.insert(vendorScores).values(data).returning();
  return score;
}

export async function getLatestVendorScore(userId: string) {
  const [score] = await db
    .select()
    .from(vendorScores)
    .where(eq(vendorScores.userId, userId))
    .orderBy(desc(vendorScores.calculatedAt))
    .limit(1);
  return score ?? null;
}

export async function listVendorScoreHistory(userId: string) {
  return db
    .select()
    .from(vendorScores)
    .where(eq(vendorScores.userId, userId))
    .orderBy(desc(vendorScores.calculatedAt));
}

// ─── Weather Suggestions ──────────────────────────────────────────────────────

export async function createWeatherSuggestion(data: {
  userId: string;
  suggestionText: string;
  stockItemId?: string;
  weatherData?: object;
  validFrom?: Date;
  validUntil?: Date;
}) {
  const [suggestion] = await db.insert(weatherSuggestions).values(data).returning();
  return suggestion;
}

export async function listActiveWeatherSuggestions(userId: string) {
  return db
    .select()
    .from(weatherSuggestions)
    .where(
      and(
        eq(weatherSuggestions.userId, userId),
        gte(weatherSuggestions.validUntil, new Date())
      )
    )
    .orderBy(desc(weatherSuggestions.createdAt));
}

// ─── Daily Summaries ──────────────────────────────────────────────────────────

export async function createDailySummary(data: {
  userId: string;
  summaryText: string;
  summaryAudioUrl?: string;
  summaryDate: string;
  deliveredVia?: "sms" | "whatsapp" | "call_agent" | "dashboard";
}) {
  const [summary] = await db.insert(dailySummaries).values(data).returning();
  return summary;
}

export async function markSummaryDelivered(
  id: string,
  deliveredVia: "sms" | "whatsapp" | "call_agent" | "dashboard"
) {
  const [updated] = await db
    .update(dailySummaries)
    .set({ deliveredVia, deliveredAt: new Date() })
    .where(eq(dailySummaries.id, id))
    .returning();
  return updated ?? null;
}

export async function listDailySummaries(userId: string, limit = 30) {
  return db
    .select()
    .from(dailySummaries)
    .where(eq(dailySummaries.userId, userId))
    .orderBy(desc(dailySummaries.summaryDate))
    .limit(limit);
}
