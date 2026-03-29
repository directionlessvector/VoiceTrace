"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatternDetection = createPatternDetection;
exports.listPatternDetections = listPatternDetections;
exports.upsertVendorScore = upsertVendorScore;
exports.getLatestVendorScore = getLatestVendorScore;
exports.listVendorScoreHistory = listVendorScoreHistory;
exports.createWeatherSuggestion = createWeatherSuggestion;
exports.listActiveWeatherSuggestions = listActiveWeatherSuggestions;
exports.createDailySummary = createDailySummary;
exports.markSummaryDelivered = markSummaryDelivered;
exports.listDailySummaries = listDailySummaries;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// ─── Pattern Detections ───────────────────────────────────────────────────────
async function createPatternDetection(data) {
    const [pattern] = await client_1.db.insert(schema_1.patternDetections).values(data).returning();
    return pattern;
}
async function listPatternDetections(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.patternDetections.userId, userId)];
    if (filters?.patternType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.patternDetections.patternType, filters.patternType));
    return client_1.db
        .select()
        .from(schema_1.patternDetections)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patternDetections.createdAt));
}
// ─── Vendor Scores ────────────────────────────────────────────────────────────
async function upsertVendorScore(data) {
    const [score] = await client_1.db.insert(schema_1.vendorScores).values(data).returning();
    return score;
}
async function getLatestVendorScore(userId) {
    const [score] = await client_1.db
        .select()
        .from(schema_1.vendorScores)
        .where((0, drizzle_orm_1.eq)(schema_1.vendorScores.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.vendorScores.calculatedAt))
        .limit(1);
    return score ?? null;
}
async function listVendorScoreHistory(userId) {
    return client_1.db
        .select()
        .from(schema_1.vendorScores)
        .where((0, drizzle_orm_1.eq)(schema_1.vendorScores.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.vendorScores.calculatedAt));
}
// ─── Weather Suggestions ──────────────────────────────────────────────────────
async function createWeatherSuggestion(data) {
    const [suggestion] = await client_1.db.insert(schema_1.weatherSuggestions).values(data).returning();
    return suggestion;
}
async function listActiveWeatherSuggestions(userId) {
    return client_1.db
        .select()
        .from(schema_1.weatherSuggestions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.weatherSuggestions.userId, userId), (0, drizzle_orm_1.gte)(schema_1.weatherSuggestions.validUntil, new Date())))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.weatherSuggestions.createdAt));
}
// ─── Daily Summaries ──────────────────────────────────────────────────────────
async function createDailySummary(data) {
    const [summary] = await client_1.db.insert(schema_1.dailySummaries).values(data).returning();
    return summary;
}
async function markSummaryDelivered(id, deliveredVia) {
    const [updated] = await client_1.db
        .update(schema_1.dailySummaries)
        .set({ deliveredVia, deliveredAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.dailySummaries.id, id))
        .returning();
    return updated ?? null;
}
async function listDailySummaries(userId, limit = 30) {
    return client_1.db
        .select()
        .from(schema_1.dailySummaries)
        .where((0, drizzle_orm_1.eq)(schema_1.dailySummaries.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.dailySummaries.summaryDate))
        .limit(limit);
}
