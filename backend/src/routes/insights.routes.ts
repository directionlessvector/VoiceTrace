import { Router, Request, Response } from "express";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { ledgerEntries, stock_items, users } from "../db/schema";

type WeeklyInsight = {
  type: "top_item" | "best_day" | "expense_trend" | "sales_trend" | "stock_out_pattern" | "not_enough_data";
  message: string;
};

type WeeklyDailyPoint = {
  date: string;
  day: string;
  sales: number;
  expenses: number;
  net: number;
};

type WeeklyTopItemPoint = {
  itemName: string;
  quantity: number;
};

type CacheEntry = {
  createdAt: number;
  insights: WeeklyInsight[];
  dailySeries: WeeklyDailyPoint[];
  topItems: WeeklyTopItemPoint[];
};

const CACHE_TTL_MS = 60_000;
const weeklyCache = new Map<string, CacheEntry>();

const router = Router();

function asDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function shortDayName(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function dayName(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function safeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function compareHalfTrend(valuesByDay: number[]): "up" | "down" | "flat" {
  if (valuesByDay.length < 2) return "flat";
  const mid = Math.ceil(valuesByDay.length / 2);
  const first = valuesByDay.slice(0, mid).reduce((sum, n) => sum + n, 0);
  const second = valuesByDay.slice(mid).reduce((sum, n) => sum + n, 0);

  if (first <= 0 && second > 0) return "up";
  if (first > 0 && second <= 0) return "down";
  if (first <= 0 && second <= 0) return "flat";

  const ratio = (second - first) / first;
  if (ratio > 0.12) return "up";
  if (ratio < -0.12) return "down";
  return "flat";
}

async function resolveUserId(req: Request): Promise<string | null> {
  const fromQuery = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (fromQuery) {
    const [found] = await db.select({ id: users.id }).from(users).where(eq(users.id, fromQuery)).limit(1);
    if (found?.id) return found.id;
  }

  const [latestUser] = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(1);

  return latestUser?.id ?? null;
}

router.get("/weekly", async (req: Request, res: Response) => {
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

    const entries = await db
      .select({
        entryType: ledgerEntries.entryType,
        itemName: ledgerEntries.itemName,
        quantity: ledgerEntries.quantity,
        amount: ledgerEntries.amount,
        entryDate: ledgerEntries.entryDate,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.userId, userId),
          gte(ledgerEntries.entryDate, from),
          lte(ledgerEntries.entryDate, to)
        )
      )
      .orderBy(ledgerEntries.entryDate);

    const allDays = Array.from({ length: 7 }, (_, i) => asDateString(addDays(start, i)));
    const uniqueDays = new Set(entries.map((e) => e.entryDate));
    if (uniqueDays.size < 4) {
      const insights: WeeklyInsight[] = [
        {
          type: "not_enough_data",
          message: "Not enough data yet. Keep using VoiceTrace for better insights.",
        },
      ];
      const dailySeries: WeeklyDailyPoint[] = allDays.map((date) => ({
        date,
        day: shortDayName(date),
        sales: 0,
        expenses: 0,
        net: 0,
      }));
      const topItems: WeeklyTopItemPoint[] = [];

      weeklyCache.set(userId, { createdAt: Date.now(), insights, dailySeries, topItems });
      return res.json({ ok: true, insights, charts: { dailySeries, topItems } });
    }

    const salesByItem = new Map<string, number>();
    const earningsByWeekday = new Map<string, { total: number; days: Set<string> }>();
    const dailyEarnings = new Map<string, number>();
    const dailyExpenses = new Map<string, number>();

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
        const stat = earningsByWeekday.get(weekday) || { total: 0, days: new Set<string>() };
        stat.total += amount;
        stat.days.add(entry.entryDate);
        earningsByWeekday.set(weekday, stat);

        dailyEarnings.set(entry.entryDate, (dailyEarnings.get(entry.entryDate) || 0) + amount);
      }

      if (isExpense) {
        dailyExpenses.set(entry.entryDate, (dailyExpenses.get(entry.entryDate) || 0) + amount);
      }
    }

    const insights: WeeklyInsight[] = [];

    const topItem = [...salesByItem.entries()].sort((a, b) => b[1] - a[1])[0];
    const topItems: WeeklyTopItemPoint[] = [...salesByItem.entries()]
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

    const dailySeries: WeeklyDailyPoint[] = allDays.map((date) => {
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
      message:
        expenseTrend === "up"
          ? "Your expenses are rising this week."
          : expenseTrend === "down"
            ? "Your expenses are reducing."
            : "Your expenses are stable.",
    });

    const salesTrend = compareHalfTrend(earningsSeries);
    insights.push({
      type: "sales_trend",
      message:
        salesTrend === "up"
          ? "Your sales are improving over the week."
          : salesTrend === "down"
            ? "Sales are slightly dropping."
            : "Your sales are stable this week.",
    });

    const lowStockItems = await db
      .select({
        name: stock_items.name,
        currentQuantity: stock_items.currentQuantity,
        lowStockThreshold: stock_items.lowStockThreshold,
      })
      .from(stock_items)
      .where(eq(stock_items.userId, userId));

    const likelyStockOut = lowStockItems
      .map((item) => ({
        name: item.name,
        current: safeNumber(item.currentQuantity),
        threshold: item.lowStockThreshold === null ? null : safeNumber(item.lowStockThreshold),
      }))
      .filter((item) => item.threshold !== null && item.current <= item.threshold!);

    if (likelyStockOut.length) {
      insights.push({
        type: "stock_out_pattern",
        message: `You ran low on ${likelyStockOut[0].name} multiple times. Consider stocking more.`,
      });
    }

    weeklyCache.set(userId, { createdAt: Date.now(), insights, dailySeries, topItems });
    return res.json({ ok: true, insights, charts: { dailySeries, topItems } });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to generate weekly insights" });
  }
});

export default router;
