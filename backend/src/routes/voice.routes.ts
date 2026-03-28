import { Router, Request, Response } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import * as ctrl from "../controllers/voice.controller";
import { processVoiceAudio } from "../services/voice-processing.service";
import { uploadAudioToCloudinary } from "../services/cloudinary-upload.service";
import { db } from "../db/client";
import { users } from "../db/schema";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function resolveUserId(req: Request): Promise<string | null> {
  const fromBody = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  if (fromBody) return fromBody;

  const fromHeader = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : "";
  if (fromHeader) return fromHeader;

  const fromEnv = process.env.VOICE_DEFAULT_USER_ID?.trim();
  if (fromEnv) {
    const [defaultUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, fromEnv)).limit(1);
    if (defaultUser?.id) return defaultUser.id;
  }

  const [latestUser] = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(1);

  return latestUser?.id ?? null;
}

router.post("/process", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "audio file is required (form field: audio)" });
    }

    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "userId is required (form field userId or x-user-id header), and no default user is available" });
    }

    const cloudinaryAsset = await uploadAudioToCloudinary({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
    });

    const session = await ctrl.createVoiceSession({
      userId,
      cloudinaryUrl: cloudinaryAsset.cloudinaryUrl,
      cloudinaryPublicId: cloudinaryAsset.cloudinaryPublicId,
      cloudinaryFormat: cloudinaryAsset.cloudinaryFormat,
      cloudinaryVersion: cloudinaryAsset.cloudinaryVersion,
      mimeType: req.file.mimetype,
      fileSizeBytes: cloudinaryAsset.fileSizeBytes ?? req.file.size,
      durationSeconds: cloudinaryAsset.durationSeconds,
      recordedAt: req.body?.recordedAt ? new Date(req.body.recordedAt) : undefined,
      sessionType: "ledger_entry",
    });

    const result = await processVoiceAudio({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    await ctrl.updateTranscription(session.id, {
      transcriptionRaw: result.transcript,
      transcriptionClean: result.transcript,
      languageDetected: result.languageDetected,
      processingStatus: "parsed",
    });

    res.json({
      ok: true,
      voiceSessionId: session.id,
      cloudinary_url: cloudinaryAsset.cloudinaryUrl,
      transcription: result.transcript,
      extractedData: result.structured,
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
