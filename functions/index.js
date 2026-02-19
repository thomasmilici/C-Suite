const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
// Non-negotiable: every AI action is logged, whether it succeeds, fails, or is denied.
// Enables: security review, session reconstruction, product analytics, pattern analysis.
async function writeAuditLog({
    uid = "unauthenticated",
    email = null,
    role = null,
    action,
    aiRunId = null,
    toolName = null,
    inputSummary = null,
    targetDocRef = null,
    diff = null,
    result,           // 'success' | 'denied' | 'error' | 'dry_run'
    errorMessage = null,
    sessionId = null, // passed from client for session grouping
}) {
    try {
        await admin.firestore().collection("audit_logs").add({
            uid,
            email,
            role,
            action,
            aiRunId,
            toolName,
            inputSummary,
            targetDocRef,
            diff,
            result,
            errorMessage,
            sessionId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        // Audit log failure must NOT block the main operation, but must be reported.
        logger.error("[AUDIT LOG FAILURE]", e.message);
    }
}

// ── RBAC HELPERS ─────────────────────────────────────────────────────────────
const ROLE_HIERARCHY = { GUEST: 0, STAFF: 1, C_LEVEL: 2, COS: 3, ADMIN: 4 };

async function getUserRole(uid) {
    try {
        const snap = await admin.firestore().collection("users").doc(uid).get();
        if (!snap.exists) return "GUEST";
        // Normalize: 'ADMIN' | 'COS' | 'C_LEVEL' | 'STAFF' | 'member' → uppercase
        const raw = snap.data().role || "STAFF";
        const normalized = raw.toUpperCase();
        // Legacy: 'member' maps to STAFF
        if (normalized === "MEMBER") return "STAFF";
        return normalized;
    } catch (e) {
        logger.warn("[getUserRole] Failed:", e.message);
        return "GUEST";
    }
}

function hasMinRole(userRole, minRole) {
    return (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999);
}

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────
// Lightweight schema validation (no Zod dep). Rejects unknown fields + validates types.
function validate(name, args, schema) {
    const errors = [];
    for (const [key, { type, required, maxLength, enum: allowed }] of Object.entries(schema)) {
        if (required && (args[key] === undefined || args[key] === null || args[key] === "")) {
            errors.push(`${key} is required`);
            continue;
        }
        if (args[key] !== undefined) {
            if (type === "string" && typeof args[key] !== "string")
                errors.push(`${key} must be a string`);
            if (type === "string" && maxLength && args[key].length > maxLength)
                errors.push(`${key} exceeds maxLength ${maxLength}`);
            if (type === "array" && !Array.isArray(args[key]))
                errors.push(`${key} must be an array`);
            if (allowed && !allowed.includes(args[key]))
                errors.push(`${key} must be one of: ${allowed.join(", ")}`);
        }
    }
    // Reject unknown fields
    const known = Object.keys(schema);
    for (const key of Object.keys(args)) {
        if (!known.includes(key)) errors.push(`Unknown field: ${key}`);
    }
    if (errors.length > 0) throw new Error(`[${name}] Validation failed: ${errors.join("; ")}`);
}

const TOOL_SCHEMAS = {
    createRiskSignal: {
        text: { type: "string", required: true, maxLength: 300 },
        level: { type: "string", required: true, enum: ["high", "medium", "low"] },
        category: { type: "string", required: false, maxLength: 100 },
        eventId: { type: "string", required: false },
    },
    createOKR: {
        title: { type: "string", required: true, maxLength: 200 },
        description: { type: "string", required: false, maxLength: 1000 },
        keyResult: { type: "string", required: false, maxLength: 200 },
    },
    updateDailyPulse: {
        items: { type: "array", required: true },
        mood: { type: "string", required: false, enum: ["focused", "stressed", "energized", "uncertain"] },
        date: { type: "string", required: false },
    },
    logDecision: {
        decision: { type: "string", required: true, maxLength: 500 },
        rationale: { type: "string", required: false, maxLength: 1000 },
        decisionMaker: { type: "string", required: false, maxLength: 100 },
        verdict: { type: "string", required: false, enum: ["ALLINEATA", "NEUTRALE", "A RISCHIO"] },
        eventId: { type: "string", required: false },
    },
};

// ── AI ACTION POLICY ─────────────────────────────────────────────────────────
// Every tool that can write must declare its minimum required role.
const AI_ACTION_POLICY = {
    createRiskSignal: { minRole: "COS", collection: "signals" },
    createOKR: { minRole: "ADMIN", collection: "okrs" },
    updateDailyPulse: { minRole: "COS", collection: "daily_plans" },
    logDecision: { minRole: "COS", collection: "decisions" },
};

// ── CONTEXT FETCHER ───────────────────────────────────────────────────────────
async function fetchContext() {
    const db = admin.firestore();
    let okrs = [], signals = [], pulse = [], events = [], decisions = [], reports = [], team = [];
    try {
        const snap = await db.collection("okrs").orderBy("createdAt", "desc").get();
        okrs = snap.docs.map(d => ({ title: d.data().title, status: d.data().status, progress: d.data().progress, keyResults: (d.data().keyResults || []).map(kr => ({ title: kr.title, completed: kr.completed })) }));
    } catch (e) { logger.warn("Failed to fetch OKRs:", e.message); }
    try {
        const snap = await db.collection("signals").orderBy("createdAt", "desc").limit(8).get();
        signals = snap.docs.map(d => ({ text: d.data().text, level: d.data().level }));
    } catch (e) { logger.warn("Failed to fetch Signals:", e.message); }
    try {
        const today = new Date().toISOString().split("T")[0];
        const snap = await db.collection("daily_pulse").doc(today).get();
        pulse = snap.exists ? (snap.data().focus_items || []) : [];
    } catch (e) { logger.warn("Failed to fetch Pulse:", e.message); }
    try {
        const snap = await db.collection("events").where("status", "!=", "archived").orderBy("status").orderBy("createdAt", "desc").get();
        events = snap.docs.map(d => ({ id: d.id, title: d.data().title, description: d.data().description || "", status: d.data().status, teamSize: (d.data().teamMembers || []).length }));
    } catch (e) { logger.warn("Failed to fetch Events:", e.message); }
    try {
        const snap = await db.collection("decisions").orderBy("savedAt", "desc").limit(5).get();
        decisions = snap.docs.map(d => ({ decision: d.data().decision, verdict: d.data().verdict, decisionMaker: d.data().decisionMaker }));
    } catch (e) { logger.warn("Failed to fetch Decisions:", e.message); }
    try {
        const snap = await db.collection("reports").orderBy("savedAt", "desc").limit(5).get();
        reports = snap.docs.map(d => ({ topic: d.data().topic, reportType: d.data().reportType, docNumber: d.data().docNumber }));
    } catch (e) { logger.warn("Failed to fetch Reports:", e.message); }
    try {
        const snap = await db.collection("users").get();
        team = snap.docs.map(d => ({ name: d.data().displayName || d.data().email || "Utente", role: d.data().role || "STAFF", rank_score: d.data().rank_score || 0 }));
    } catch (e) { logger.warn("Failed to fetch Team:", e.message); }
    return { okrs, signals, pulse, events, decisions, reports, team };
}

// ── GEMINI TOOLS SCHEMA ───────────────────────────────────────────────────────
const SHADOW_COS_TOOLS = [
    {
        functionDeclarations: [
            {
                name: "createRiskSignal",
                description: "Crea un nuovo segnale di rischio nel Risk Radar. Usalo quando l'utente vuole registrare una minaccia, un problema o un rischio strategico.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING", description: "Descrizione chiara e concisa del segnale di rischio (max 300 caratteri)" },
                        level: { type: "STRING", enum: ["high", "medium", "low"], description: "Livello di severità del rischio" },
                        category: { type: "STRING", description: "Categoria del rischio (es. Strategico, Operativo, Finanziario, Reputazionale)" },
                        eventId: { type: "STRING", description: "ID del dossier correlato (opzionale)" },
                    },
                    required: ["text", "level"],
                },
            },
            {
                name: "createOKR",
                description: "Crea un nuovo OKR nei Strategic Themes. Richiede ruolo ADMIN.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "Titolo dell'obiettivo strategico (max 200 caratteri)" },
                        description: { type: "STRING", description: "Descrizione dettagliata (opzionale)" },
                        keyResult: { type: "STRING", description: "Primo Key Result misurabile (opzionale)" },
                    },
                    required: ["title"],
                },
            },
            {
                name: "updateDailyPulse",
                description: "Aggiunge focus items al Daily Pulse di oggi. Usalo quando l'utente vuole impostare le priorità operative della giornata.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        items: { type: "ARRAY", description: "Lista di focus items da aggiungere al Daily Pulse", items: { type: "STRING" } },
                        mood: { type: "STRING", enum: ["focused", "stressed", "energized", "uncertain"], description: "Stato operativo del team oggi" },
                    },
                    required: ["items"],
                },
            },
            {
                name: "logDecision",
                description: "Registra una decisione strategica nel Decision Log.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        decision: { type: "STRING", description: "Descrizione della decisione presa (max 500 caratteri)" },
                        rationale: { type: "STRING", description: "Motivazione strategica (opzionale)" },
                        decisionMaker: { type: "STRING", description: "Nome del responsabile della decisione" },
                        verdict: { type: "STRING", enum: ["ALLINEATA", "NEUTRALE", "A RISCHIO"], description: "Valutazione strategica" },
                        eventId: { type: "STRING", description: "ID del dossier correlato (opzionale)" },
                    },
                    required: ["decision"],
                },
            },
        ],
    },
];

