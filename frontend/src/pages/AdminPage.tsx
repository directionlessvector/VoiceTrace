import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { adminVendors } from "@/data/mockData";
import { Users, UserCheck, Search, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedVendor, setSelectedVendor] = useState<(typeof adminVendors)[0] | null>(null);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  const filtered = adminVendors.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalVendors = adminVendors.length;
  const activeVendors = adminVendors.filter((v) => v.status === "active").length;

  const vendorChartData = selectedVendor
    ? [
        { month: "Jan", earnings: Math.round(selectedVendor.earnings * 0.7) },
        { month: "Feb", earnings: Math.round(selectedVendor.earnings * 0.85) },
        { month: "Mar", earnings: selectedVendor.earnings },
      ]
    : [];

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><div className="grid sm:grid-cols-2 gap-4"><SkeletonLoader type="stat" /><SkeletonLoader type="stat" /></div><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>

        {/* Overview */}
        <div className="grid sm:grid-cols-2 gap-4">
          <StatCard title="Total Vendors" value={totalVendors.toString()} icon={Users} />
          <StatCard title="Active Users" value={activeVendors.toString()} icon={UserCheck} variant="earnings" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-10 pr-4 py-2.5 brutal-input" />
          </div>
          <div className="flex brutal-border overflow-hidden">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 text-sm font-bold capitalize transition-colors ${s !== "all" ? "border-l-[3px] border-foreground" : ""} ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor Table */}
        {filtered.length === 0 ? (
          <BrutalCard className="text-center py-12">
            <p className="text-lg font-bold text-muted-foreground">No vendors found</p>
          </BrutalCard>
        ) : (
          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[3px] border-foreground">
                  <th className="text-left p-3 font-bold uppercase tracking-wide">Name</th>
                  <th className="text-left p-3 font-bold uppercase tracking-wide hidden sm:table-cell">Business</th>
                  <th className="text-left p-3 font-bold uppercase tracking-wide hidden md:table-cell">Location</th>
                  <th className="text-left p-3 font-bold uppercase tracking-wide">Status</th>
                  <th className="text-left p-3 font-bold uppercase tracking-wide hidden sm:table-cell">Entries</th>
                  <th className="text-right p-3 font-bold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b-[3px] border-muted hover:bg-muted/50">
                    <td className="p-3 font-bold">{v.name}</td>
                    <td className="p-3 hidden sm:table-cell">{v.business}</td>
                    <td className="p-3 hidden md:table-cell">{v.location}</td>
                    <td className="p-3">
                      <BrutalBadge variant={v.status === "active" ? "confirmed" : "approximate"}>{v.status}</BrutalBadge>
                    </td>
                    <td className="p-3 font-mono hidden sm:table-cell">{v.entries}</td>
                    <td className="p-3 text-right">
                      <BrutalButton variant="outline" size="sm" onClick={() => setSelectedVendor(v)}>
                        <Eye size={14} /> View
                      </BrutalButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Detail Modal */}
      <BrutalModal open={!!selectedVendor} onClose={() => setSelectedVendor(null)} title="Vendor Details">
        {selectedVendor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="brutal-border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Name</p>
                <p className="font-bold">{selectedVendor.name}</p>
              </div>
              <div className="brutal-border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Business</p>
                <p className="font-bold">{selectedVendor.business}</p>
              </div>
              <div className="brutal-border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Location</p>
                <p className="font-bold">{selectedVendor.location}</p>
              </div>
              <div className="brutal-border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Last Active</p>
                <p className="font-bold">{selectedVendor.lastActive}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">Earnings Trend</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorChartData}>
                    <XAxis dataKey="month" tick={{ fontWeight: 700, fontSize: 12 }} />
                    <YAxis tick={{ fontWeight: 700, fontSize: 12 }} />
                    <Tooltip contentStyle={{ border: "3px solid #000", borderRadius: "4px", fontWeight: 700 }} />
                    <Bar dataKey="earnings" fill="hsl(142, 76%, 36%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">Activity Log</h4>
              <div className="space-y-2">
                {["Recorded voice entry", "Generated weekly report", "Updated profile"].map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm brutal-border p-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    <span className="font-medium">{log}</span>
                    <span className="ml-auto text-muted-foreground text-xs">{i + 1}d ago</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </BrutalModal>
    </AppLayout>
  );
}
