"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromImage = extractTextFromImage;
exports.extractLedgerFromOcrText = extractLedgerFromOcrText;
const tesseract_js_1 = require("tesseract.js");
const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const GROQ_LEDGER_MODELS = [
    process.env.GROQ_LEDGER_MODEL,
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
].filter((v) => Boolean(v && v.trim()));
function getGroqApiKey() {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
        throw new Error("GROQ_API_KEY is not set");
    }
    return key;
}
function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const parsed = Number(value.replace(/[^\d.-]/g, ""));
        if (Number.isFinite(parsed))
            return parsed;
    }
    return 0;
}
function normalizeConfidence(value) {
    const v = String(value ?? "").toLowerCase();
    if (v === "high" || v === "medium" || v === "low")
        return v;
    return "medium";
}
function confidenceToScore(value) {
    if (value === "high")
        return 0.9;
    if (value === "medium")
        return 0.65;
    return 0.4;
}
function scoreToConfidence(score) {
    if (score >= 0.78)
        return "high";
    if (score >= 0.55)
        return "medium";
    return "low";
}
const SIGNAL_WEIGHTS = {
    item_detected: 0.19,
    quantity_detected: 0.15,
    price_detected: 0.18,
    numeric_presence: 0.12,
    monetary_presence: 0.12,
    transaction_detected: 0.1,
    llm_confidence: 0.14,
    ambiguity_penalty: 0.2,
};
function computeConfidenceScore(signals) {
    const positive = signals.item_detected * SIGNAL_WEIGHTS.item_detected +
        signals.quantity_detected * SIGNAL_WEIGHTS.quantity_detected +
        signals.price_detected * SIGNAL_WEIGHTS.price_detected +
        signals.numeric_presence * SIGNAL_WEIGHTS.numeric_presence +
        signals.monetary_presence * SIGNAL_WEIGHTS.monetary_presence +
        signals.transaction_detected * SIGNAL_WEIGHTS.transaction_detected +
        signals.llm_confidence * SIGNAL_WEIGHTS.llm_confidence;
    const penalty = signals.ambiguity_penalty * SIGNAL_WEIGHTS.ambiguity_penalty;
    return Math.max(0.1, Math.min(0.98, positive - penalty));
}
function textNoisePenalty(text) {
    const garbledMarkers = (text.match(/[?]{2,}|\uFFFD|[|]{2,}|[_]{2,}/g) || []).length;
    if (garbledMarkers >= 6)
        return 0.35;
    if (garbledMarkers >= 3)
        return 0.2;
    if (garbledMarkers >= 1)
        return 0.1;
    return 0;
}
function characterErrorPenalty(text) {
    const confusionPatterns = (text.match(/\b\d+[oO]\b|\b[oO]\d+\b|\b[a-zA-Z]*\d[a-zA-Z]*\b/g) || []).length;
    if (confusionPatterns >= 6)
        return 0.28;
    if (confusionPatterns >= 3)
        return 0.16;
    if (confusionPatterns >= 1)
        return 0.08;
    return 0;
}
function layoutScore(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length)
        return 0.35;
    const tabularLines = lines.filter((l) => /\d/.test(l) && /[-:]/.test(l)).length;
    const numericLines = lines.filter((l) => /\d/.test(l)).length;
    const ratio = tabularLines / Math.max(1, numericLines);
    if (ratio > 0.6)
        return 0.9;
    if (ratio > 0.3)
        return 0.7;
    return 0.5;
}
function inferencePenalty(notes) {
    const joined = notes.join(" ").toLowerCase();
    const guessed = /(inferred|assumed|guessed|estimated|unclear|approx)/.test(joined);
    return guessed ? 0.12 : 0;
}
function monetarySignal(text, amount) {
    if (amount > 0)
        return 1;
    if (/(₹|\binr\b|\brs\.?\b|rupees?)/i.test(text))
        return 0.85;
    return 0.3;
}
function numericSignal(text) {
    const numericTokens = text.match(/\d+(?:\.\d+)?/g) || [];
    if (numericTokens.length >= 3)
        return 1;
    if (numericTokens.length >= 1)
        return 0.65;
    return 0.2;
}
function hasTransactionMarkers(text) {
    return /(sale|sold|income|expense|purchase|bought|total|qty|quantity|amount|balance|rent|transport|electricity|bill)/i.test(text);
}
function parseModelJson(content) {
    const trimmed = content.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenceMatch?.[1] ?? trimmed;
    return JSON.parse(candidate);
}
async function extractTextFromImage(imageBuffer) {
    const worker = await (0, tesseract_js_1.createWorker)("eng");
    try {
        const output = await worker.recognize(imageBuffer);
        const confidence = typeof output.data.confidence === "number" ? output.data.confidence / 100 : 0.7;
        return {
            text: output.data.text?.trim() ?? "",
            ocrEngineConfidence: Math.max(0.1, Math.min(1, confidence)),
        };
    }
    finally {
        await worker.terminate();
    }
}
async function extractLedgerFromOcrText(rawText, ocrEngineConfidence) {
    const apiKey = getGroqApiKey();
    const systemPrompt = [
        "You extract ledger data from OCR text from handwritten/printed bills.",
        "OCR text may be noisy and include Hindi-English mixed words.",
        "Return STRICT JSON only with this shape:",
        "{",
        '  "items": [{"name":"", "quantity":0, "price":0, "confidence":"high|medium|low"}],',
        '  "expenses": [{"type":"", "amount":0, "confidence":"high|medium|low"}],',
        '  "totalEarnings": 0,',
        '  "notes": ["ambiguities or assumptions"]',
        "}",
        "Rules:",
        "- price means line total amount for that item.",
        "- if quantity missing, use 1.",
        "- expenses should include rent/electricity/transport/purchase-type costs.",
        "- keep unknown numeric values as 0 and low confidence.",
        "- output only json, never markdown.",
    ].join("\n");
    let content = "{}";
    const modelErrors = [];
    for (const model of GROQ_LEDGER_MODELS) {
        const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: rawText },
                ],
                response_format: { type: "json_object" },
            }),
        });
        if (!response.ok) {
            const detail = await response.text();
            modelErrors.push(`${model}: ${response.status} ${detail}`);
            continue;
        }
        const payload = (await response.json());
        content = payload.choices?.[0]?.message?.content ?? "{}";
        break;
    }
    if (content === "{}") {
        throw new Error(`OCR ledger extraction failed for all models. ${modelErrors.join(" | ")}`);
    }
    const parsed = parseModelJson(content);
    const itemsRaw = Array.isArray(parsed.items) ? parsed.items : [];
    const expensesRaw = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const items = itemsRaw
        .map((v) => {
        const row = v;
        const name = String(row.name ?? "").trim();
        if (!name)
            return null;
        return {
            name,
            quantity: toNumber(row.quantity) || 1,
            price: toNumber(row.price),
            confidence: normalizeConfidence(row.confidence),
        };
    })
        .filter((v) => v !== null);
    const expenses = expensesRaw
        .map((v) => {
        const row = v;
        const type = String(row.type ?? "").trim();
        if (!type)
            return null;
        return {
            type,
            amount: toNumber(row.amount),
            confidence: normalizeConfidence(row.confidence),
        };
    })
        .filter((v) => v !== null);
    const totalEarnings = toNumber(parsed.totalEarnings);
    const notes = Array.isArray(parsed.notes) ? parsed.notes.map((n) => String(n)) : [];
    const qualityScore = Math.max(0.1, Math.min(0.98, ocrEngineConfidence
        - textNoisePenalty(rawText)
        - characterErrorPenalty(rawText)));
    const structureScore = layoutScore(rawText);
    const inferPenalty = inferencePenalty(notes);
    const globalNumeric = numericSignal(rawText);
    const globalTransaction = hasTransactionMarkers(rawText) ? 1 : 0.35;
    const scoredItems = items.map((item) => {
        const quantityDetected = item.quantity > 0 ? 1 : 0;
        const priceDetected = item.price > 0 ? 1 : 0;
        const itemText = `${item.name} ${rawText}`;
        const ambiguity = Math.max(0, Math.min(1, (1 - qualityScore) * 0.45 +
            (1 - structureScore) * 0.25 +
            inferPenalty));
        const signals = {
            item_detected: item.name ? 1 : 0,
            quantity_detected: quantityDetected,
            price_detected: priceDetected,
            numeric_presence: Math.max(0, Math.min(1, globalNumeric * 0.55 + (quantityDetected && priceDetected ? 1 : 0.45) * 0.45)),
            monetary_presence: monetarySignal(itemText, item.price),
            transaction_detected: globalTransaction,
            ambiguity_penalty: ambiguity,
            llm_confidence: confidenceToScore(item.confidence),
        };
        const score = computeConfidenceScore(signals);
        return { ...item, confidence: scoreToConfidence(score) };
    });
    const scoredExpenses = expenses.map((exp) => {
        const expenseText = `${exp.type} ${rawText}`;
        const ambiguity = Math.max(0, Math.min(1, (1 - qualityScore) * 0.45 +
            (1 - structureScore) * 0.25 +
            inferPenalty));
        const signals = {
            item_detected: exp.type ? 1 : 0,
            quantity_detected: 0,
            price_detected: exp.amount > 0 ? 1 : 0,
            numeric_presence: globalNumeric,
            monetary_presence: monetarySignal(expenseText, exp.amount),
            transaction_detected: globalTransaction,
            ambiguity_penalty: ambiguity,
            llm_confidence: confidenceToScore(exp.confidence),
        };
        const score = computeConfidenceScore(signals);
        return { ...exp, confidence: scoreToConfidence(score) };
    });
    return {
        items: scoredItems,
        expenses: scoredExpenses,
        totalEarnings,
        notes,
    };
}
