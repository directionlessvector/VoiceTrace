import { Router, Request, Response } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import twilio from "twilio";
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

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const callConversations = new Map<string, ChatMessage[]>();
const CALL_SYSTEM_PROMPT =
  "You are a helpful and friendly business assistant for small shop owners in India. Keep replies brief, practical, and spoken-language friendly.";

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

function normalizePublicBaseUrl(raw: string | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, "");
  return `https://${value.replace(/\/$/, "")}`;
}

function resolveWebhookBaseUrl(req: Request): string | null {
  const configured = normalizePublicBaseUrl(process.env.VOICE_PUBLIC_BASE_URL || process.env.DOMAIN);
  if (configured) return configured;

  const host = req.get("host");
  if (!host) return null;
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${protocol}://${host}`;
}

async function isWebhookReachable(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function sanitizeSpeechForTwiML(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1000);
}

function getConversation(callSid: string): ChatMessage[] {
  const existing = callConversations.get(callSid);
  if (existing) return existing;
  const seeded: ChatMessage[] = [{ role: "system", content: CALL_SYSTEM_PROMPT }];
  callConversations.set(callSid, seeded);
  return seeded;
}

async function generateAssistantReply(callSid: string, userText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "I heard you. Groq key is missing on server, so I cannot answer intelligently right now.";
  }

  const history = getConversation(callSid);
  history.push({ role: "user", content: userText });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_CALL_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.4,
        messages: history,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Groq chat failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const answer = payload.choices?.[0]?.message?.content?.trim() ||
      "I could not generate a useful answer right now.";

    history.push({ role: "assistant", content: answer });
    if (history.length > 20) {
      const trimmed = [history[0], ...history.slice(-19)];
      callConversations.set(callSid, trimmed);
    }

    return answer;
  } catch {
    return "I had trouble generating a response. Please repeat that in a simpler way.";
  }
}

router.post("/call/start", async (req: Request, res: Response) => {
  try {
    const toNumber = String(req.body?.to || "").trim();
    if (!/^\+[1-9]\d{7,14}$/.test(toNumber)) {
      return res.status(400).json({ error: "Provide a valid phone number in E.164 format, e.g. +919876543210" });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const baseUrl = resolveWebhookBaseUrl(req);

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(400).json({ error: "Missing Twilio config. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER." });
    }
    if (!baseUrl) {
      return res.status(400).json({ error: "Missing VOICE_PUBLIC_BASE_URL or DOMAIN in backend .env (public URL required for Twilio webhooks)." });
    }

    const reachable = await isWebhookReachable(baseUrl);
    if (!reachable) {
      return res.status(400).json({
        error:
          `Public webhook URL is not reachable: ${baseUrl}. Start/refresh your ngrok tunnel and update DOMAIN or VOICE_PUBLIC_BASE_URL.`,
      });
    }

    const client = twilio(accountSid, authToken);
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      url: `${baseUrl}/voice/call/incoming`,
      method: "POST",
    });

    res.status(201).json({ ok: true, callSid: call.sid, status: call.status, to: call.to, from: call.from });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to initiate outbound call" });
  }
});

router.all("/call/incoming", (req: Request, res: Response) => {
  const baseUrl = resolveWebhookBaseUrl(req) || "";
  const vr = new twilio.twiml.VoiceResponse();

  vr.say({ voice: "alice" }, "Hello. You are connected to the VoiceTrace assistant.");
  const gather = vr.gather({
    input: ["speech"],
    method: "POST",
    speechTimeout: "auto",
    action: `${baseUrl}/voice/call/respond`,
    language: "en-IN",
  });
  gather.say({ voice: "alice" }, "Please tell me your update or ask a question.");

  vr.say({ voice: "alice" }, "I did not catch that.");
  vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming`);

  res.type("text/xml").send(vr.toString());
});

router.all("/call/respond", async (req: Request, res: Response) => {
  const baseUrl = resolveWebhookBaseUrl(req) || "";
  const speechText = String(req.body?.SpeechResult || "").trim();
  const callSid = String(req.body?.CallSid || "unknown-call");
  const vr = new twilio.twiml.VoiceResponse();

  if (!speechText) {
    const gather = vr.gather({
      input: ["speech"],
      method: "POST",
      speechTimeout: "auto",
      action: `${baseUrl}/voice/call/respond`,
      language: "en-IN",
    });
    gather.say({ voice: "alice" }, "I could not hear you clearly. Please say that again.");
    vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming`);
    return res.type("text/xml").send(vr.toString());
  }

  if (/\b(bye|goodbye|end call|stop|hang up|thank you)\b/i.test(speechText)) {
    vr.say({ voice: "alice" }, "Thank you. Ending the call now. Have a productive day.");
    vr.hangup();
    callConversations.delete(callSid);
    return res.type("text/xml").send(vr.toString());
  }

  const reply = await generateAssistantReply(callSid, speechText);
  vr.say({ voice: "alice" }, sanitizeSpeechForTwiML(reply));

  const gather = vr.gather({
    input: ["speech"],
    method: "POST",
    speechTimeout: "auto",
    action: `${baseUrl}/voice/call/respond`,
    language: "en-IN",
  });
  gather.say({ voice: "alice" }, "You can continue speaking, or say bye to end the call.");
  vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming`);

  return res.type("text/xml").send(vr.toString());
});

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
