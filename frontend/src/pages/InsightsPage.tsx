import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import {
  fetchWeeklyInsights,
  type WeeklyDailyPoint,
  type WeeklyInsight,
  type WeeklyTopItemPoint,
} from "@/lib/insightsApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lightbulb, TrendingUp, TrendingDown, PackageSearch, CalendarDays } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  sales: { label: "Sales", color: "hsl(var(--primary))" },
  expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
  quantity: { label: "Units Sold", color: "hsl(var(--accent))" },
};

export default function InsightsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [dailySeries, setDailySeries] = useState<WeeklyDailyPoint[]>([]);
  const [topItems, setTopItems] = useState<WeeklyTopItemPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchWeeklyInsights();
        if (!mounted) return;
        setInsights(Array.isArray(result.insights) ? result.insights : []);
        setDailySeries(Array.isArray(result.charts.dailySeries) ? result.charts.dailySeries : []);
        setTopItems(Array.isArray(result.charts.topItems) ? result.charts.topItems : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load weekly insights");
        setInsights([]);
        setDailySeries([]);
        setTopItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const insightIconByType: Record<WeeklyInsight["type"], typeof Lightbulb> = {
    top_item: Lightbulb,
    best_day: CalendarDays,
    expense_trend: TrendingDown,
    sales_trend: TrendingUp,
    stock_out_pattern: PackageSearch,
    not_enough_data: Lightbulb,
  };

  const insightTitleByType: Record<WeeklyInsight["type"], string> = {
    top_item: "Top Item Pattern",
    best_day: "Best Day Pattern",
    expense_trend: "Expense Trend",
    sales_trend: "Sales Trend",
    stock_out_pattern: "Stock Pattern",
    not_enough_data: "Data Status",
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">{t("page.insights")}</h1>

        {error && (
          <BrutalCard highlight="danger">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </BrutalCard>
        )}

        {insights.length === 0 ? (
          <BrutalCard>
            <h3 className="font-bold text-lg">Start recording your daily business to unlock insights.</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Weekly patterns appear after enough daily entries are captured.
            </p>
          </BrutalCard>
        ) : (
          <>
            {dailySeries.length > 0 && (
              <div className="grid lg:grid-cols-2 gap-4">
                <BrutalCard>
                  <h3 className="font-bold text-lg mb-3">Sales vs Expenses (Last 7 Days)</h3>
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <LineChart data={dailySeries} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--color-sales)"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="var(--color-expenses)"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </BrutalCard>

                <BrutalCard>
                  <h3 className="font-bold text-lg mb-3">Top Selling Items</h3>
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart data={topItems} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="itemName" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={64} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </BrutalCard>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {insights.map((insight, idx) => {
                const Icon = insightIconByType[insight.type];
                return (
                  <BrutalCard key={`${insight.type}-${idx}`} highlight="secondary">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-primary/10">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold">{insightTitleByType[insight.type]}</h3>
                        <p className="text-sm text-muted-foreground font-medium mt-1">{insight.message}</p>
                      </div>
                    </div>
                  </BrutalCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
