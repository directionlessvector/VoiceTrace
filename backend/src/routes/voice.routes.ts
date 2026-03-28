import { Router, Request, Response } from "express";
import multer from "multer";
import * as ctrl from "../controllers/voice.controller";
import { processVoiceAudio } from "../services/voice-processing.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/process", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "audio file is required (form field: audio)" });
    }

    const result = await processVoiceAudio({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    res.json({
      ok: true,
      transcript: result.transcript,
      languageDetected: result.languageDetected,
      structured: result.structured,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to process voice audio" });
  }
});

// ─── Voice Sessions ───────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const session = await ctrl.createVoiceSession(req.body);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Voice chat history tab
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const sessions = await ctrl.listUserVoiceSessions(userId);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pending flags for a user — must be before /:id
router.get("/flags/pending/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const flags = await ctrl.getPendingFlagsByUser(userId);
    res.json(flags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve a flag — must be before /:id
router.patch("/flags/:flagId/resolve", async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params as Record<string, string>;
    const flag = await ctrl.resolveFlag(flagId, req.body);
    if (!flag) return res.status(404).json({ error: "Flag not found" });
    res.json(flag);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const session = await ctrl.getVoiceSession(id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Called after Groq transcription completes
router.patch("/:id/transcription", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const session = await ctrl.updateTranscription(id, req.body);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const { processingStatus } = req.body;
    const session = await ctrl.updateProcessingStatus(id, processingStatus);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const session = await ctrl.deleteVoiceSession(id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ deleted: true, id: session.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Flagged Anomalies ────────────────────────────────────────────────────────

router.post("/:id/flags", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const flag = await ctrl.createFlaggedAnomaly({ voiceSessionId: id, ...req.body });
    res.status(201).json(flag);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/flags", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const flags = await ctrl.getFlaggedAnomaliesBySession(id);
    res.json(flags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
