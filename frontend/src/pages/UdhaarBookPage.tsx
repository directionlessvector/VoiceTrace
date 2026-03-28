import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalInput } from "@/components/shared/BrutalInput";
import { Mic, Plus, Search, Phone, Bell, FileText, CheckCircle2, Wallet, Users, AlertCircle, Clock } from "lucide-react";

// Mock Data
const stats = {
  total: 45500,
  collected: 12500,
  pending: 18000,
  overdue: 15000,
};

const mockCustomers = [
  { id: 1, name: "Ramesh Store", phone: "+91 9876543210", address: "Sector 14, Main Market", amount: 4500, status: "pending", lastTx: "2 days ago" },
  { id: 2, name: "Suresh Provision", phone: "+91 9876543211", address: "Apna Bazar", amount: 15000, status: "overdue", lastTx: "15 days ago" },
  { id: 3, name: "Amit Traders", phone: "+91 9876543212", address: "Galaxy Road", amount: 0, status: "paid", lastTx: "1 hour ago" },
  { id: 4, name: "Sita Enterprises", phone: "+91 9876543213", address: "Phase 3 Industrial", amount: 13500, status: "pending", lastTx: "1 week ago" },
];

export default function UdhaarBookPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<number | null>(null);

  const activeCustomer = mockCustomers.find(c => c.id === detailsModalOpen);

  // Filter customers
  const filteredCustomers = mockCustomers.filter(c => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Wallet className="text-primary" /> UdhaarBook
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Track and recover customer udhaar efficiently.</p>
          </div>
          <div className="flex gap-3">
            <BrutalButton variant="secondary" onClick={() => { }}>
              <Mic size={18} /> Record Udhaar
            </BrutalButton>
            <BrutalButton variant="primary" onClick={() => setAddModalOpen(true)}>
              <Plus size={18} /> Add Udhaar
            </BrutalButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Udhaar" value={stats.total} icon={Users} variant="default" />
          <StatCard title="Collected" value={stats.collected} icon={CheckCircle2} variant="earnings" />
          <StatCard title="Pending" value={stats.pending} icon={Clock} variant="pending" />
          <StatCard title="Overdue" value={stats.overdue} icon={AlertCircle} variant="expenses" />
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          {/* Segments */}
          <div className="flex items-center brutal-border bg-card overflow-hidden w-fit">
            {["all", "pending", "overdue", "paid"].map((f) => (
              <button
                key={f}
                className={`px-4 py-2 text-sm font-bold border-r-[3px] border-foreground last:border-0 transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {/* Search Input */}
          <div className="w-full md:w-72">
            <BrutalInput
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <BrutalCard className="text-center py-12 text-muted-foreground font-bold">
              No customers found.
            </BrutalCard>
          ) : (
            filteredCustomers.map(customer => (
              <BrutalCard key={customer.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black">{customer.name}</h3>
                    {customer.status === "paid" && <BrutalBadge variant="confirmed">Paid</BrutalBadge>}
                    {customer.status === "pending" && <BrutalBadge variant="warning">Pending</BrutalBadge>}
                    {customer.status === "overdue" && <BrutalBadge variant="danger">Overdue</BrutalBadge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80 font-medium">
                    <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
                    <span className="opacity-40">|</span>
                    <span>Last TX: {customer.lastTx}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding</p>
                    <p className="text-2xl font-black font-mono">₹{customer.amount.toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <BrutalButton variant="secondary" className="flex-1 sm:flex-none px-3" onClick={() => setDetailsModalOpen(customer.id)}>
                      <FileText size={16} /> Details
                    </BrutalButton>
                    <BrutalButton variant={customer.status === "overdue" ? "danger" : "primary"} className="flex-1 sm:flex-none px-3" disabled={customer.amount === 0}>
                      <Bell size={16} /> Remind
                    </BrutalButton>
                    <BrutalButton variant="secondary" className="px-3" title="Call Customer">
                      <Phone size={16} />
                    </BrutalButton>
                  </div>
                </div>
              </BrutalCard>
            ))
          )}
        </div>
      </div>

      {/* Details Drawer/Modal */}
      {detailsModalOpen !== null && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end md:justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDetailsModalOpen(null)} />
          <div className="brutal-card bg-card w-full max-w-lg z-10 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b-[3px] border-foreground flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">{activeCustomer.name}</h2>
                <p className="text-sm text-muted-foreground font-medium">{activeCustomer.phone}</p>
              </div>
              <BrutalButton variant="secondary" className="px-2 py-1" onClick={() => setDetailsModalOpen(null)}>X</BrutalButton>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              <div className="flex justify-between items-center p-4 bg-muted brutal-border">
                <p className="font-bold">Total Due</p>
                <p className="text-xl font-black font-mono">₹{activeCustomer.amount.toLocaleString()}</p>
              </div>

              <div>
                <h3 className="font-bold mb-3 border-b-[3px] border-foreground pb-2">Recent Transactions</h3>
                <div className="space-y-0 text-sm">
                  {/* Fake TX list */}
                  <div className="flex justify-between py-3 border-b-2 border-dashed border-foreground/30">
                    <div>
                      <p className="font-bold">Wheat 20kg</p>
                      <p className="text-muted-foreground text-xs">1 week ago</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">-₹13,500</p>
                      <p className="text-muted-foreground text-xs">Due in 5 days</p>
                    </div>
                  </div>
                  {activeCustomer.amount !== 13500 && (
                    <div className="flex justify-between py-3 border-b-2 border-dashed border-foreground/30">
                      <div>
                        <p className="font-bold">Payment Received</p>
                        <p className="text-muted-foreground text-xs">2 weeks ago</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">+₹5,000</p>
                        <p className="text-muted-foreground text-xs">Paid</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t-[3px] border-foreground flex gap-3">
              <BrutalButton variant="secondary" className="flex-1"><Phone size={18} /> Call</BrutalButton>
              <BrutalButton variant="primary" className="flex-1"><Bell size={18} /> Reminder</BrutalButton>
              <BrutalButton variant="primary" className="flex-1 whitespace-nowrap"><CheckCircle2 size={18} /> Mark Paid</BrutalButton>
            </div>
          </div>
        </div>
      )}

      {/* Add Udhaar Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="brutal-card bg-card w-full max-w-md z-10 flex flex-col">
            <div className="p-5 border-b-[3px] border-foreground flex justify-between items-center bg-primary text-primary-foreground">
              <h2 className="text-xl font-black">Add New Udhaar</h2>
              <button className="font-black hover:opacity-80" onClick={() => setAddModalOpen(false)}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <BrutalInput label="Customer Name" placeholder="e.g. Ramesh Singh" />
              <BrutalInput label="Phone Number" placeholder="+91 99999 99999" />
              <BrutalInput label="Item / Description" placeholder="e.g. 10 bags of rice" />

              <div className="grid grid-cols-2 gap-4">
                <BrutalInput label="Amount (₹)" placeholder="0.00" />
                <BrutalInput label="Due Date" type="date" placeholder="" />
              </div>
            </div>

            <div className="p-5 border-t-[3px] border-foreground">
              <BrutalButton variant="primary" className="w-full" onClick={() => setAddModalOpen(false)}>Save Entry</BrutalButton>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
