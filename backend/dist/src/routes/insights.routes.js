"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const CACHE_TTL_MS = 60000;
const weeklyCache = new Map();
const router = (0, express_1.Router)();
function asDateString(date) {
    return date.toISOString().slice(0, 10);
}
function addDays(base, days) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
}
function shortDayName(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("en-US", { weekday: "short" });
}
function dayName(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("en-US", { weekday: "long" });
}
function safeNumber(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}
function compareHalfTrend(valuesByDay) {
    if (valuesByDay.length < 2)
        return "flat";
    const mid = Math.ceil(valuesByDay.length / 2);
    const first = valuesByDay.slice(0, mid).reduce((sum, n) => sum + n, 0);
    const second = valuesByDay.slice(mid).reduce((sum, n) => sum + n, 0);
    if (first <= 0 && second > 0)
        return "up";
    if (first > 0 && second <= 0)
        return "down";
    if (first <= 0 && second <= 0)
        return "flat";
    const ratio = (second - first) / first;
    if (ratio > 0.12)
        return "up";
    if (ratio < -0.12)
        return "down";
    return "flat";
}
async function resolveUserId(req) {
    const fromQuery = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (fromQuery) {
        const [found] = await client_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, fromQuery)).limit(1);
        if (found?.id)
            return found.id;
    }
    const [latestUser] = await client_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
        .limit(1);
    return latestUser?.id ?? null;
}
router.get("/weekly", async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        if (!userId) {
            return res.status(400).json({ error: "No user found for weekly insights" });
        }
        const cached = weeklyCache.get(userId);
        if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
            return res.json({
                ok: true,
                insights: cached.insights,
                charts: {
                    dailySeries: cached.dailySeries,
                    topItems: cached.topItems,
                },
                cached: true,
            });
        }
        const today = new Date();
        const start = addDays(today, -6);
        const from = asDateString(start);
        const to = asDateString(today);
        const entries = await client_1.db
            .select({
            entryType: schema_1.ledgerEntries.entryType,
            itemName: schema_1.ledgerEntries.itemName,
            quantity: schema_1.ledgerEntries.quantity,
            amount: schema_1.ledgerEntries.amount,
            entryDate: schema_1.ledgerEntries.entryDate,
        })
            .from(schema_1.ledgerEntries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.userId, userId), (0, drizzle_orm_1.gte)(schema_1.ledgerEntries.entryDate, from), (0, drizzle_orm_1.lte)(schema_1.ledgerEntries.entryDate, to)))
            .orderBy(schema_1.ledgerEntries.entryDate);
        const allDays = Array.from({ length: 7 }, (_, i) => asDateString(addDays(start, i)));
        const uniqueDays = new Set(entries.map((e) => e.entryDate));
        if (uniqueDays.size < 4) {
            const insights = [
                {
                    type: "not_enough_data",
                    message: "Not enough data yet. Keep using VoiceTrace for better insights.",
                },
            ];
            const dailySeries = allDays.map((date) => ({
                date,
                day: shortDayName(date),
                sales: 0,
                expenses: 0,
                net: 0,
            }));
            const topItems = [];
            weeklyCache.set(userId, { createdAt: Date.now(), insights, dailySeries, topItems });
            return res.json({ ok: true, insights, charts: { dailySeries, topItems } });
        }
        const salesByItem = new Map();
        const earningsByWeekday = new Map();
        const dailyEarnings = new Map();
        const dailyExpenses = new Map();
        for (const entry of entries) {
            const amount = safeNumber(entry.amount);
            const isSale = entry.entryType === "sale" || entry.entryType === "income";
            const isExpense = entry.entryType === "expense" || entry.entryType === "purchase";
            if (isSale) {
                const item = (entry.itemName || "").trim();
                if (item) {
                    const qty = Math.max(1, safeNumber(entry.quantity) || 1);
                    salesByItem.set(item, (salesByItem.get(item) || 0) + qty);
                }
                const weekday = dayName(entry.entryDate);
                const stat = earningsByWeekday.get(weekday) || { total: 0, days: new Set() };
                stat.total += amount;
                stat.days.add(entry.entryDate);
                earningsByWeekday.set(weekday, stat);
                dailyEarnings.set(entry.entryDate, (dailyEarnings.get(entry.entryDate) || 0) + amount);
            }
            if (isExpense) {
                dailyExpenses.set(entry.entryDate, (dailyExpenses.get(entry.entryDate) || 0) + amount);
            }
        }
        const insights = [];
        const topItem = [...salesByItem.entries()].sort((a, b) => b[1] - a[1])[0];
        const topItems = [...salesByItem.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([itemName, quantity]) => ({ itemName, quantity }));
        if (topItem?.[0]) {
            insights.push({
                type: "top_item",
                message: `${topItem[0]} are your most consistently sold item.`,
            });
        }
        const bestDay = [...earningsByWeekday.entries()]
            .map(([day, stat]) => ({ day, avg: stat.days.size ? stat.total / stat.days.size : 0 }))
            .sort((a, b) => b.avg - a.avg)[0];
        if (bestDay?.day) {
            insights.push({
                type: "best_day",
                message: `You earn the most on ${bestDay.day}s.`,
            });
        }
        const orderedDays = [...uniqueDays].sort();
        const earningsSeries = orderedDays.map((d) => dailyEarnings.get(d) || 0);
        const expenseSeries = orderedDays.map((d) => dailyExpenses.get(d) || 0);
        const dailySeries = allDays.map((date) => {
            const sales = dailyEarnings.get(date) || 0;
            const expenses = dailyExpenses.get(date) || 0;
            return {
                date,
                day: shortDayName(date),
                sales,
                expenses,
                net: sales - expenses,
            };
        });
        const expenseTrend = compareHalfTrend(expenseSeries);
        insights.push({
            type: "expense_trend",
            message: expenseTrend === "up"
                ? "Your expenses are rising this week."
                : expenseTrend === "down"
                    ? "Your expenses are reducing."
                    : "Your expenses are stable.",
        });
        const salesTrend = compareHalfTrend(earningsSeries);
        insights.push({
            type: "sales_trend",
            message: salesTrend === "up"
                ? "Your sales are improving over the week."
                : salesTrend === "down"
                    ? "Sales are slightly dropping."
                    : "Your sales are stable this week.",
        });
        const lowStockItems = await client_1.db
            .select({
            name: schema_1.stock_items.name,
            currentQuantity: schema_1.stock_items.currentQuantity,
            lowStockThreshold: schema_1.stock_items.lowStockThreshold,
        })
            .from(schema_1.stock_items)
            .where((0, drizzle_orm_1.eq)(schema_1.stock_items.userId, userId));
        const likelyStockOut = lowStockItems
            .map((item) => ({
            name: item.name,
            current: safeNumber(item.currentQuantity),
            threshold: item.lowStockThreshold === null ? null : safeNumber(item.lowStockThreshold),
        }))
            .filter((item) => item.threshold !== null && item.current <= item.threshold);
        if (likelyStockOut.length) {
            insights.push({
                type: "stock_out_pattern",
                message: `You ran low on ${likelyStockOut[0].name} multiple times. Consider stocking more.`,
            });
        }
        weeklyCache.set(userId, { createdAt: Date.now(), insights, dailySeries, topItems });
        return res.json({ ok: true, insights, charts: { dailySeries, topItems } });
    }
    catch (err) {
        return res.status(500).json({ error: err?.message || "Failed to generate weekly insights" });
    }
});
exports.default = router;