// ── SECURE TOOL EXECUTOR ──────────────────────────────────────────────────────
// Every execution path writes to audit_logs. No exceptions.
async function executeToolSecure(name, args, { uid, email, role, aiRunId, sessionId }) {
    const db = admin.firestore();
    const policy = AI_ACTION_POLICY[name];

    // 1. Policy check
    if (!policy) {
        await writeAuditLog({ uid, email, role, action: "UNKNOWN_TOOL", toolName: name, inputSummary: JSON.stringify(args).slice(0, 200), result: "denied", errorMessage: "Tool not in allowlist", aiRunId, sessionId });
        throw new Error(`Tool '${name}' is not in the AI action allowlist.`);
    }

    // 2. RBAC check
    if (!hasMinRole(role, policy.minRole)) {
        await writeAuditLog({ uid, email, role, action: name.toUpperCase(), toolName: name, inputSummary: JSON.stringify(args).slice(0, 200), targetDocRef: policy.collection, result: "denied", errorMessage: `Role '${role}' insufficient. Required: '${policy.minRole}'`, aiRunId, sessionId });
        throw new Error(`Role '${role}' is insufficient to execute '${name}'. Required: '${policy.minRole}'.`);
    }

    // 3. Input validation
    const schema = TOOL_SCHEMAS[name];
    if (schema) validate(name, args, schema);

    // 4. Execute
    logger.info(`[TOOL EXEC] ${name} by ${uid} (${role}) | aiRunId=${aiRunId}`);
    let newDocId = null;
    let diff = null;

    try {
        if (name === "createRiskSignal") {
            const payload = {
                text: args.text,
                level: args.level,
                category: args.category || "Strategico",
                ...(args.eventId && { eventId: args.eventId }),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: uid,
                source: "shadow_cos",
                aiRunId,
            };
            const ref = await db.collection("signals").add(payload);
            newDocId = ref.id;
            diff = `level:${payload.level}, text:"${payload.text.slice(0, 80)}"`;
        }

        if (name === "createOKR") {
            const keyResults = args.keyResult ? [{ title: args.keyResult, completed: false }] : [];
            const payload = {
                title: args.title,
                description: args.description || "",
                status: "on_track",
                progress: 0,
                keyResults,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: uid,
                source: "shadow_cos",
                aiRunId,
            };
            const ref = await db.collection("okrs").add(payload);
            newDocId = ref.id;
            diff = `title:"${payload.title.slice(0, 80)}"`;
        }

        if (name === "updateDailyPulse") {
            const today = args.date || new Date().toISOString().split("T")[0];
            const ref = db.collection("daily_pulse").doc(today);
            const snap = await ref.get();
            const newItems = (args.items || []).map(text => ({ text, completed: false, addedBy: "shadow_cos", addedAt: new Date().toISOString() }));
            if (snap.exists) {
                const existing = snap.data().focus_items || [];
                await ref.update({ focus_items: [...existing, ...newItems], mood: args.mood || snap.data().mood || "focused", updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: uid, lastAiRunId: aiRunId });
            } else {
                await ref.set({ focus_items: newItems, mood: args.mood || "focused", createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: uid, lastAiRunId: aiRunId });
            }
            newDocId = today;
            diff = `items:${newItems.length}, date:${today}`;
        }

        if (name === "logDecision") {
            const payload = {
                decision: args.decision,
                rationale: args.rationale || "",
                decisionMaker: args.decisionMaker || "Shadow CoS",
                verdict: args.verdict || "NEUTRALE",
                ...(args.eventId && { eventId: args.eventId }),
                savedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: uid,
                source: "shadow_cos",
                aiRunId,
            };
            const ref = await db.collection("decisions").add(payload);
            newDocId = ref.id;
            diff = `verdict:${payload.verdict}, decision:"${payload.decision.slice(0, 80)}"`;
        }

        // 5. Audit log — SUCCESS
        await writeAuditLog({
            uid, email, role,
            action: name.toUpperCase(),
            aiRunId, sessionId,
            toolName: name,
            inputSummary: JSON.stringify(args).slice(0, 300),
            targetDocRef: newDocId ? `${policy.collection}/${newDocId}` : policy.collection,
            diff,
            result: "success",
        });

        return { success: true, id: newDocId, message: `Azione '${name}' completata. DocId: ${newDocId}` };

    } catch (execError) {
        // 5b. Audit log — ERROR (execution failed after auth passed)
        await writeAuditLog({
            uid, email, role,
            action: name.toUpperCase(),
            aiRunId, sessionId,
            toolName: name,
            inputSummary: JSON.stringify(args).slice(0, 300),
            targetDocRef: policy.collection,
            result: "error",
            errorMessage: execError.message,
        });
        throw execError;
    }
}

