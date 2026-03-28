import { Router, Request, Response } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import * as voiceCtrl from "../controllers/voice.controller";
import * as ledgerCtrl from "../controllers/ledger.controller";
import { uploadImageToCloudinary } from "../services/cloudinary-upload.service";
import { extractTextFromImage, extractLedgerFromOcrText } from "../services/ocr-ledger.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
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

router.post("/process", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "image file is required (form field: image)" });
    }

    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "userId is required and no default user is available" });
    }

    const shouldSave = String(req.body?.confirmSave ?? "false").toLowerCase() === "true";

    const imageAsset = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
    });

    const ocrResult = await extractTextFromImage(req.file.buffer);
    const ocrText = ocrResult.text;
    const extracted = await extractLedgerFromOcrText(ocrText, ocrResult.ocrEngineConfidence);

    let voiceSessionId: string | null = null;

    if (shouldSave) {
      const session = await voiceCtrl.createVoiceSession({
        userId,
        cloudinaryUrl: imageAsset.cloudinaryUrl,
        cloudinaryPublicId: imageAsset.cloudinaryPublicId,
        cloudinaryFormat: imageAsset.cloudinaryFormat,
        cloudinaryVersion: imageAsset.cloudinaryVersion,
        mimeType: req.file.mimetype,
        fileSizeBytes: imageAsset.fileSizeBytes ?? req.file.size,
        sessionType: "ledger_upload",
        recordedAt: new Date(),
      });

      voiceSessionId = session.id;

      await voiceCtrl.updateTranscription(session.id, {
        transcriptionRaw: ocrText,
        transcriptionClean: ocrText,
        processingStatus: "parsed",
      });

      for (const item of extracted.items) {
        const lineAmount = item.price > 0 ? item.price : 0;
        await ledgerCtrl.createLedgerEntry({
          userId,
          voiceSessionId: session.id,
          entryType: "sale",
          amount: lineAmount.toFixed(2),
          quantity: item.quantity.toString(),
          itemName: item.name,
          notes: `OCR upload item (${item.confidence})`,
          entryDate: new Date().toISOString().slice(0, 10),
          source: "ocr",
          category: "goods",
        });
      }

      for (const exp of extracted.expenses) {
        await ledgerCtrl.createLedgerEntry({
          userId,
          voiceSessionId: session.id,
          entryType: "expense",
          amount: exp.amount.toFixed(2),
          itemName: exp.type,
          notes: `OCR upload expense (${exp.confidence})`,
          entryDate: new Date().toISOString().slice(0, 10),
          source: "ocr",
          category: "other",
        });
      }

      if (extracted.totalEarnings > 0) {
        await ledgerCtrl.createLedgerEntry({
          userId,
          voiceSessionId: session.id,
          entryType: "income",
          amount: extracted.totalEarnings.toFixed(2),
          itemName: "OCR total earnings",
          notes: "Summary total extracted from ledger image",
          entryDate: new Date().toISOString().slice(0, 10),
          source: "ocr",
          category: "other",
        });
      }
    }

    res.json({
      ok: true,
      saved: shouldSave,
      imageUrl: imageAsset.cloudinaryUrl,
      ocrText,
      extractedData: extracted,
      voiceSessionId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to process ledger upload" });
  }
});

export default router;
