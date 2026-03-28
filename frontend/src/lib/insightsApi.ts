import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type WeeklyInsight = {
  type: "top_item" | "best_day" | "expense_trend" | "sales_trend" | "stock_out_pattern" | "not_enough_data";
  message: string;
};

export type WeeklyDailyPoint = {
  date: string;
  day: string;
  sales: number;
  expenses: number;
  net: number;
};

export type WeeklyTopItemPoint = {
  itemName: string;
  quantity: number;
};

export type WeeklyInsightsResponse = {
  insights: WeeklyInsight[];
  charts: {
    dailySeries: WeeklyDailyPoint[];
    topItems: WeeklyTopItemPoint[];
  };
};

function normalizeInsights(value: unknown): WeeklyInsight[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WeeklyInsight => {
    return (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      "message" in item &&
      typeof (item as { type?: unknown }).type === "string" &&
      typeof (item as { message?: unknown }).message === "string"
    );
  });
}

function normalizeDailySeries(value: unknown): WeeklyDailyPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is WeeklyDailyPoint => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { date?: unknown }).date === "string" &&
        typeof (item as { day?: unknown }).day === "string"
      );
    })
    .map((item) => ({
      date: item.date,
      day: item.day,
      sales: Number(item.sales) || 0,
      expenses: Number(item.expenses) || 0,
      net: Number(item.net) || 0,
    }));
}

function normalizeTopItems(value: unknown): WeeklyTopItemPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is WeeklyTopItemPoint => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { itemName?: unknown }).itemName === "string"
      );
    })
    .map((item) => ({
      itemName: item.itemName,
      quantity: Number(item.quantity) || 0,
    }));
}

export async function fetchWeeklyInsights(): Promise<WeeklyInsightsResponse> {
  const userId = await resolveActiveUserId();
  const params = new URLSearchParams({ userId });
  const response = await fetchJson<{ ok: boolean; insights?: unknown; charts?: unknown }>(
    `/api/insights/weekly?${params.toString()}`
  );

  const charts = (response.charts ?? {}) as {
    dailySeries?: unknown;
    topItems?: unknown;
  };

  return {
    insights: normalizeInsights(response.insights),
    charts: {
      dailySeries: normalizeDailySeries(charts.dailySeries),
      topItems: normalizeTopItems(charts.topItems),
    },
  };
}
