import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import { ledgerEntries } from "../db/schema";

export async function createLedgerEntry(data: {
  userId: string;
  voiceSessionId?: string;
  entryType: "sale" | "purchase" | "expense" | "income";
  amount: string;
  quantity?: string;
  unit?: string;
  itemName?: string;
  partyName?: string;
  category?: "goods" | "services" | "salary" | "rent" | "utilities" | "other";
  notes?: string;
  entryDate: string;
  source?: "voice" | "ocr" | "manual";
  ocrRawText?: string;
}) {
  const [entry] = await db.insert(ledgerEntries).values(data).returning();
  return entry;
}

export async function getLedgerEntry(id: string) {
  const [entry] = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.id, id));
  return entry ?? null;
}

export async function listUserLedgerEntries(
  userId: string,
  filters?: {
    entryType?: "sale" | "purchase" | "expense" | "income";
    source?: "voice" | "ocr" | "manual";
    fromDate?: string;
    toDate?: string;
  }
) {
  const conditions = [eq(ledgerEntries.userId, userId)];

  if (filters?.entryType) conditions.push(eq(ledgerEntries.entryType, filters.entryType));
  if (filters?.source)    conditions.push(eq(ledgerEntries.source, filters.source));
  if (filters?.fromDate)  conditions.push(gte(ledgerEntries.entryDate, filters.fromDate));
  if (filters?.toDate)    conditions.push(lte(ledgerEntries.entryDate, filters.toDate));

  return db
    .select()
    .from(ledgerEntries)
    .where(and(...conditions))
    .orderBy(desc(ledgerEntries.entryDate));
}

export async function updateLedgerEntry(
  id: string,
  data: Partial<{
    entryType: "sale" | "purchase" | "expense" | "income";
    amount: string;
    quantity: string;
    unit: string;
    itemName: string;
    partyName: string;
    notes: string;
    entryDate: string;
  }>
) {
  const [updated] = await db
    .update(ledgerEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ledgerEntries.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteLedgerEntry(id: string) {
  const [deleted] = await db
    .delete(ledgerEntries)
    .where(eq(ledgerEntries.id, id))
    .returning();
  return deleted ?? null;
}

// Earnings summary — used for PDF generation
export async function getEarningsSummary(
  userId: string,
  fromDate: string,
  toDate: string
) {
  const rows = await db
    .select({
      entryType: ledgerEntries.entryType,
      total: sql<string>`sum(${ledgerEntries.amount})`,
      count: sql<string>`count(*)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        gte(ledgerEntries.entryDate, fromDate),
        lte(ledgerEntries.entryDate, toDate)
      )
    )
    .groupBy(ledgerEntries.entryType);
  return rows;
}
