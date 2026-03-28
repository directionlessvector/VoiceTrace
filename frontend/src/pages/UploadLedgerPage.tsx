
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { processLedgerImage, type OcrLedgerResult } from "@/lib/ocrLedgerApi";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileImage, Camera, CameraOff } from "lucide-react";

export default function UploadLedgerPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OcrLedgerResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const onPickFile = (nextFile: File | null) => {
    setFile(nextFile);
    setResult(null);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const startCamera = async () => {
    setCameraOpen(true);
    try {
      setCameraLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Camera unavailable",
        description: error instanceof Error ? error.message : "Could not access camera",
        variant: "destructive",
      });
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const capturedFile = new File([blob], `ledger-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    onPickFile(capturedFile);
    stopCamera();
  };

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!cameraOpen || !video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      // Autoplay can fail until user interacts; stream remains attached.
    });
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const extracted = await processLedgerImage(file, false);
      setResult(extracted);
      toast({ title: "OCR Complete", description: "Review extracted data, then confirm to save." });
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Could not process image",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const saved = await processLedgerImage(file, true);
      setResult(saved);
      toast({ title: "Saved", description: "OCR ledger has been stored in sessions and ledger entries." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save OCR ledger",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Upload Ledger</h1>
          <p className="text-muted-foreground font-medium mt-1">Upload a ledger image, preview extraction, then confirm save.</p>
        </div>

        <BrutalCard>
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wide">Ledger Image (JPG / PNG)</label>
            <label className="brutal-border brutal-shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors">
              <FileImage size={20} />
              <span className="font-medium">{file ? file.name : "Choose image file"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                capture="environment"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {!cameraOpen ? (
                <BrutalButton variant="outline" onClick={startCamera} loading={cameraLoading}>
                  <Camera size={16} /> Open Camera
                </BrutalButton>
              ) : (
                <>
                  <BrutalButton variant="primary" onClick={captureFromCamera}>
                    <Camera size={16} /> Capture Photo
                  </BrutalButton>
                  <BrutalButton variant="outline" onClick={stopCamera}>
                    <CameraOff size={16} /> Close Camera
                  </BrutalButton>
                </>
              )}
            </div>

            {cameraOpen && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wide mb-2">Camera</p>
                <video
                  ref={videoRef}
                  className="w-full max-h-96 brutal-border bg-black"
                  playsInline
                  muted
                  autoPlay
                />
              </div>
            )}

            {previewUrl && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wide mb-2">Preview</p>
                <img src={previewUrl} alt="Ledger preview" className="max-h-96 w-auto brutal-border" />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <BrutalButton variant="primary" onClick={handleExtract} disabled={!file} loading={processing}>
                <Upload size={16} /> Extract Ledger
              </BrutalButton>
              <BrutalButton variant="secondary" onClick={handleConfirmSave} disabled={!file || !result} loading={saving}>
                Confirm & Save
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>

        {result && (
          <BrutalCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Extracted Preview</h2>
                <BrutalBadge variant={result.saved ? "confirmed" : "approximate"}>
                  {result.saved ? "Saved" : "Not Saved"}
                </BrutalBadge>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="brutal-border p-3 bg-success/10 text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Total Earnings</p>
                  <p className="font-mono font-bold">₹{result.extractedData.totalEarnings}</p>
                </div>
                <div className="brutal-border p-3 bg-muted text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Items</p>
                  <p className="font-mono font-bold">{result.extractedData.items.length}</p>
                </div>
                <div className="brutal-border p-3 bg-destructive/10 text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Expenses</p>
                  <p className="font-mono font-bold">{result.extractedData.expenses.length}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Items</h3>
                <div className="space-y-2">
                  {result.extractedData.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="brutal-border bg-muted px-3 py-2 flex items-center justify-between">
                      <p className="font-medium">{item.name} x{item.quantity}</p>
                      <div className="flex items-center gap-2">
                        <BrutalBadge variant={item.confidence === "high" ? "confirmed" : item.confidence === "low" ? "danger" : "warning"}>{item.confidence}</BrutalBadge>
                        <span className="font-mono font-bold">₹{item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Expenses</h3>
                <div className="space-y-2">
                  {result.extractedData.expenses.map((exp, index) => (
                    <div key={`${exp.type}-${index}`} className="brutal-border bg-muted px-3 py-2 flex items-center justify-between">
                      <p className="font-medium">{exp.type}</p>
                      <div className="flex items-center gap-2">
                        <BrutalBadge variant={exp.confidence === "high" ? "confirmed" : exp.confidence === "low" ? "danger" : "warning"}>{exp.confidence}</BrutalBadge>
                        <span className="font-mono font-bold">₹{exp.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Cloudinary Image</h3>
                <a href={result.imageUrl} target="_blank" rel="noreferrer" className="text-primary underline font-medium">
                  Open Uploaded Image
                </a>
              </div>
            </div>
          </BrutalCard>
        )}
      </div>
    </AppLayout>
  );
}
