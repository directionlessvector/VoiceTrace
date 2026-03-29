"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStockItem = createStockItem;
exports.getStockItem = getStockItem;
exports.listStockItems = listStockItems;
exports.updateStockItem = updateStockItem;
exports.deleteStockItem = deleteStockItem;
exports.getLowStockItems = getLowStockItems;
exports.createStockMovement = createStockMovement;
exports.listStockMovements = listStockMovements;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// ─── Stock Items ──────────────────────────────────────────────────────────────
async function createStockItem(data) {
    const [item] = await client_1.db.insert(schema_1.stock_items).values(data).returning();
    return item;
}
async function getStockItem(id) {
    const [item] = await client_1.db
        .select()
        .from(schema_1.stock_items)
        .where((0, drizzle_orm_1.eq)(schema_1.stock_items.id, id));
    return item ?? null;
}
async function listStockItems(userId) {
    return client_1.db
        .select()
        .from(schema_1.stock_items)
        .where((0, drizzle_orm_1.eq)(schema_1.stock_items.userId, userId))
        .orderBy(schema_1.stock_items.name);
}
async function updateStockItem(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.stock_items)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.stock_items.id, id))
        .returning();
    return updated ?? null;
}
async function deleteStockItem(id) {
    const [deleted] = await client_1.db
        .delete(schema_1.stock_items)
        .where((0, drizzle_orm_1.eq)(schema_1.stock_items.id, id))
        .returning();
    return deleted ?? null;
}
// Items where current_quantity < low_stock_threshold — feeds alert creation
async function getLowStockItems(userId) {
    return client_1.db
        .select()
        .from(schema_1.stock_items)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stock_items.userId, userId), (0, drizzle_orm_1.lt)(schema_1.stock_items.currentQuantity, schema_1.stock_items.lowStockThreshold)));
}
// ─── Stock Movements ──────────────────────────────────────────────────────────
async function createStockMovement(data) {
    const [movement] = await client_1.db.insert(schema_1.stockMovements).values(data).returning();
    return movement;
}
async function listStockMovements(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.stockMovements.userId, userId)];
    if (filters?.stockItemId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.stockMovements.stockItemId, filters.stockItemId));
    if (filters?.movementType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.stockMovements.movementType, filters.movementType));
    return client_1.db
        .select()
        .from(schema_1.stockMovements)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.stockMovements.createdAt));
}
