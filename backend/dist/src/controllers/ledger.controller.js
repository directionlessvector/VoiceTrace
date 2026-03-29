"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLedgerEntry = createLedgerEntry;
exports.getLedgerEntry = getLedgerEntry;
exports.listUserLedgerEntries = listUserLedgerEntries;
exports.updateLedgerEntry = updateLedgerEntry;
exports.deleteLedgerEntry = deleteLedgerEntry;
exports.getEarningsSummary = getEarningsSummary;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
async function createLedgerEntry(data) {
    const [entry] = await client_1.db.insert(schema_1.ledgerEntries).values(data).returning();
    return entry;
}
async function getLedgerEntry(id) {
    const [entry] = await client_1.db
        .select()
        .from(schema_1.ledgerEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.id, id));
    return entry ?? null;
}
async function listUserLedgerEntries(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.ledgerEntries.userId, userId)];
    if (filters?.entryType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.entryType, filters.entryType));
    if (filters?.source)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.source, filters.source));
    if (filters?.fromDate)
        conditions.push((0, drizzle_orm_1.gte)(schema_1.ledgerEntries.entryDate, filters.fromDate));
    if (filters?.toDate)
        conditions.push((0, drizzle_orm_1.lte)(schema_1.ledgerEntries.entryDate, filters.toDate));
    return client_1.db
        .select()
        .from(schema_1.ledgerEntries)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.ledgerEntries.entryDate));
}
async function updateLedgerEntry(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.ledgerEntries)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.id, id))
        .returning();
    return updated ?? null;
}
async function deleteLedgerEntry(id) {
    const [deleted] = await client_1.db
        .delete(schema_1.ledgerEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.id, id))
        .returning();
    return deleted ?? null;
}
// Earnings summary — used for PDF generation
async function getEarningsSummary(userId, fromDate, toDate) {
    const rows = await client_1.db
        .select({
        entryType: schema_1.ledgerEntries.entryType,
        total: (0, drizzle_orm_1.sql) `sum(${schema_1.ledgerEntries.amount})`,
        count: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.ledgerEntries)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.userId, userId), (0, drizzle_orm_1.gte)(schema_1.ledgerEntries.entryDate, fromDate), (0, drizzle_orm_1.lte)(schema_1.ledgerEntries.entryDate, toDate)))
        .groupBy(schema_1.ledgerEntries.entryType);
    return rows;
}
