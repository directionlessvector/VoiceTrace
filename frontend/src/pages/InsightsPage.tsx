import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { weeklyInsights, insightMessages } from "@/data/mockData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  const weeklyTotal = weeklyInsights.reduce((a, d) => a + d.earnings, 0);
  const weeklyExpenses = weeklyInsights.reduce((a, d) => a + d.expenses, 0);
  const monthlyTotal = weeklyTotal * 4;
  const monthlyExpenses = weeklyExpenses * 4;

  const insightIcons = { positive: TrendingUp, negative: TrendingDown, neutral: Minus };
  const insightColors = { positive: "success" as const, negative: "destructive" as const, neutral: "secondary" as const };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Insights</h1>

        {/* Chart */}
        <BrutalCard>
          <h3 className="font-bold mb-4">Weekly Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyInsights}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontWeight: 700, fontSize: 12 }} />
                <YAxis tick={{ fontWeight: 700, fontSize: 12 }} />
                <Tooltip contentStyle={{ border: "3px solid #000", borderRadius: "4px", fontWeight: 700 }} />
                <Bar dataKey="earnings" fill="hsl(142, 76%, 36%)" name="Earnings" />
                <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BrutalCard>

        {/* Insight Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {insightMessages.map((insight) => {
            const Icon = insightIcons[insight.type];
            return (
              <BrutalCard key={insight.id} highlight={insightColors[insight.type]}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-${insightColors[insight.type]}/10`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">{insight.message}</p>
                  </div>
                </div>
              </BrutalCard>
            );
          })}
        </div>

        {/* Summaries */}
        <div className="grid sm:grid-cols-2 gap-4">
          <BrutalCard highlight="secondary">
            <h3 className="font-bold text-lg mb-3">Weekly Summary</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span>Total Earnings</span><span className="font-bold text-success">₹{weeklyTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Total Expenses</span><span className="font-bold text-destructive">₹{weeklyExpenses.toLocaleString()}</span></div>
              <div className="border-t-[3px] border-foreground pt-2 flex justify-between"><span>Net Profit</span><span className="font-bold text-secondary">₹{(weeklyTotal - weeklyExpenses).toLocaleString()}</span></div>
            </div>
          </BrutalCard>
          <BrutalCard highlight="primary">
            <h3 className="font-bold text-lg mb-3">Monthly Estimate</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span>Total Earnings</span><span className="font-bold text-success">₹{monthlyTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Total Expenses</span><span className="font-bold text-destructive">₹{monthlyExpenses.toLocaleString()}</span></div>
              <div className="border-t-[3px] border-foreground pt-2 flex justify-between"><span>Net Profit</span><span className="font-bold text-secondary">₹{(monthlyTotal - monthlyExpenses).toLocaleString()}</span></div>
            </div>
          </BrutalCard>
        </div>
      </div>
    </AppLayout>
  );
}
