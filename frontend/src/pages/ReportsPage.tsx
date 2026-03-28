import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { weeklyInsights } from "@/data/mockData";
import { FileText, Download } from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  const weeklyTotal = weeklyInsights.reduce((a, d) => a + d.earnings, 0);
  const weeklyExpenses = weeklyInsights.reduce((a, d) => a + d.expenses, 0);

  const handleDownload = (type: string) => {
    alert(`📄 ${type} report download started! (Mock — no file generated)`);
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>

        <div className="grid sm:grid-cols-2 gap-6">
          <BrutalCard highlight="primary">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-sm brutal-border flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Weekly Report</h3>
                <p className="text-sm text-muted-foreground font-medium">March 22 - March 28, 2026</p>
              </div>
            </div>
            <div className="space-y-2 font-mono text-sm mb-4">
              <div className="flex justify-between"><span>Earnings</span><span className="font-bold text-success">₹{weeklyTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="font-bold text-destructive">₹{weeklyExpenses.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Entries</span><span className="font-bold">7</span></div>
              <div className="border-t-[3px] border-foreground pt-2 flex justify-between"><span>Net Profit</span><span className="font-bold text-secondary">₹{(weeklyTotal - weeklyExpenses).toLocaleString()}</span></div>
            </div>
            <BrutalButton variant="primary" className="w-full" onClick={() => handleDownload("Weekly")}>
              <Download size={18} /> Download PDF
            </BrutalButton>
          </BrutalCard>

          <BrutalCard highlight="secondary">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-sm brutal-border flex items-center justify-center">
                <FileText size={20} className="text-secondary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Monthly Report</h3>
                <p className="text-sm text-muted-foreground font-medium">March 2026</p>
              </div>
            </div>
            <div className="space-y-2 font-mono text-sm mb-4">
              <div className="flex justify-between"><span>Earnings</span><span className="font-bold text-success">₹{(weeklyTotal * 4).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="font-bold text-destructive">₹{(weeklyExpenses * 4).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Entries</span><span className="font-bold">28</span></div>
              <div className="border-t-[3px] border-foreground pt-2 flex justify-between"><span>Net Profit</span><span className="font-bold text-secondary">₹{((weeklyTotal - weeklyExpenses) * 4).toLocaleString()}</span></div>
            </div>
            <BrutalButton variant="secondary" className="w-full" onClick={() => handleDownload("Monthly")}>
              <Download size={18} /> Download PDF
            </BrutalButton>
          </BrutalCard>
        </div>
      </div>
    </AppLayout>
  );
}