// ── ASK SHADOW CoS (Native Function Calling + Agentic Loop) ──────────────────
exports.askShadowCoS = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public",
}, async (request) => {

    logger.info("--- SHADOW COS START ---");

    // ── AUTH GATE ─────────────────────────────────────────────────────────────
    if (!request.auth) {
        logger.warn("[SHADOW COS] Unauthenticated call rejected.");
        await writeAuditLog({ action: "SHADOW_COS_CALL", result: "denied", errorMessage: "Unauthenticated" });
        return { data: "Accesso negato: autenticazione richiesta." };
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || null;
    const role = await getUserRole(uid);
    const { query, history = [], sessionId = null } = request.data;
    const aiRunId = `run_${Date.now()}_${uid.slice(0, 6)}`;

    logger.info(`Invoked by: ${email} (${role}) | sessionId: ${sessionId} | aiRunId: ${aiRunId}`);

    if (!query) {
        await writeAuditLog({ uid, email, role, action: "SHADOW_COS_CALL", aiRunId, sessionId, result: "error", errorMessage: "Missing query" });
        return { data: "Parametro 'query' mancante." };
    }

    // ── RBAC: Minimum role to use Shadow CoS ─────────────────────────────────
    if (!hasMinRole(role, "STAFF")) {
        await writeAuditLog({ uid, email, role, action: "SHADOW_COS_CALL", aiRunId, sessionId, result: "denied", errorMessage: "Role too low to use Shadow CoS" });
        return { data: "Accesso negato: ruolo insufficiente per Shadow CoS." };
    }

    // Log the session start
    await writeAuditLog({ uid, email, role, action: "SHADOW_COS_CALL", aiRunId, sessionId, inputSummary: query.slice(0, 200), result: "success" });

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found in process.env");

        const ctx = await fetchContext();
        const { okrs, signals, pulse, events, decisions, reports, team } = ctx;

        const systemInstruction = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — un assistente strategico intelligente, diretto e umano.

REGOLE DI COMPORTAMENTO:
- Rispondi SEMPRE nella stessa lingua dell'utente.
- Sii conciso e diretto. Niente intro verbose o disclaimer.
- Il tuo stile è da CoS di alto livello: assertivo, preciso, orientato all'azione.

RUOLO UTENTE CORRENTE: ${role}
CAPACITÀ DI AZIONE (in base al ruolo):
${hasMinRole(role, "COS") ? `- createRiskSignal: registra un segnale di rischio nel Risk Radar
- updateDailyPulse: imposta le priorità operative del giorno
- logDecision: registra una decisione nel Decision Log` : "- Nessuna azione di scrittura disponibile per il tuo ruolo."}
${hasMinRole(role, "ADMIN") ? "- createOKR: crea un nuovo obiettivo strategico nei Strategic Themes" : ""}

Usa queste funzioni quando l'utente lo richiede esplicitamente. Dopo aver eseguito un'azione, conferma brevemente cosa hai fatto.

CONTESTO OPERATIVO:
📁 DOSSIER (${events.length}): ${events.length > 0 ? events.map(e => `"${e.title}" [${e.status}]`).join(", ") : "Nessuno"}
🎯 OKR (${okrs.length}): ${okrs.length > 0 ? okrs.map(o => `"${o.title}" ${o.progress}%`).join(", ") : "Nessuno"}
⚠️ SEGNALI (${signals.length}): ${signals.length > 0 ? signals.map(s => `[${s.level}] ${s.text}`).join(" | ") : "Nessuno"}
📋 PULSE: ${pulse.length > 0 ? pulse.map(p => p.text || p).join(", ") : "Nessun focus oggi"}
🧠 DECISIONI (${decisions.length}): ${decisions.length > 0 ? decisions.map(d => `"${d.decision}"`).join(", ") : "Nessuna"}
📊 REPORT (${reports.length}): ${reports.length > 0 ? reports.map(r => `"${r.topic}"`).join(", ") : "Nessuno"}
👥 TEAM (${team.length}): ${team.length > 0 ? team.map(m => `${m.name} [${m.role}]`).join(", ") : "Nessuno"}`;

        const genAI = new GoogleGenerativeAI(apiKey);

        // Only inject tools for roles that can act
        const tools = hasMinRole(role, "COS") ? SHADOW_COS_TOOLS : [];
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction, tools });

        const chatHistory = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
        const chat = model.startChat({ history: chatHistory });

        // ── AGENTIC EXECUTION LOOP ───────────────────────────────────────────
        let currentResult = await chat.sendMessage(query);
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            const response = currentResult.response;
            const functionCalls = response.functionCalls ? response.functionCalls() : [];

            if (!functionCalls || functionCalls.length === 0) {
                const text = response.text();
                logger.info(`Gemini final response. Length: ${text.length}, Loops: ${loopCount}`);
                return { data: text };
            }

            logger.info(`[LOOP ${loopCount}] Processing ${functionCalls.length} function call(s)`);
            const functionResponseParts = [];

            for (const call of functionCalls) {
                let toolResult;
                try {
                    toolResult = await executeToolSecure(call.name, call.args, { uid, email, role, aiRunId, sessionId });
                    logger.info(`[TOOL SUCCESS] ${call.name}:`, toolResult);
                } catch (toolError) {
                    logger.error(`[TOOL DENIED/ERROR] ${call.name}:`, toolError.message);
                    toolResult = { success: false, error: toolError.message };
                }
                functionResponseParts.push({ functionResponse: { name: call.name, response: toolResult } });
            }

            currentResult = await chat.sendMessage(functionResponseParts);
        }

        logger.warn(`[LOOP CAP] Reached max loops (${MAX_LOOPS})`);
        const fallbackText = currentResult.response.text();
        return { data: fallbackText || "Operazione completata." };

    } catch (error) {
        logger.error("CRITICAL FAILURE:", { error: error.message, stack: error.stack });
        await writeAuditLog({ uid, email, role, action: "SHADOW_COS_CALL", aiRunId, sessionId, result: "error", errorMessage: error.message });
        return { data: "Shadow CoS Offline. Neural Link Severed.", debug: error.message };
    }
});

// ── GENERATE DAILY BRIEFING ───────────────────────────────────────────────────
exports.generateDailyBriefing = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public",
}, async (request) => {

    logger.info("--- DAILY BRIEFING START ---");

    if (!request.auth) {
        await writeAuditLog({ action: "DAILY_BRIEFING", result: "denied", errorMessage: "Unauthenticated" });
        return { data: null, debug: "Unauthenticated" };
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || null;
    const role = await getUserRole(uid);
    const { eventId = null, sessionId = null } = request.data || {};
    const aiRunId = `briefing_${Date.now()}_${uid.slice(0, 6)}`;

    if (!hasMinRole(role, "STAFF")) {
        await writeAuditLog({ uid, email, role, action: "DAILY_BRIEFING", aiRunId, sessionId, result: "denied", errorMessage: "Role insufficient" });
        return { data: null, debug: "Role insufficient" };
    }

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found");

        const ctx = await fetchContext();
        const { okrs, signals, pulse, events } = ctx;
        const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

        const briefingPrompt = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS.

Genera il BRIEFING GIORNALIERO operativo per oggi, ${today}.

DATI DISPONIBILI:
- Dossier Attivi: ${events.length > 0 ? events.map(e => `"${e.title}" [${e.status}]`).join(", ") : "Nessuno"}
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : "Nessun OKR registrato"}
- Segnali di Rischio recenti: ${signals.length > 0 ? JSON.stringify(signals) : "Nessun segnale"}
- Focus odierno: ${pulse.length > 0 ? JSON.stringify(pulse) : "Nessun focus impostato"}

STRUTTURA DEL BRIEFING (usa esattamente questo formato markdown):
## Situazione Strategica
[2-3 frasi sullo stato complessivo basate sugli OKR e dossier]

## Alert Prioritari
[Elenco puntato dei rischi o disallineamenti da gestire oggi. Se non ci sono dati, scrivi "Nessun alert critico."]

## Raccomandazione del Giorno
[1 azione concreta e specifica che il team dovrebbe prioritizzare oggi]

TONO: assertivo, diretto, da CoS di alto livello. Niente frasi generiche.`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(briefingPrompt);
        const text = result.response.text();

        await writeAuditLog({ uid, email, role, action: "DAILY_BRIEFING", aiRunId, sessionId, inputSummary: `eventId:${eventId}`, result: "success" });
        logger.info("Briefing generated. Length:", text.length);
        return { data: text };

    } catch (error) {
        logger.error("BRIEFING FAILURE:", { error: error.message });
        await writeAuditLog({ uid, email, role, action: "DAILY_BRIEFING", aiRunId, sessionId, result: "error", errorMessage: error.message });
        return { data: null, debug: error.message };
    }
});

