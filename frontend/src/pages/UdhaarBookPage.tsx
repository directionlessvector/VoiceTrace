import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalInput } from "@/components/shared/BrutalInput";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { StatCard } from "@/components/shared/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  listCustomers,
  listCustomerBalances,
  getCustomerLedger,
  createCustomer,
  addCustomerLedgerEntry,
  type Customer,
  type CustomerBalance,
  type CustomerLedgerEntry,
} from "@/lib/customersApi";
import { Plus, Phone, CheckCircle2, Wallet, Users, AlertCircle, Clock } from "lucide-react";

const OVERDUE_DAYS = 14;

// Joined shape: customer row + balance data from customer_ledger
type CustomerWithBalance = Customer & {
  balance: string;
  totalDebits: string;
  lastTxnDate: string | null;
};

function joinCustomerData(customerList: Customer[], balances: CustomerBalance[]): CustomerWithBalance[] {
  const balanceMap = new Map(balances.map((b) => [b.customerId, b]));
  return customerList.map((c) => ({
    ...c,
    balance: balanceMap.get(c.id)?.balance ?? "0",
    totalDebits: balanceMap.get(c.id)?.totalDebits ?? "0",
    lastTxnDate: balanceMap.get(c.id)?.lastTxnDate ?? null,
  }));
}

function getStatus(c: CustomerWithBalance): "paid" | "pending" | "overdue" {
  const balance = Number(c.balance);
  if (balance <= 0) return "paid";
  if (!c.lastTxnDate) return "pending";
  const daysSince = Math.floor((Date.now() - new Date(c.lastTxnDate).getTime()) / 86400000);
  return daysSince >= OVERDUE_DAYS ? "overdue" : "pending";
}

