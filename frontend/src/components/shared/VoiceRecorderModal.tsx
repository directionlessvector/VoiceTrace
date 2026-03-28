import { useState, useEffect, useCallback } from "react";
import { Mic, Square, RotateCcw, Check, Edit3 } from "lucide-react";
import { BrutalButton } from "./BrutalButton";
import { BrutalModal } from "./BrutalModal";
import { mockTranscripts } from "@/data/mockData";

type RecordingState = "idle" | "recording" | "processing" | "result";

interface VoiceRecorderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (transcript: string) => void;
}

export function VoiceRecorderModal({ open, onClose, onSave }: VoiceRecorderModalProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "recording") {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state === "processing") {
      const timeout = setTimeout(() => {
        setTranscript(mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)]);
        setState("result");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  const reset = useCallback(() => {
    setState("idle");
    setTimer(0);
    setTranscript("");
    setIsEditing(false);
  }, []);

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
              onClick={() => { setTimer(0); setState("recording"); }}
              className="w-24 h-24 rounded-full bg-primary text-primary-foreground brutal-border brutal-shadow-lg flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            >
              <Mic size={40} />
            </button>
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
                onClick={() => setState("processing")}
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
              <label className="text-sm font-bold uppercase tracking-wide mb-1 block">Transcript</label>
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
                onClick={() => { onSave(transcript); handleClose(); }}
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