// ── RESEARCH & REPORT ─────────────────────────────────────────────────────────
exports.researchAndReport = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public",
}, async (request) => {

    logger.info("--- RESEARCH & REPORT START ---");

    if (!request.auth) {
        await writeAuditLog({ action: "RESEARCH_REPORT", result: "denied", errorMessage: "Unauthenticated" });
        return { data: null };
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || null;
    const role = await getUserRole(uid);
    const { topic, reportType = "strategic", sessionId = null } = request.data;
    const aiRunId = `report_${Date.now()}_${uid.slice(0, 6)}`;

    if (!topic) {
        await writeAuditLog({ uid, email, role, action: "RESEARCH_REPORT", aiRunId, result: "error", errorMessage: "Missing topic" });
        return { data: null, debug: "Missing topic" };
    }

    if (!hasMinRole(role, "STAFF")) {
        await writeAuditLog({ uid, email, role, action: "RESEARCH_REPORT", aiRunId, sessionId, result: "denied", errorMessage: "Role insufficient" });
        return { data: null };
    }

    logger.info(`Research: "${topic}" | type: ${reportType} | user: ${email} (${role})`);

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found");

        const { okrs, signals } = await fetchContext();

        const systemInstruction = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — un analista strategico con accesso a fonti web in tempo reale.

REGOLE FONDAMENTALI:
- Usa SEMPRE la ricerca web per trovare dati, notizie e trend recenti sul topic richiesto.
- CRITICO: Il topic di ricerca è ESATTAMENTE quello indicato dall'utente. NON sostituirlo o disambiguarlo.
- Rispondi nella stessa lingua della richiesta (italiano o inglese).
- NON inventare dati. Cita solo informazioni verificate dalle fonti web.

CONTESTO OPERATIVO:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : "Nessun OKR attivo"}
- Segnali di Rischio: ${signals.length > 0 ? JSON.stringify(signals) : "Nessun segnale rilevato"}`;

        const reportTemplates = {
            strategic: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT STRATEGICO strutturato così:\n\n# Report Strategico: ${topic}\n\n## Executive Summary\n[2-3 frasi: situazione attuale basata su dati reali]\n\n## Trend & Dati Chiave\n[Dati, statistiche, notizie recenti con fonti]\n\n## Implicazioni per l'azienda\n[Come questo impatta gli OKR e le priorità]\n\n## Raccomandazioni Tattiche\n[3 azioni concrete e prioritizzate]\n\n## Fonti\n[Lista delle fonti utilizzate]`,
            competitive: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT COMPETITIVO strutturato così:\n\n# Analisi Competitiva: ${topic}\n\n## Panorama Attuale\n[Chi sono i player principali, quote di mercato, posizionamento]\n\n## Mosse Recenti dei Competitor\n[Ultime notizie: funding, lanci, acquisizioni, partnership]\n\n## Opportunità & Minacce\n[Spazi aperti vs rischi]\n\n## Raccomandazione Strategica\n[1 mossa prioritaria]\n\n## Fonti\n[Lista delle fonti utilizzate]`,
            market: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT DI MERCATO strutturato così:\n\n# Market Intelligence: ${topic}\n\n## Dimensioni & Crescita del Mercato\n[TAM/SAM/SOM, CAGR, proiezioni]\n\n## Driver di Crescita\n[Fattori che stanno accelerando il mercato]\n\n## Barriere & Rischi\n[Ostacoli regolatori, tecnologici, economici]\n\n## Opportunità\n[Dove posizionarsi]\n\n## Fonti\n[Lista delle fonti utilizzate]`,
        };

        const prompt = reportTemplates[reportType] || reportTemplates.strategic;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction, tools: [{ googleSearch: {} }] });

        logger.info("Calling Gemini with Google Search grounding...");
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map(chunk => ({ title: chunk.web?.title || "", uri: chunk.web?.uri || "" })).filter(s => s.uri) || [];

        let cleanContent = text;
        const firstHeadingIdx = text.search(/^#{1,3}\s/m);
        if (firstHeadingIdx > 0) cleanContent = text.slice(firstHeadingIdx).trim();

        await writeAuditLog({ uid, email, role, action: "RESEARCH_REPORT", aiRunId, sessionId, inputSummary: `topic:"${topic}", type:${reportType}`, result: "success" });
        logger.info(`Report generated. Length: ${cleanContent.length}, Sources: ${sources.length}`);

        return { data: { content: cleanContent, sources, topic, reportType, generatedAt: new Date().toISOString() } };

    } catch (error) {
        logger.error("RESEARCH FAILURE:", { error: error.message, stack: error.stack });
        await writeAuditLog({ uid, email, role, action: "RESEARCH_REPORT", aiRunId, sessionId, result: "error", errorMessage: error.message });
        return { data: null, debug: error.message };
    }
});

