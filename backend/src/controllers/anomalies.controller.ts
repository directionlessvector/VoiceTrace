import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { anomalies } from "../db/schema";

export async function createAnomaly(data: {
  userId: string;
  anomalyType: "duplicate_entry" | "unusual_amount" | "large_variance" | "stock_mismatch" | "pattern_break";
  description: string;
  severity: "low" | "medium" | "high";
  voiceSessionId?: string;
  ledgerEntryId?: string;
  stockMovementId?: string;
}) {
  const [anomaly] = await db.insert(anomalies).values(data).returning();
  return anomaly;
}

export async function getAnomaly(id: string) {
  const [anomaly] = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.id, id));
  return anomaly ?? null;
}

export async function listAnomalies(
  userId: string,
  filters?: {
    isResolved?: boolean;
    severity?: "low" | "medium" | "high";
    anomalyType?: "duplicate_entry" | "unusual_amount" | "large_variance" | "stock_mismatch" | "pattern_break";
  }
) {
  const conditions = [eq(anomalies.userId, userId)];

  if (filters?.isResolved !== undefined) conditions.push(eq(anomalies.isResolved, filters.isResolved));
  if (filters?.severity)                 conditions.push(eq(anomalies.severity, filters.severity));
  if (filters?.anomalyType)              conditions.push(eq(anomalies.anomalyType, filters.anomalyType));

  return db
    .select()
    .from(anomalies)
    .where(and(...conditions))
    .orderBy(desc(anomalies.createdAt));
}

export async function resolveAnomaly(id: string) {
  const [updated] = await db
    .update(anomalies)
    .set({ isResolved: true, resolvedAt: new Date() })
    .where(eq(anomalies.id, id))
    .returning();
  return updated ?? null;
}

export async function listUnresolvedAnomalies(userId: string) {
  return db
    .select()
    .from(anomalies)
    .where(and(eq(anomalies.userId, userId), eq(anomalies.isResolved, false)))
    .orderBy(anomalies.severity, desc(anomalies.createdAt));
}