export default function UdhaarBookPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Details modal
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Call modal
  const [callCustomer, setCallCustomer] = useState<CustomerWithBalance | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", amount: "", description: "", txnDate: new Date().toISOString().slice(0, 10) });
  const [addSaving, setAddSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const refresh = async () => {
    try {
      // Two documented endpoints, joined client-side
      const [customerList, balances] = await Promise.all([
        listCustomers(),
        listCustomerBalances(),
      ]);
      setCustomers(joinCustomerData(customerList, balances));
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load udhaar data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openDetails = async (id: string) => {
    setDetailsId(id);
    setLedger([]);
    setLedgerLoading(true);
    try {
      setLedger(await getCustomerLedger(id));
    } catch {
      toast({ title: "Failed to load transactions", variant: "destructive" });
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleAddUdhaar = async () => {
    if (!addForm.name.trim()) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    const amount = Number(addForm.amount);
    if (!amount || amount <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setAddSaving(true);
    try {
      const customer = await createCustomer({ name: addForm.name.trim(), phone: addForm.phone.trim() || undefined });
      await addCustomerLedgerEntry({
        customerId: customer.id,
        txnType: "credit",
        amount: String(amount),
        description: addForm.description.trim() || undefined,
        txnDate: addForm.txnDate,
      });
      toast({ title: "Udhaar added", description: `₹${amount} for ${customer.name}` });
      setAddOpen(false);
      setAddForm({ name: "", phone: "", amount: "", description: "", txnDate: new Date().toISOString().slice(0, 10) });
      await refresh();
    } catch (err) {
      toast({ title: "Failed to add udhaar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  const handleMarkPaid = async (customer: CustomerWithBalance) => {
    const balance = Number(customer.balance);
    if (balance <= 0) return;
    setMarkingPaid(customer.id);
    try {
      await addCustomerLedgerEntry({
        customerId: customer.id,
        txnType: "debit",
        amount: String(balance),
        description: "Payment received",
        txnDate: new Date().toISOString().slice(0, 10),
      });
      toast({ title: "Marked as paid", description: `₹${balance.toLocaleString()} from ${customer.name}` });
      await refresh();
      if (detailsId === customer.id) setLedger(await getCustomerLedger(customer.id));
    } catch {
      toast({ title: "Failed to mark paid", variant: "destructive" });
    } finally {
      setMarkingPaid(null);
    }
  };

  const filtered = customers.filter((c) => {
    const matchesFilter = filter === "all" || getStatus(c) === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search);
    return matchesFilter && matchesSearch;
  });

  const totalUdhaar = customers.reduce((s, c) => s + Math.max(0, Number(c.balance)), 0);
  const totalCollected = customers.reduce((s, c) => s + Number(c.totalDebits), 0);
  const pending = customers.filter((c) => getStatus(c) === "pending").reduce((s, c) => s + Number(c.balance), 0);
  const overdue = customers.filter((c) => getStatus(c) === "overdue").reduce((s, c) => s + Number(c.balance), 0);

  const activeCustomer = customers.find((c) => c.id === detailsId);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <SkeletonLoader type="text" lines={2} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonLoader type="stat" /><SkeletonLoader type="stat" /><SkeletonLoader type="stat" /><SkeletonLoader type="stat" />
          </div>
          <SkeletonLoader type="card" /><SkeletonLoader type="card" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Wallet className="text-primary" /> {t("page.udhaar")}
            </h1>
            <p className="text-muted-foreground font-medium mt-1">{t("page.udhaarSubtitle")}</p>
          </div>
          <BrutalButton variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} /> Add Udhaar
          </BrutalButton>
        </div>

        {fetchError && (
          <BrutalCard className="py-4 text-center">
            <p className="text-destructive font-bold">{fetchError}</p>
          </BrutalCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Udhaar" value={totalUdhaar} icon={Users} variant="default" />
          <StatCard title="Collected" value={totalCollected} icon={CheckCircle2} variant="earnings" />
          <StatCard title="Pending" value={pending} icon={Clock} variant="pending" />
          <StatCard title="Overdue" value={overdue} icon={AlertCircle} variant="expenses" />
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="w-full md:w-72">
            <BrutalInput placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <BrutalCard className="text-center py-12 text-muted-foreground font-bold">
              {customers.length === 0 ? "No udhaar entries yet. Add your first one!" : "No customers match your filters."}
            </BrutalCard>
          ) : (
            filtered.map((c) => {
              const status = getStatus(c);
              const balance = Number(c.balance);
              return (
                <BrutalCard key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black">{c.name}</h3>
                      {status === "paid" && <BrutalBadge variant="confirmed">Paid</BrutalBadge>}
                      {status === "pending" && <BrutalBadge variant="warning">Pending</BrutalBadge>}
                      {status === "overdue" && <BrutalBadge variant="danger">Overdue</BrutalBadge>}
                    </div>
                    {c.phone && (
                      <p className="flex items-center gap-1 text-sm text-foreground/80 font-medium">
                        <Phone size={14} /> {c.phone}
                      </p>
                    )}
                    {c.lastTxnDate && (
                      <p className="text-xs text-muted-foreground">Last TX: {c.lastTxnDate}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding</p>
                      <p className="text-2xl font-black font-mono">₹{Math.max(0, balance).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <BrutalButton variant="secondary" className="px-3" onClick={() => openDetails(c.id)}>Details</BrutalButton>
                      <BrutalButton
                        variant={status === "overdue" ? "danger" : "primary"}
                        className="px-3"
                        disabled={balance <= 0 || markingPaid === c.id}
                        loading={markingPaid === c.id}
                        onClick={() => handleMarkPaid(c)}
                      >
                        <CheckCircle2 size={16} /> Mark Paid
                      </BrutalButton>
                      {c.phone && (
                        <BrutalButton variant="secondary" className="px-3" title="Call Customer" onClick={() => setCallCustomer(c)}>
                          <Phone size={16} />
                        </BrutalButton>
                      )}
                    </div>
                  </div>
                </BrutalCard>
              );
            })
          )}
        </div>
      </div>

      {/* Call Modal */}
      {callCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCallCustomer(null)} />
          <div className="brutal-card bg-card w-full max-w-sm z-10">
            <div className="p-5 border-b-[3px] border-foreground flex justify-between items-center">
              <h2 className="text-lg font-black">Call Customer</h2>
              <button className="font-black hover:opacity-80" onClick={() => setCallCustomer(null)}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="font-bold text-lg">{callCustomer.name}</p>
              <div className="brutal-border p-4 bg-muted flex items-center gap-3">
                <Phone size={20} className="text-primary shrink-0" />
                <p className="font-mono font-bold text-xl tracking-wider">{callCustomer.phone}</p>
              </div>
              {callCustomer.balance && Number(callCustomer.balance) > 0 && (
                <p className="text-sm text-muted-foreground font-medium">
                  Outstanding: <span className="font-bold text-destructive">₹{Number(callCustomer.balance).toLocaleString()}</span>
                </p>
              )}
            </div>
            <div className="p-5 border-t-[3px] border-foreground flex gap-3">
              <BrutalButton variant="secondary" className="flex-1" onClick={() => setCallCustomer(null)}>Cancel</BrutalButton>
              <a href={`tel:${callCustomer.phone}`} className="flex-1">
                <BrutalButton variant="primary" className="w-full">
                  <Phone size={16} /> Call Now
                </BrutalButton>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsId && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDetailsId(null)} />
          <div className="brutal-card bg-card w-full max-w-lg z-10 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b-[3px] border-foreground flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">{activeCustomer.name}</h2>
                <p className="text-sm text-muted-foreground font-medium">{activeCustomer.phone ?? "No phone"}</p>
              </div>
              <BrutalButton variant="secondary" className="px-2 py-1" onClick={() => setDetailsId(null)}>✕</BrutalButton>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted brutal-border">
                <p className="font-bold">Total Due</p>
                <p className="text-xl font-black font-mono">₹{Math.max(0, Number(activeCustomer.balance)).toLocaleString()}</p>
              </div>
              <h3 className="font-bold border-b-[3px] border-foreground pb-2">Transactions</h3>
              {ledgerLoading ? (
                <SkeletonLoader type="text" lines={3} />
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                ledger.map((e) => (
                  <div key={e.id} className="flex justify-between py-3 border-b-2 border-dashed border-foreground/30">
                    <div>
                      <p className="font-bold">{e.description ?? (e.txnType === "credit" ? "Credit" : "Payment")}</p>
                      <p className="text-muted-foreground text-xs">{e.txnDate}</p>
                    </div>
                    <p className={`font-bold ${e.txnType === "credit" ? "text-destructive" : "text-success"}`}>
                      {e.txnType === "credit" ? "-" : "+"}₹{Number(e.amount).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="p-5 border-t-[3px] border-foreground flex gap-3">
              {activeCustomer.phone && (
                <BrutalButton variant="secondary" className="flex-1" onClick={() => { setDetailsId(null); setCallCustomer(activeCustomer); }}>
                  <Phone size={18} /> Call
                </BrutalButton>
              )}
              <BrutalButton
                variant="primary"
                className="flex-1"
                disabled={Number(activeCustomer.balance) <= 0 || markingPaid === activeCustomer.id}
                loading={markingPaid === activeCustomer.id}
                onClick={() => handleMarkPaid(activeCustomer)}
              >
                <CheckCircle2 size={18} /> Mark Paid
              </BrutalButton>
            </div>
          </div>
        </div>
      )}

      {/* Add Udhaar Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="brutal-card bg-card w-full max-w-md z-10 flex flex-col">
            <div className="p-5 border-b-[3px] border-foreground flex justify-between items-center bg-primary text-primary-foreground">
              <h2 className="text-xl font-black">Add New Udhaar</h2>
              <button className="font-black hover:opacity-80" onClick={() => setAddOpen(false)}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <BrutalInput label="Customer Name *" placeholder="e.g. Ramesh Singh" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
              <BrutalInput label="Phone Number" placeholder="+91 99999 99999" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
              <BrutalInput label="Item / Description" placeholder="e.g. 10 bags of rice" value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <BrutalInput label="Amount (₹) *" placeholder="0.00" type="number" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))} />
                <BrutalInput label="Date" type="date" placeholder="" value={addForm.txnDate} onChange={(e) => setAddForm((f) => ({ ...f, txnDate: e.target.value }))} />
              </div>
            </div>
            <div className="p-5 border-t-[3px] border-foreground">
              <BrutalButton variant="primary" className="w-full" onClick={handleAddUdhaar} loading={addSaving}>Save Entry</BrutalButton>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
