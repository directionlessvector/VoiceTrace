import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { adminVendors } from "@/data/mockData";
import { Users, UserCheck, Search, Eye, QrCode, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import jsQR from "jsqr";

type ReportQrData = {
  reportId: string;
  timestamp: string;
  fromDate?: string;
  toDate?: string;
  totalEarnings?: number;
  totalExpenses?: number;
  profit?: number;
  url?: string;
};

function parseReportQrPayload(raw: string): ReportQrData | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reportId = String(parsed.reportId ?? "").trim();
    const timestamp = String(parsed.timestamp ?? "").trim();
    if (!reportId || !timestamp) return null;

    return {
      reportId,
      timestamp,
      fromDate: parsed.fromDate ? String(parsed.fromDate) : undefined,
      toDate: parsed.toDate ? String(parsed.toDate) : undefined,
      totalEarnings: parsed.totalEarnings !== undefined ? Number(parsed.totalEarnings) : undefined,
      totalExpenses: parsed.totalExpenses !== undefined ? Number(parsed.totalExpenses) : undefined,
      profit: parsed.profit !== undefined ? Number(parsed.profit) : undefined,
      url: parsed.url ? String(parsed.url) : undefined,
    };
  } catch {
    return null;
  }
}

function formatCurrency(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `Rs ${Math.round(value).toLocaleString()}`;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedVendor, setSelectedVendor] = useState<(typeof adminVendors)[0] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [verifiedReport, setVerifiedReport] = useState<ReportQrData | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

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

  const stopScanner = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (!isScanning) return;

    let active = true;

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(image.data, image.width, image.height);
          if (qr?.data) {
            const parsed = parseReportQrPayload(qr.data);
            if (parsed) {
              setVerifiedReport(parsed);
              setScanError(null);
            } else {
              setScanError("QR scanned but payload is not a valid VoiceTrace report.");
            }
            stopScanner();
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        setScanError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        tick();
      } catch (error) {
        setScanError(error instanceof Error ? error.message : "Unable to start scanner.");
        stopScanner();
      }
    };

    void start();

    return () => {
      active = false;
      stopScanner();
    };
  }, [isScanning]);

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

        {/* Report QR Verification */}
        <BrutalCard className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <QrCode size={20} className="text-primary" />
              <h2 className="text-xl font-bold">Report QR Verification</h2>
            </div>
            {!isScanning ? (
              <BrutalButton
                variant="primary"
                onClick={() => {
                  setVerifiedReport(null);
                  setScanError(null);
                  setIsScanning(true);
                }}
              >
                <Camera size={16} /> Start Scanner
              </BrutalButton>
            ) : (
              <BrutalButton variant="danger" onClick={stopScanner}>
                <CameraOff size={16} /> Stop Scanner
              </BrutalButton>
            )}
          </div>

          {isScanning && (
            <div className="space-y-3">
              <div className="brutal-border overflow-hidden bg-black/80">
                <video ref={videoRef} className="w-full max-h-[360px] object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Point camera at the QR code shown at the end of report PDF.</p>
            </div>
          )}

          {scanError && (
            <div className="mt-4 brutal-border p-3 border-destructive bg-destructive/10">
              <p className="text-sm font-bold text-destructive">{scanError}</p>
            </div>
          )}

          {verifiedReport && (
            <div className="mt-4 space-y-4">
              <div className="brutal-border p-6 bg-blue-50 text-center">
                <CheckCircle2 size={76} className="mx-auto text-blue-600" />
                <p className="mt-3 text-3xl font-black tracking-tight text-blue-700">VERIFIED</p>
                <p className="text-lg font-bold text-blue-700">Verified by Vyaapar Saathi</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Report ID</p>
                  <p className="font-bold break-all">{verifiedReport.reportId}</p>
                </div>
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Generated At</p>
                  <p className="font-bold">{new Date(verifiedReport.timestamp).toLocaleString()}</p>
                </div>
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Date Range</p>
                  <p className="font-bold">{verifiedReport.fromDate && verifiedReport.toDate ? `${verifiedReport.fromDate} to ${verifiedReport.toDate}` : "-"}</p>
                </div>
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Report Source</p>
                  <p className="font-bold break-all">{verifiedReport.url || "-"}</p>
                </div>
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Total Earnings</p>
                  <p className="font-bold text-success">{formatCurrency(verifiedReport.totalEarnings)}</p>
                </div>
                <div className="brutal-border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Total Expenses</p>
                  <p className="font-bold text-destructive">{formatCurrency(verifiedReport.totalExpenses)}</p>
                </div>
                <div className="brutal-border p-3 md:col-span-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Net Profit</p>
                  <p className="font-bold text-primary">{formatCurrency(verifiedReport.profit)}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <BrutalButton
                  variant="outline"
                  onClick={() => {
                    setVerifiedReport(null);
                    setScanError(null);
                    setIsScanning(true);
                  }}
                >
                  <QrCode size={16} /> Scan Another QR
                </BrutalButton>
              </div>
            </div>
          )}
        </BrutalCard>

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