// ── ANALYZE DECISION ──────────────────────────────────────────────────────────
exports.analyzeDecision = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public",
}, async (request) => {

    logger.info("--- ANALYZE DECISION START ---");

    if (!request.auth) {
        await writeAuditLog({ action: "ANALYZE_DECISION", result: "denied", errorMessage: "Unauthenticated" });
        return { data: null };
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || null;
    const role = await getUserRole(uid);
    const { decision, rationale = "", decisionMaker = "Admin", sessionId = null } = request.data;
    const aiRunId = `decision_${Date.now()}_${uid.slice(0, 6)}`;

    if (!decision) {
        await writeAuditLog({ uid, email, role, action: "ANALYZE_DECISION", aiRunId, result: "error", errorMessage: "Missing decision" });
        return { data: null, debug: "Missing decision" };
    }

    if (!hasMinRole(role, "STAFF")) {
        await writeAuditLog({ uid, email, role, action: "ANALYZE_DECISION", aiRunId, result: "denied", errorMessage: "Role insufficient" });
        return { data: null };
    }

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found");

        const { okrs, signals } = await fetchContext();
        const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

        const prompt = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — analista strategico di alto livello.

Il responsabile "${decisionMaker}" ha registrato la seguente decisione strategica in data ${today}:

DECISIONE: "${decision}"
${rationale ? `MOTIVAZIONE DICHIARATA: "${rationale}"` : ""}

CONTESTO OPERATIVO CORRENTE:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : "Nessun OKR attivo"}
- Segnali di Rischio recenti: ${signals.length > 0 ? JSON.stringify(signals) : "Nessun segnale rilevato"}

Produci una VALUTAZIONE STRATEGICA strutturata così (usa esattamente questo formato markdown):

## Sintesi della Decisione
[1-2 frasi che riformulano la decisione in chiave strategica]

## Allineamento con gli OKR
[Come questa decisione si collega agli OKR attivi. Se non ci sono OKR, indica che la decisione opera in assenza di obiettivi misurati.]

## Implicazioni e Rischi
[2-3 punti: possibili conseguenze positive e rischi da monitorare. Collega ai segnali di rischio se pertinenti.]

## Raccomandazioni di Follow-up
[3 azioni concrete che il team dovrebbe eseguire per massimizzare l'efficacia di questa decisione]

## Verdict Strategico
[Una valutazione sintetica: ALLINEATA / NEUTRALE / A RISCHIO — con 1 frase di motivazione]

TONO: assertivo, diretto, da Chief of Staff. Nessun giudizio morale, solo analisi strategica.`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let cleanAnalysis = text;
        const firstHeadingIdx = text.search(/^#{1,3}\s/m);
        if (firstHeadingIdx > 0) cleanAnalysis = text.slice(firstHeadingIdx).trim();

        await writeAuditLog({ uid, email, role, action: "ANALYZE_DECISION", aiRunId, sessionId, inputSummary: `decision:"${decision.slice(0, 100)}"`, result: "success" });
        logger.info("Decision analysis generated. Length:", cleanAnalysis.length);

        return { data: { analysis: cleanAnalysis, decision, rationale, decisionMaker, analyzedAt: new Date().toISOString() } };

    } catch (error) {
        logger.error("ANALYZE DECISION FAILURE:", { error: error.message, stack: error.stack });
        await writeAuditLog({ uid, email, role, action: "ANALYZE_DECISION", aiRunId, sessionId, result: "error", errorMessage: error.message });
        return { data: null, debug: error.message };
    }
});

// ── COMPUTE RANK SCORES (scheduled daily at 22:00 CET) ───────────────────────
const computeScoresLogic = async () => {
    const db = admin.firestore();
    const [usersSnap, decisionsSnap, signalsSnap, okrsSnap, pulseSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("decisions").get(),
        db.collection("signals").get(),
        db.collection("okrs").get(),
        db.collection("daily_pulse").get(),
    ]);
    if (usersSnap.empty) return 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPulseDocs = pulseSnap.docs.filter(d => new Date(d.id) >= sevenDaysAgo);
    const krByUser = {}, decByUser = {}, sigByUser = {}, pulseByUser = {};

    okrsSnap.docs.forEach(d => { const uid = d.data().createdBy; if (!uid) return; krByUser[uid] = (krByUser[uid] || 0) + (d.data().keyResults || []).filter(kr => kr.completed).length; });
    decisionsSnap.docs.forEach(d => { const uid = d.data().uid || d.data().createdBy; if (!uid) return; decByUser[uid] = (decByUser[uid] || 0) + 1; });
    signalsSnap.docs.forEach(d => { const uid = d.data().uid || d.data().createdBy; if (!uid) return; sigByUser[uid] = (sigByUser[uid] || 0) + 1; });
    recentPulseDocs.forEach(doc => { const uid = doc.data().uid || doc.data().createdBy; if (!uid) return; pulseByUser[uid] = (pulseByUser[uid] || 0) + (doc.data().focus_items || []).filter(i => i.completed).length; });

    const batch = db.batch();
    usersSnap.docs.forEach(userDoc => {
        const uid = userDoc.id;
        const score = (krByUser[uid] || 0) * 20 + (decByUser[uid] || 0) * 15 + (sigByUser[uid] || 0) * 10 + (pulseByUser[uid] || 0) * 5;
        batch.update(userDoc.ref, { rank_score: score });
    });
    await batch.commit();
    return usersSnap.size;
};

exports.computeRankScores = onSchedule({ schedule: "0 22 * * *", timeZone: "Europe/Rome" }, async () => {
    logger.info("--- COMPUTE RANK SCORES (scheduled) ---");
    try { const n = await computeScoresLogic(); logger.info("RANK SCORES updated for " + n + " users"); }
    catch (e) { logger.error("RANK SCORE SCHEDULED FAILURE:", { message: e.message }); }
});

// ── TRIGGER RANK SCORES (manual — ADMIN only) ────────────────────────────────
exports.triggerRankScores = onCall({ cors: true }, async (request) => {
    // Note: invoker is NOT 'public' — requires Firebase Auth token
    logger.info("--- TRIGGER RANK SCORES (manual) ---");

    if (!request.auth) {
        await writeAuditLog({ action: "TRIGGER_RANK_SCORES", result: "denied", errorMessage: "Unauthenticated" });
        return { data: null, debug: "Unauthenticated" };
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || null;
    const role = await getUserRole(uid);
    const aiRunId = `ranks_${Date.now()}`;

    if (!hasMinRole(role, "ADMIN")) {
        await writeAuditLog({ uid, email, role, action: "TRIGGER_RANK_SCORES", aiRunId, result: "denied", errorMessage: "ADMIN required" });
        return { data: null, debug: "ADMIN role required" };
    }

    try {
        const n = await computeScoresLogic();
        await writeAuditLog({ uid, email, role, action: "TRIGGER_RANK_SCORES", aiRunId, result: "success", diff: `updated:${n} users` });
        return { data: { updated: n } };
    } catch (e) {
        logger.error("TRIGGER RANK FAILURE:", { message: e.message });
        await writeAuditLog({ uid, email, role, action: "TRIGGER_RANK_SCORES", aiRunId, result: "error", errorMessage: e.message });
        return { data: null, debug: e.message };
    }
});