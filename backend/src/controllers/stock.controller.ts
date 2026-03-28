import { eq, and, lt, desc } from "drizzle-orm";
import { db } from "../db/client";
import { stock_items, stockMovements } from "../db/schema";

// ─── Stock Items ──────────────────────────────────────────────────────────────

export async function createStockItem(data: {
  userId: string;
  name: string;
  unit: string;
  sku?: string;
  currentQuantity?: string;
  lowStockThreshold?: string;
  pricePerUnit?: string;
}) {
  const [item] = await db.insert(stock_items).values(data).returning();
  return item;
}

export async function getStockItem(id: string) {
  const [item] = await db
    .select()
    .from(stock_items)
    .where(eq(stock_items.id, id));
  return item ?? null;
}

export async function listStockItems(userId: string) {
  return db
    .select()
    .from(stock_items)
    .where(eq(stock_items.userId, userId))
    .orderBy(stock_items.name);
}

export async function updateStockItem(
  id: string,
  data: Partial<{
    name: string;
    sku: string;
    unit: string;
    currentQuantity: string;
    lowStockThreshold: string;
    pricePerUnit: string;
  }>
) {
  const [updated] = await db
    .update(stock_items)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stock_items.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteStockItem(id: string) {
  const [deleted] = await db
    .delete(stock_items)
    .where(eq(stock_items.id, id))
    .returning();
  return deleted ?? null;
}

// Items where current_quantity < low_stock_threshold — feeds alert creation
export async function getLowStockItems(userId: string) {
  return db
    .select()
    .from(stock_items)
    .where(
      and(
        eq(stock_items.userId, userId),
        lt(stock_items.currentQuantity, stock_items.lowStockThreshold)
      )
    );
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export async function createStockMovement(data: {
  stockItemId: string;
  userId: string;
  movementType: "in" | "out" | "adjustment";
  quantity: string;
  voiceSessionId?: string;
  ledgerEntryId?: string;
  notes?: string;
}) {
  const [movement] = await db.insert(stockMovements).values(data).returning();
  return movement;
}

export async function listStockMovements(
  userId: string,
  filters?: { stockItemId?: string; movementType?: "in" | "out" | "adjustment" }
) {
  const conditions = [eq(stockMovements.userId, userId)];

  if (filters?.stockItemId)  conditions.push(eq(stockMovements.stockItemId, filters.stockItemId));
  if (filters?.movementType) conditions.push(eq(stockMovements.movementType, filters.movementType));

  return db
    .select()
    .from(stockMovements)
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt));
}
