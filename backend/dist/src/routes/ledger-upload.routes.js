"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const voiceCtrl = __importStar(require("../controllers/voice.controller"));
const ledgerCtrl = __importStar(require("../controllers/ledger.controller"));
const cloudinary_upload_service_1 = require("../services/cloudinary-upload.service");
const ocr_ledger_service_1 = require("../services/ocr-ledger.service");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});
async function resolveUserId(req) {
    const fromBody = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    if (fromBody)
        return fromBody;
    const fromHeader = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : "";
    if (fromHeader)
        return fromHeader;
    const fromEnv = process.env.VOICE_DEFAULT_USER_ID?.trim();
    if (fromEnv) {
        const [defaultUser] = await client_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, fromEnv)).limit(1);
        if (defaultUser?.id)
            return defaultUser.id;
    }
    const [latestUser] = await client_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
        .limit(1);
    return latestUser?.id ?? null;
}
router.post("/process", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "image file is required (form field: image)" });
        }
        const userId = await resolveUserId(req);
        if (!userId) {
            return res.status(400).json({ error: "userId is required and no default user is available" });
        }
        const shouldSave = String(req.body?.confirmSave ?? "false").toLowerCase() === "true";
        const imageAsset = await (0, cloudinary_upload_service_1.uploadImageToCloudinary)({
            buffer: req.file.buffer,
            originalFilename: req.file.originalname,
        });
        const ocrResult = await (0, ocr_ledger_service_1.extractTextFromImage)(req.file.buffer);
        const ocrText = ocrResult.text;
        const extracted = await (0, ocr_ledger_service_1.extractLedgerFromOcrText)(ocrText, ocrResult.ocrEngineConfidence);
        let voiceSessionId = null;
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
    }
    catch (err) {
        res.status(500).json({ error: err.message ?? "Failed to process ledger upload" });
    }
});
exports.default = router;
