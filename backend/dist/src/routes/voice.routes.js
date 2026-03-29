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
const twilio_1 = __importDefault(require("twilio"));
const ctrl = __importStar(require("../controllers/voice.controller"));
const voice_processing_service_1 = require("../services/voice-processing.service");
const cloudinary_upload_service_1 = require("../services/cloudinary-upload.service");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});
const callConversations = new Map();
const callBusinessFacts = new Map();
const CALL_SYSTEM_PROMPT = [
    "You are Vyapar Saathi, a smart business assistant for small vendors.",
    "Your job is NOT to read numbers. Your job is to explain business performance in simple spoken language.",
    "Whenever user asks about ledger, earnings, sales, profit, expenses, or stock, ALWAYS respond in 3 parts:",
    "1) Summary, 2) Insight, 3) Suggestion.",
    "Never respond with only numbers.",
    "Never dump raw totals unless user explicitly asks for exact numbers.",
    "Keep answers short, voice-friendly, conversational, and practical.",
].join(" ");
function parseNumeric(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
async function resolveUserIdForCall(input) {
    const explicitUserId = (input.explicitUserId || "").trim();
    if (explicitUserId) {
        const [found] = await client_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, explicitUserId)).limit(1);
        if (found?.id)
            return found.id;
    }
    const toPhone = (input.toPhone || "").trim();
    if (toPhone) {
        const [foundByPhone] = await client_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.phone, toPhone)).limit(1);
        if (foundByPhone?.id)
            return foundByPhone.id;
    }
    const [latestUser] = await client_1.db.select({ id: schema_1.users.id }).from(schema_1.users).orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt)).limit(1);
    return latestUser?.id ?? null;
}
function trendFrom(previous, current) {
    if (previous <= 0 && current > 0)
        return "up";
    if (previous > 0 && current <= 0)
        return "down";
    if (previous <= 0 && current <= 0)
        return "flat";
    const ratio = (current - previous) / previous;
    if (ratio > 0.12)
        return "up";
    if (ratio < -0.12)
        return "down";
    return "flat";
}
async function buildUserBusinessContext(userId) {
    const [user] = await client_1.db
        .select({
        name: schema_1.users.name,
        businessName: schema_1.users.businessName,
        businessType: schema_1.users.businessType,
        city: schema_1.users.city,
        state: schema_1.users.state,
        languagePreference: schema_1.users.languagePreference,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
    const recentLedger = await client_1.db
        .select({
        entryType: schema_1.ledgerEntries.entryType,
        amount: schema_1.ledgerEntries.amount,
        itemName: schema_1.ledgerEntries.itemName,
    })
        .from(schema_1.ledgerEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.ledgerEntries.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.ledgerEntries.createdAt))
        .limit(60);
    const stockItems = await client_1.db
        .select({
        name: schema_1.stock_items.name,
        unit: schema_1.stock_items.unit,
        currentQuantity: schema_1.stock_items.currentQuantity,
        lowStockThreshold: schema_1.stock_items.lowStockThreshold,
    })
        .from(schema_1.stock_items)
        .where((0, drizzle_orm_1.eq)(schema_1.stock_items.userId, userId));
    let earningsTotal = 0;
    let expenseTotal = 0;
    const itemTotals = new Map();
    const recentEarnings = [];
    const recentExpenses = [];
    for (const entry of recentLedger) {
        const amount = parseNumeric(entry.amount);
        if (entry.entryType === "sale" || entry.entryType === "income") {
            earningsTotal += amount;
            recentEarnings.push(amount);
        }
        if (entry.entryType === "expense" || entry.entryType === "purchase") {
            expenseTotal += amount;
            recentExpenses.push(amount);
        }
        const itemName = (entry.itemName || "").trim();
        if (itemName && amount > 0) {
            itemTotals.set(itemName, (itemTotals.get(itemName) || 0) + amount);
        }
    }
    const topItems = [...itemTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, total]) => `${name} (Rs ${Math.round(total)})`);
    const lowStock = stockItems
        .map((item) => ({
        name: item.name,
        unit: item.unit,
        current: parseNumeric(item.currentQuantity),
        threshold: item.lowStockThreshold === null ? null : parseNumeric(item.lowStockThreshold),
    }))
        .filter((item) => item.threshold !== null && item.current <= item.threshold)
        .sort((a, b) => a.current - b.current)
        .slice(0, 8);
    const lowStockText = lowStock
        .map((item) => `${item.name}: ${item.current}${item.unit} (threshold ${item.threshold}${item.unit})`);
    const earningsCurrent = recentEarnings.slice(0, 10).reduce((s, v) => s + v, 0);
    const earningsPrevious = recentEarnings.slice(10, 20).reduce((s, v) => s + v, 0);
    const expensesCurrent = recentExpenses.slice(0, 10).reduce((s, v) => s + v, 0);
    const expensesPrevious = recentExpenses.slice(10, 20).reduce((s, v) => s + v, 0);
    const facts = {
        earningsTotal,
        expenseTotal,
        netProfit: earningsTotal - expenseTotal,
        salesTrend: trendFrom(earningsPrevious, earningsCurrent),
        expenseTrend: trendFrom(expensesPrevious, expensesCurrent),
        lowStockCount: lowStock.length,
        lowStockTopItem: lowStock[0]?.name,
    };
    const headerParts = [
        user?.name ? `Owner: ${user.name}` : null,
        user?.businessName ? `Business: ${user.businessName}` : null,
        user?.businessType ? `Type: ${user.businessType}` : null,
        user?.city || user?.state ? `Location: ${[user?.city, user?.state].filter(Boolean).join(", ")}` : null,
        user?.languagePreference ? `Preferred language: ${user.languagePreference}` : null,
    ].filter(Boolean);
    const lines = [
        "User business context (real data):",
        ...headerParts,
        `Recent ledger summary: earnings Rs ${Math.round(earningsTotal)}, expenses Rs ${Math.round(expenseTotal)}, net Rs ${Math.round(earningsTotal - expenseTotal)}.`,
        topItems.length ? `Top ledger items: ${topItems.join("; ")}.` : "Top ledger items: unavailable.",
        lowStockText.length ? `Low stock alerts: ${lowStockText.join("; ")}.` : "Low stock alerts: none.",
        `Trend hints: sales ${facts.salesTrend}, expenses ${facts.expenseTrend}.`,
        "Use this context when giving recommendations. Keep answers short and practical.",
    ];
    return { contextText: lines.join("\n"), facts };
}
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
function normalizePublicBaseUrl(raw) {
    const value = (raw || "").trim();
    if (!value)
        return null;
    if (/^https?:\/\//i.test(value))
        return value.replace(/\/$/, "");
    return `https://${value.replace(/\/$/, "")}`;
}
function resolveWebhookBaseUrl(req) {
    const configured = normalizePublicBaseUrl(process.env.VOICE_PUBLIC_BASE_URL || process.env.DOMAIN);
    if (configured)
        return configured;
    const host = req.get("host");
    if (!host)
        return null;
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    return `${protocol}://${host}`;
}
async function isWebhookReachable(baseUrl) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${baseUrl}/health`, {
            method: "GET",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return response.ok;
    }
    catch {
        return false;
    }
}
function sanitizeSpeechForTwiML(text) {
    return text
        .replace(/[\r\n]+/g, " ")
        .replace(/[<>]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 1000);
}
function getConversation(callSid) {
    const existing = callConversations.get(callSid);
    if (existing)
        return existing;
    const seeded = [{ role: "system", content: CALL_SYSTEM_PROMPT }];
    callConversations.set(callSid, seeded);
    return seeded;
}
function normalizePhone(value) {
    return value.replace(/[\s()-]/g, "");
}
function detectIntent(userText) {
    const t = userText.toLowerCase();
    if (/\b(stock|inventory|reorder)\b/.test(t))
        return "stock";
    if (/\b(expense|cost)\b/.test(t))
        return "expenses";
    if (/\b(profit|margin)\b/.test(t))
        return "profit";
    if (/\b(ledger|sale|sales|earning|earnings|income|performance)\b/.test(t))
        return "performance";
    if (/\b(what should i do|what next|suggest|advice|recommend)\b/.test(t))
        return "action";
    return "general";
}
function wantsExactNumbers(userText) {
    const t = userText.toLowerCase();
    return /\b(exact|exactly|how much|numbers|figures|amount)\b/.test(t);
}
function truncateWords(text, maxWords = 12) {
    const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length <= maxWords)
        return words.join(" ");
    return `${words.slice(0, maxWords).join(" ")}`;
}
function formatVoiceResponse(data) {
    return `${data.summary}. ${data.insight}. ${data.suggestion}.`;
}
function parseStructuredVoiceResponse(text) {
    const cleaned = text.trim();
    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? cleaned;
    try {
        const parsed = JSON.parse(fenced);
        const summary = String(parsed.summary || "").trim();
        const insight = String(parsed.insight || "").trim();
        const suggestion = String(parsed.suggestion || "").trim();
        if (!summary && !insight && !suggestion)
            return null;
        return {
            summary,
            insight,
            suggestion,
        };
    }
    catch {
        return null;
    }
}
function buildFallbackResponse(intent, facts, includeNumbers) {
    const f = facts;
    const isProfit = (f?.netProfit ?? 0) > 0;
    const salesUp = f?.salesTrend === "up";
    const expensesUp = f?.expenseTrend === "up";
    const hasLowStock = (f?.lowStockCount ?? 0) > 0;
    if (intent === "stock") {
        const summary = hasLowStock
            ? "Some items may run out soon"
            : "Your stock is mostly under control";
        const insight = hasLowStock
            ? `${f?.lowStockTopItem ?? "A key item"} is below safe level`
            : "No urgent stock pressure is visible";
        const suggestion = hasLowStock
            ? "Reorder low items today to avoid missed sales"
            : "Keep monitoring fast-moving items daily";
        return { summary, insight, suggestion };
    }
    if (intent === "expenses") {
        const summary = expensesUp ? "Your costs are climbing lately" : "Your cost trend looks stable";
        const insight = expensesUp ? "Rising expenses may reduce your margin" : "No major cost spike is visible";
        const suggestion = "Track transport and purchase spend tomorrow";
        return { summary, insight, suggestion };
    }
    if (intent === "profit") {
        const summary = isProfit ? "You are currently in profit" : "Your profit is under pressure";
        const insight = isProfit ? "Sales are supporting your business well" : "Costs are eating into your returns";
        const suggestion = isProfit ? "Protect margins by controlling expense leaks" : "Focus on higher-margin items this week";
        return { summary, insight, suggestion };
    }
    if (intent === "action") {
        return {
            summary: "Your business has good potential right now",
            insight: salesUp ? "Sales trend is improving" : "Sales need a small push",
            suggestion: hasLowStock ? "Refill low stock first, then review costs" : "Promote best-selling items and cut avoidable costs",
        };
    }
    const summary = salesUp ? "You had a strong earning period" : "Your earnings are steady overall";
    const insight = expensesUp
        ? "Expenses are a little high compared to before"
        : "Costs look manageable for now";
    const suggestion = "Improve profit by controlling costs and restocking smartly";
    if (includeNumbers && f) {
        return {
            summary: `${summary} with earnings around Rs ${Math.round(f.earningsTotal)}`,
            insight: `${insight} and expenses are around Rs ${Math.round(f.expenseTotal)}`,
            suggestion,
        };
    }
    return { summary, insight, suggestion };
}
function looksLikeNumberDump(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length)
        return true;
    const numericTokens = words.filter((w) => /\d/.test(w)).length;
    const alphaTokens = words.filter((w) => /[a-zA-Z]/.test(w)).length;
    return alphaTokens < 4 || numericTokens > alphaTokens;
}
function ensureStructuredOutput(parsed, intent, includeNumbers, facts) {
    const fallback = buildFallbackResponse(intent, facts, includeNumbers);
    const structured = {
        summary: truncateWords(parsed?.summary || fallback.summary),
        insight: truncateWords(parsed?.insight || fallback.insight),
        suggestion: truncateWords(parsed?.suggestion || fallback.suggestion),
    };
    if (!structured.suggestion) {
        structured.suggestion = truncateWords("Try controlling costs and planning stock early");
    }
    let finalText = formatVoiceResponse(structured);
    if (looksLikeNumberDump(finalText)) {
        finalText = formatVoiceResponse(fallback);
    }
    if (!includeNumbers) {
        finalText = `${finalText} Do you want detailed numbers?`;
    }
    return finalText;
}
async function ensureCallConversation(callSid, opts) {
    if (callConversations.has(callSid))
        return;
    const resolvedUserId = await resolveUserIdForCall({
        explicitUserId: opts?.userId,
        toPhone: opts?.phone ? normalizePhone(opts.phone) : undefined,
    });
    if (!resolvedUserId) {
        callConversations.set(callSid, [{ role: "system", content: CALL_SYSTEM_PROMPT }]);
        callBusinessFacts.set(callSid, {
            earningsTotal: 0,
            expenseTotal: 0,
            netProfit: 0,
            salesTrend: "flat",
            expenseTrend: "flat",
            lowStockCount: 0,
        });
        return;
    }
    const businessContext = await buildUserBusinessContext(resolvedUserId);
    callConversations.set(callSid, [
        {
            role: "system",
            content: `${CALL_SYSTEM_PROMPT}\n\n${businessContext.contextText}`,
        },
    ]);
    callBusinessFacts.set(callSid, businessContext.facts);
}
async function generateAssistantReply(callSid, userText) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return "I heard you. Groq key is missing on server, so I cannot answer intelligently right now.";
    }
    const history = getConversation(callSid);
    const intent = detectIntent(userText);
    const includeNumbers = wantsExactNumbers(userText);
    const facts = callBusinessFacts.get(callSid);
    const responseGuide = [
        `Intent: ${intent}.`,
        includeNumbers
            ? "User asked for exact numbers, you may include concise numbers."
            : "User did NOT ask for exact numbers, do not include raw totals.",
        "Return STRICT JSON only with keys: summary, insight, suggestion.",
        "Each value should be one short spoken sentence.",
    ].join(" ");
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.GROQ_CALL_MODEL || "llama-3.3-70b-versatile",
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [
                    ...history,
                    {
                        role: "system",
                        content: responseGuide,
                    },
                    {
                        role: "user",
                        content: includeNumbers || !facts
                            ? userText
                            : `${userText}\nBusiness hints: salesTrend=${facts.salesTrend}, expenseTrend=${facts.expenseTrend}, lowStockCount=${facts.lowStockCount}.`,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Groq chat failed (${response.status}): ${detail}`);
        }
        const payload = (await response.json());
        const answer = payload.choices?.[0]?.message?.content?.trim() ||
            "";
        const parsed = parseStructuredVoiceResponse(answer);
        const finalAnswer = ensureStructuredOutput(parsed, intent, includeNumbers, facts);
        history.push({ role: "user", content: userText });
        history.push({ role: "assistant", content: finalAnswer });
        if (history.length > 20) {
            const trimmed = [history[0], ...history.slice(-19)];
            callConversations.set(callSid, trimmed);
        }
        return finalAnswer;
    }
    catch {
        const fallback = buildFallbackResponse(detectIntent(userText), callBusinessFacts.get(callSid), wantsExactNumbers(userText));
        return ensureStructuredOutput(fallback, detectIntent(userText), wantsExactNumbers(userText), callBusinessFacts.get(callSid));
    }
}
router.post("/call/start", async (req, res) => {
    try {
        const toNumber = String(req.body?.to || "").trim();
        const requestedUserId = String(req.body?.userId || "").trim();
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
                error: `Public webhook URL is not reachable: ${baseUrl}. Start/refresh your ngrok tunnel and update DOMAIN or VOICE_PUBLIC_BASE_URL.`,
            });
        }
        const client = (0, twilio_1.default)(accountSid, authToken);
        const incomingUrl = new URL(`${baseUrl}/voice/call/incoming`);
        const contextUserId = await resolveUserIdForCall({ explicitUserId: requestedUserId, toPhone: toNumber });
        if (contextUserId) {
            incomingUrl.searchParams.set("userId", contextUserId);
        }
        const call = await client.calls.create({
            to: toNumber,
            from: fromNumber,
            url: incomingUrl.toString(),
            method: "POST",
        });
        if (contextUserId) {
            const businessContext = await buildUserBusinessContext(contextUserId);
            callConversations.set(call.sid, [
                {
                    role: "system",
                    content: `${CALL_SYSTEM_PROMPT}\n\n${businessContext.contextText}`,
                },
            ]);
            callBusinessFacts.set(call.sid, businessContext.facts);
        }
        res.status(201).json({ ok: true, callSid: call.sid, status: call.status, to: call.to, from: call.from });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to initiate outbound call" });
    }
});
router.all("/call/incoming", (req, res) => {
    const baseUrl = resolveWebhookBaseUrl(req) || "";
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const userIdQuery = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const vr = new twilio_1.default.twiml.VoiceResponse();
    vr.say({ voice: "alice" }, "Welcome to Vyapar Saathi assistant.");
    const gather = vr.gather({
        input: ["speech"],
        method: "POST",
        speechTimeout: "auto",
        action: `${baseUrl}/voice/call/respond${userIdQuery}`,
        language: "en-IN",
    });
    gather.say({ voice: "alice" }, "You can ask me for ledger, sales, expense, profit, or stock insights.");
    vr.say({ voice: "alice" }, "I did not catch that.");
    vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming${userIdQuery}`);
    res.type("text/xml").send(vr.toString());
});
router.all("/call/respond", async (req, res) => {
    const baseUrl = resolveWebhookBaseUrl(req) || "";
    const speechText = String(req.body?.SpeechResult || "").trim();
    const callSid = String(req.body?.CallSid || "unknown-call");
    const queryUserId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const fromPhone = String(req.body?.From || "").trim();
    await ensureCallConversation(callSid, { userId: queryUserId || undefined, phone: fromPhone || undefined });
    const userIdQuery = queryUserId ? `?userId=${encodeURIComponent(queryUserId)}` : "";
    const vr = new twilio_1.default.twiml.VoiceResponse();
    if (!speechText) {
        const gather = vr.gather({
            input: ["speech"],
            method: "POST",
            speechTimeout: "auto",
            action: `${baseUrl}/voice/call/respond${userIdQuery}`,
            language: "en-IN",
        });
        gather.say({ voice: "alice" }, "I could not hear you clearly. Please say that again.");
        vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming${userIdQuery}`);
        return res.type("text/xml").send(vr.toString());
    }
    if (/\b(bye|goodbye|end call|stop|hang up|thank you)\b/i.test(speechText)) {
        vr.say({ voice: "alice" }, "Thank you. Ending the call now. Have a productive day.");
        vr.hangup();
        callConversations.delete(callSid);
        callBusinessFacts.delete(callSid);
        return res.type("text/xml").send(vr.toString());
    }
    const reply = await generateAssistantReply(callSid, speechText);
    vr.say({ voice: "alice" }, sanitizeSpeechForTwiML(reply));
    const gather = vr.gather({
        input: ["speech"],
        method: "POST",
        speechTimeout: "auto",
        action: `${baseUrl}/voice/call/respond${userIdQuery}`,
        language: "en-IN",
    });
    gather.say({ voice: "alice" }, "You can continue speaking, or say bye to end the call.");
    vr.redirect({ method: "POST" }, `${baseUrl}/voice/call/incoming${userIdQuery}`);
    return res.type("text/xml").send(vr.toString());
});
router.post("/process", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "audio file is required (form field: audio)" });
        }
        const userId = await resolveUserId(req);
        if (!userId) {
            return res.status(400).json({ error: "userId is required (form field userId or x-user-id header), and no default user is available" });
        }
        const cloudinaryAsset = await (0, cloudinary_upload_service_1.uploadAudioToCloudinary)({
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
        const result = await (0, voice_processing_service_1.processVoiceAudio)({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message ?? "Failed to process voice audio" });
    }
});
// ─── Voice Sessions ───────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const session = await ctrl.createVoiceSession(req.body);
        res.status(201).json(session);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Voice chat history tab
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const sessions = await ctrl.listUserVoiceSessions(userId);
        res.json(sessions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Pending flags for a user — must be before /:id
router.get("/flags/pending/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const flags = await ctrl.getPendingFlagsByUser(userId);
        res.json(flags);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Resolve a flag — must be before /:id
router.patch("/flags/:flagId/resolve", async (req, res) => {
    try {
        const { flagId } = req.params;
        const flag = await ctrl.resolveFlag(flagId, req.body);
        if (!flag)
            return res.status(404).json({ error: "Flag not found" });
        res.json(flag);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ctrl.getVoiceSession(id);
        if (!session)
            return res.status(404).json({ error: "Session not found" });
        res.json(session);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Called after Groq transcription completes
router.patch("/:id/transcription", async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ctrl.updateTranscription(id, req.body);
        if (!session)
            return res.status(404).json({ error: "Session not found" });
        res.json(session);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { processingStatus } = req.body;
        const session = await ctrl.updateProcessingStatus(id, processingStatus);
        if (!session)
            return res.status(404).json({ error: "Session not found" });
        res.json(session);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ctrl.deleteVoiceSession(id);
        if (!session)
            return res.status(404).json({ error: "Session not found" });
        res.json({ deleted: true, id: session.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Flagged Anomalies ────────────────────────────────────────────────────────
router.post("/:id/flags", async (req, res) => {
    try {
        const { id } = req.params;
        const flag = await ctrl.createFlaggedAnomaly({ voiceSessionId: id, ...req.body });
        res.status(201).json(flag);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/:id/flags", async (req, res) => {
    try {
        const { id } = req.params;
        const flags = await ctrl.getFlaggedAnomaliesBySession(id);
        res.json(flags);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
