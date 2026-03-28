import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Square, RotateCcw, Check, Edit3, AlertTriangle } from "lucide-react";
import { BrutalButton } from "./BrutalButton";
import { BrutalModal } from "./BrutalModal";
import { BrutalBadge } from "./BrutalBadge";
import { processVoiceAudio, type VoiceProcessResponse, type StructuredLine } from "@/lib/voiceApi";

type RecordingState = "idle" | "recording" | "processing" | "result";

interface VoiceRecorderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (result: VoiceProcessResponse) => void;
}

export function VoiceRecorderModal({ open, onClose, onSave }: VoiceRecorderModalProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<VoiceProcessResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "recording") {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setState("idle");
    setTimer(0);
    setTranscript("");
    setResult(null);
    setError("");
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  async function handleStartRecording() {
    try {
      setError("");
      setTimer(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type)
      );
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setState("processing");
          const blob = new Blob(chunksRef.current, { type: preferredMimeType || "audio/webm" });
          const response = await processVoiceAudio(blob);
          setTranscript(response.transcript);
          setResult(response);
          setState("result");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process recording");
          setState("idle");
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          chunksRef.current = [];
        }
      };

      mediaRecorder.start();
      setState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission denied or unavailable");
      setState("idle");
    }
  }

  function handleStopRecording() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function renderLineItems(lines: StructuredLine[]) {
    if (!lines.length) {
      return <p className="text-sm text-muted-foreground font-medium">No entries detected</p>;
    }

    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          const confidenceVariant =
            line.confidence === "high"
              ? "confirmed"
              : line.confidence === "low"
                ? "danger"
                : "warning";

          return (
            <div key={`${line.label}-${index}`} className="brutal-border bg-muted px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <p className="font-bold text-sm">{line.label}</p>
                <div className="flex items-center gap-2">
                  {line.isApproximate && <BrutalBadge variant="approximate">Approx</BrutalBadge>}
                  <BrutalBadge variant={confidenceVariant}>{line.confidence}</BrutalBadge>
                  <span className="font-mono font-bold text-sm">₹{line.amount}</span>
                </div>
              </div>
              {line.sourceText && <p className="text-xs text-muted-foreground mt-1">"{line.sourceText}"</p>}
            </div>
          );
        })}
      </div>
    );
  }

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <BrutalModal open={open} onClose={handleClose} title="Voice Entry">
      <div className="flex flex-col items-center gap-6 py-4">
        {state === "idle" && (
          <>
            <p className="text-muted-foreground font-bold text-center">Tap the mic to start recording your daily entry</p>
            <button
              onClick={handleStartRecording}
              className="w-24 h-24 rounded-full bg-primary text-primary-foreground brutal-border brutal-shadow-lg flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            >
              <Mic size={40} />
            </button>
            {error && (
              <div className="w-full brutal-border bg-destructive/10 p-3 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </>
        )}

        {state === "recording" && (
          <>
            <p className="text-2xl font-mono font-bold">{formatTime(timer)}</p>
            <div className="flex items-end gap-1 h-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-primary rounded-full waveform-bar"
                  style={{ animationDelay: `${i * 0.05}s`, height: "8px" }}
                />
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/30 pulse-ring" />
              <button
                onClick={handleStopRecording}
                className="relative w-20 h-20 rounded-full bg-destructive text-destructive-foreground brutal-border brutal-shadow flex items-center justify-center"
              >
                <Square size={28} fill="currentColor" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground font-bold">Recording... Tap to stop</p>
          </>
        )}

        {state === "processing" && (
          <>
            <div className="w-16 h-16 border-4 border-foreground border-t-primary rounded-full animate-spin" />
            <p className="font-bold text-muted-foreground">Processing your voice...</p>
          </>
        )}

        {state === "result" && (
          <>
            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-bold uppercase tracking-wide block">Transcript</label>
                {result?.languageDetected && (
                  <BrutalBadge variant="info">{result.languageDetected}</BrutalBadge>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full p-3 brutal-input min-h-[120px] resize-none"
                  autoFocus
                />
              ) : (
                <div className="w-full p-3 brutal-border bg-muted min-h-[120px]">
                  <p className="text-sm">{transcript}</p>
                </div>
              )}
            </div>

            {result && (
              <div className="w-full space-y-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Items</h4>
                  {renderLineItems(result.structured.items)}
                </div>

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Expenses</h4>
                  {renderLineItems(result.structured.expenses)}
                </div>

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Earnings</h4>
                  {renderLineItems(result.structured.earnings)}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="brutal-border bg-destructive/10 p-2 text-center">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Expenses</p>
                    <p className="font-mono font-bold">₹{result.structured.totals.expenseTotal}</p>
                  </div>
                  <div className="brutal-border bg-success/10 p-2 text-center">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Earnings</p>
                    <p className="font-mono font-bold">₹{result.structured.totals.earningsTotal}</p>
                  </div>
                  <div className="brutal-border bg-secondary/10 p-2 text-center">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Net</p>
                    <p className="font-mono font-bold">₹{result.structured.totals.net}</p>
                  </div>
                </div>

                {result.structured.notes.length > 0 && (
                  <div className="brutal-border bg-warning/10 p-3 text-sm">
                    <p className="font-bold mb-1">Notes</p>
                    <ul className="list-disc pl-5">
                      {result.structured.notes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 w-full">
              <BrutalButton variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 size={16} /> {isEditing ? "Preview" : "Edit"}
              </BrutalButton>
              <BrutalButton variant="outline" size="sm" onClick={reset}>
                <RotateCcw size={16} /> Re-record
              </BrutalButton>
              <BrutalButton
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  if (!result) return;
                  onSave({
                    ...result,
                    transcript,
                  });
                  handleClose();
                }}
              >
                <Check size={16} /> Confirm
              </BrutalButton>
            </div>
          </>
        )}
      </div>
    </BrutalModal>
  );
}
