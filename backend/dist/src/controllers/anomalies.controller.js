"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnomaly = createAnomaly;
exports.getAnomaly = getAnomaly;
exports.listAnomalies = listAnomalies;
exports.resolveAnomaly = resolveAnomaly;
exports.listUnresolvedAnomalies = listUnresolvedAnomalies;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
async function createAnomaly(data) {
    const [anomaly] = await client_1.db.insert(schema_1.anomalies).values(data).returning();
    return anomaly;
}
async function getAnomaly(id) {
    const [anomaly] = await client_1.db
        .select()
        .from(schema_1.anomalies)
        .where((0, drizzle_orm_1.eq)(schema_1.anomalies.id, id));
    return anomaly ?? null;
}
async function listAnomalies(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.anomalies.userId, userId)];
    if (filters?.isResolved !== undefined)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.anomalies.isResolved, filters.isResolved));
    if (filters?.severity)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.anomalies.severity, filters.severity));
    if (filters?.anomalyType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.anomalies.anomalyType, filters.anomalyType));
    return client_1.db
        .select()
        .from(schema_1.anomalies)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.anomalies.createdAt));
}
async function resolveAnomaly(id) {
    const [updated] = await client_1.db
        .update(schema_1.anomalies)
        .set({ isResolved: true, resolvedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.anomalies.id, id))
        .returning();
    return updated ?? null;
}
async function listUnresolvedAnomalies(userId) {
    return client_1.db
        .select()
        .from(schema_1.anomalies)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.anomalies.userId, userId), (0, drizzle_orm_1.eq)(schema_1.anomalies.isResolved, false)))
        .orderBy(schema_1.anomalies.severity, (0, drizzle_orm_1.desc)(schema_1.anomalies.createdAt));
}
