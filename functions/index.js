const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// ── CONTEXT FETCHER ───────────────────────────────────────────────────────────
// Fetches a rich snapshot of the entire app state for Shadow CoS
async function fetchContext() {
    const db = admin.firestore();

    // OKRs
    let okrs = [];
    try {
        const snap = await db.collection('okrs').orderBy('createdAt', 'desc').get();
        okrs = snap.docs.map(d => ({
            title: d.data().title,
            status: d.data().status,
            progress: d.data().progress,
            keyResults: (d.data().keyResults || []).map(kr => ({ title: kr.title, completed: kr.completed })),
        }));
    } catch (e) { logger.warn("Failed to fetch OKRs:", e.message); }

    // Risk signals
    let signals = [];
    try {
        const snap = await db.collection('signals').orderBy('createdAt', 'desc').limit(8).get();
        signals = snap.docs.map(d => ({ text: d.data().text, level: d.data().level }));
    } catch (e) { logger.warn("Failed to fetch Signals:", e.message); }

    // Daily pulse
    let pulse = [];
    try {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection('daily_pulse').doc(today).get();
        pulse = snap.exists ? (snap.data().focus_items || []) : [];
    } catch (e) { logger.warn("Failed to fetch Pulse:", e.message); }

    // Active dossier (events)
    let events = [];
    try {
        const snap = await db.collection('events')
            .where('status', '!=', 'archived')
            .orderBy('status')
            .orderBy('createdAt', 'desc')
            .get();
        events = snap.docs.map(d => ({
            id: d.id,
            title: d.data().title,
            description: d.data().description || '',
            status: d.data().status,
            teamSize: (d.data().teamMembers || []).length,
        }));
    } catch (e) { logger.warn("Failed to fetch Events:", e.message); }

    // Recent decisions
    let decisions = [];
    try {
        const snap = await db.collection('decisions').orderBy('savedAt', 'desc').limit(5).get();
        decisions = snap.docs.map(d => ({
            decision: d.data().decision,
            verdict: d.data().verdict,
            decisionMaker: d.data().decisionMaker,
            analyzedAt: d.data().analyzedAt,
        }));
    } catch (e) { logger.warn("Failed to fetch Decisions:", e.message); }

    // Recent intelligence reports
    let reports = [];
    try {
        const snap = await db.collection('reports').orderBy('savedAt', 'desc').limit(5).get();
        reports = snap.docs.map(d => ({
            topic: d.data().topic,
            reportType: d.data().reportType,
            docNumber: d.data().docNumber,
        }));
    } catch (e) { logger.warn("Failed to fetch Reports:", e.message); }

    // Team members
    let team = [];
    try {
        const snap = await db.collection('users').get();
        team = snap.docs.map(d => ({
            name: d.data().displayName || d.data().email || 'Utente',
            role: d.data().role || 'MEMBER',
            rank_score: d.data().rank_score || 0,
        }));
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
                        text: { type: "STRING", description: "Descrizione chiara e concisa del segnale di rischio (max 200 caratteri)" },
                        level: { type: "STRING", enum: ["high", "medium", "low"], description: "Livello di severità del rischio" },
                        category: { type: "STRING", description: "Categoria del rischio (es. Strategico, Operativo, Finanziario, Reputazionale)" }
                    },
                    required: ["text", "level"]
                }
            },
            {
                name: "createOKR",
                description: "Crea un nuovo OKR (Objective and Key Result) nei Strategic Themes. Usalo quando l'utente vuole definire un nuovo obiettivo strategico.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "Titolo dell'obiettivo strategico" },
                        description: { type: "STRING", description: "Descrizione dettagliata dell'obiettivo" },
                        keyResult: { type: "STRING", description: "Primo Key Result misurabile (opzionale)" }
                    },
                    required: ["title"]
                }
            },
            {
                name: "updateDailyPulse",
                description: "Aggiunge focus items al Daily Pulse di oggi. Usalo quando l'utente vuole impostare le priorità operative della giornata.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        items: {
                            type: "ARRAY",
                            description: "Lista di focus items da aggiungere al Daily Pulse",
                            items: { type: "STRING" }
                        },
                        mood: { type: "STRING", enum: ["focused", "stressed", "energized", "uncertain"], description: "Stato operativo del team oggi" }
                    },
                    required: ["items"]
                }
            },
            {
                name: "logDecision",
                description: "Registra una decisione strategica nel Decision Log. Usalo quando l'utente vuole tracciare una decisione importante presa dal team.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        decision: { type: "STRING", description: "Descrizione della decisione presa" },
                        rationale: { type: "STRING", description: "Motivazione strategica della decisione" },
                        decisionMaker: { type: "STRING", description: "Nome del responsabile della decisione" },
                        verdict: { type: "STRING", enum: ["ALLINEATA", "NEUTRALE", "A RISCHIO"], description: "Valutazione strategica della decisione" }
                    },
                    required: ["decision"]
                }
            }
        ]
    }
];

// ── SERVER-SIDE TOOL EXECUTOR ─────────────────────────────────────────────────
// Uses admin.firestore() — bypasses ALL Firestore security rules
async function executeTool(name, args) {
    const db = admin.firestore();
    logger.info(`[TOOL CALL] ${name}`, args);

    if (name === "createRiskSignal") {
        const ref = await db.collection('signals').add({
            text: args.text,
            level: args.level || 'medium',
            category: args.category || 'Strategico',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'shadow_cos',
        });
        return { success: true, id: ref.id, message: `Segnale di rischio creato con ID: ${ref.id}` };
    }

    if (name === "createOKR") {
        const keyResults = args.keyResult ? [{ title: args.keyResult, completed: false }] : [];
        const ref = await db.collection('okrs').add({
            title: args.title,
            description: args.description || '',
            status: 'on_track',
            progress: 0,
            keyResults,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'shadow_cos',
        });
        return { success: true, id: ref.id, message: `OKR creato con ID: ${ref.id}` };
    }

    if (name === "updateDailyPulse") {
        const today = new Date().toISOString().split('T')[0];
        const ref = db.collection('daily_pulse').doc(today);
        const snap = await ref.get();
        const newItems = (args.items || []).map(text => ({ text, completed: false }));
        if (snap.exists) {
            const existing = snap.data().focus_items || [];
            await ref.update({
                focus_items: [...existing, ...newItems],
                mood: args.mood || snap.data().mood || 'focused',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'shadow_cos',
            });
        } else {
            await ref.set({
                focus_items: newItems,
                mood: args.mood || 'focused',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'shadow_cos',
            });
        }
        return { success: true, date: today, itemsAdded: newItems.length, message: `Daily Pulse aggiornato: ${newItems.length} item aggiunti per ${today}` };
    }

    if (name === "logDecision") {
        const ref = await db.collection('decisions').add({
            decision: args.decision,
            rationale: args.rationale || '',
            decisionMaker: args.decisionMaker || 'Shadow CoS',
            verdict: args.verdict || 'NEUTRALE',
            savedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'shadow_cos',
        });
        return { success: true, id: ref.id, message: `Decisione registrata con ID: ${ref.id}` };
    }

    throw new Error(`Unknown tool: ${name}`);
}

// ── ASK SHADOW CoS (Native Function Calling + Agentic Loop) ──────────────────
exports.askShadowCoS = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public"
}, async (request) => {

    logger.info("--- SHADOW COS START ---");
    logger.info("Invoked by:", request.auth?.token.email || "Unauthenticated");

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found in process.env");
        logger.info("API Key found (prefix):", apiKey.substring(0, 4));

        const { query } = request.data;
        if (!query) throw new Error("Missing query in request data");
        logger.info("User Query:", query);

        logger.info("Fetching full app context...");
        const ctx = await fetchContext();
        logger.info(`Context: ${ctx.okrs.length} OKRs, ${ctx.signals.length} Signals, ${ctx.events.length} Events, ${ctx.decisions.length} Decisions`);

        const { okrs, signals, pulse, events, decisions, reports, team } = ctx;
        const systemInstruction = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — un assistente strategico intelligente, diretto e umano.

REGOLE DI COMPORTAMENTO:
- Rispondi SEMPRE nella stessa lingua dell'utente (italiano se scrive in italiano, inglese se scrive in inglese).
- Sii conciso e diretto. Niente intro verbose o disclaimer.
- Se il messaggio è un saluto o conversazionale, rispondi in modo naturale e breve, poi offri il tuo aiuto strategico.
- Il tuo stile è da CoS di alto livello: assertivo, preciso, orientato all'azione.

CAPACITÀ DI AZIONE:
Hai accesso a funzioni che ti permettono di agire DIRETTAMENTE sull'app (nessuna approvazione richiesta — le azioni vengono eseguite immediatamente):
- createRiskSignal: registra un segnale di rischio nel Risk Radar
- createOKR: crea un nuovo obiettivo strategico nei Strategic Themes
- updateDailyPulse: imposta le priorità operative del giorno
- logDecision: registra una decisione nel Decision Log

Usa queste funzioni quando l'utente lo richiede esplicitamente. Dopo aver eseguito un'azione, conferma brevemente cosa hai fatto.

CONTESTO OPERATIVO:
📁 DOSSIER (${events.length}): ${events.length > 0 ? events.map(e => `"${e.title}" [${e.status}]`).join(', ') : 'Nessuno'}
🎯 OKR (${okrs.length}): ${okrs.length > 0 ? okrs.map(o => `"${o.title}" ${o.progress}%`).join(', ') : 'Nessuno'}
⚠️ SEGNALI (${signals.length}): ${signals.length > 0 ? signals.map(s => `[${s.level}] ${s.text}`).join(' | ') : 'Nessuno'}
📋 PULSE: ${pulse.length > 0 ? pulse.map(p => p.text || p).join(', ') : 'Nessun focus oggi'}
🧠 DECISIONI (${decisions.length}): ${decisions.length > 0 ? decisions.map(d => `"${d.decision}"`).join(', ') : 'Nessuna'}
📊 REPORT (${reports.length}): ${reports.length > 0 ? reports.map(r => `"${r.topic}"`).join(', ') : 'Nessuno'}
👥 TEAM (${team.length}): ${team.length > 0 ? team.map(m => `${m.name} [${m.role}]`).join(', ') : 'Nessuno'}`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction,
            tools: SHADOW_COS_TOOLS,
        });

        // Build chat history from previous turns
        const { history = [] } = request.data;
        const chatHistory = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }],
        }));

        const chat = model.startChat({ history: chatHistory });

        // ── AGENTIC EXECUTION LOOP ────────────────────────────────────────────
        // Gemini may chain multiple function calls before producing a final text response.
        // We loop until we get a text response (no more function calls).
        let currentResult = await chat.sendMessage(query);
        let loopCount = 0;
        const MAX_LOOPS = 5; // safety cap

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            const response = currentResult.response;
            const functionCalls = response.functionCalls ? response.functionCalls() : [];

            // No function calls → Gemini produced a final text response
            if (!functionCalls || functionCalls.length === 0) {
                const text = response.text();
                logger.info(`Gemini final response. Length: ${text.length}, Loops: ${loopCount}`);
                return { data: text };
            }

            // Process all function calls in this turn
            logger.info(`[LOOP ${loopCount}] Processing ${functionCalls.length} function call(s)`);
            const functionResponseParts = [];

            for (const call of functionCalls) {
                let toolResult;
                try {
                    toolResult = await executeTool(call.name, call.args);
                    logger.info(`[TOOL SUCCESS] ${call.name}:`, toolResult);
                } catch (toolError) {
                    logger.error(`[TOOL ERROR] ${call.name}:`, toolError.message);
                    toolResult = { success: false, error: toolError.message };
                }
                functionResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: toolResult,
                    }
                });
            }

            // Send tool results back to Gemini for the next turn
            currentResult = await chat.sendMessage(functionResponseParts);
        }

        // Safety fallback: hit MAX_LOOPS
        logger.warn(`[LOOP CAP] Reached max loops (${MAX_LOOPS})`);
        const fallbackText = currentResult.response.text();
        return { data: fallbackText || "Operazione completata." };

    } catch (error) {
        logger.error("CRITICAL FAILURE:", { error: error.message, stack: error.stack });
        return {
            data: "Shadow CoS Offline. Neural Link Severed.",
            debug: error.message
        };
    }
});

// ── GENERATE DAILY BRIEFING ───────────────────────────────────────────────────
exports.generateDailyBriefing = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public"
}, async (request) => {

    logger.info("--- DAILY BRIEFING START ---");
    logger.info("Invoked by:", request.auth?.token.email || "Unauthenticated");

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found in process.env");

        const ctx = await fetchContext();
        const { okrs, signals, pulse, events } = ctx;
        logger.info(`Context: ${okrs.length} OKRs, ${signals.length} Signals, ${pulse.length} Pulse items, ${events.length} Events`);

        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

        const briefingPrompt = `
Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS.

Genera il BRIEFING GIORNALIERO operativo per oggi, ${today}.

DATI DISPONIBILI:
- Dossier Attivi: ${events.length > 0 ? events.map(e => `"${e.title}" [${e.status}]`).join(', ') : 'Nessuno'}
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : 'Nessun OKR registrato'}
- Segnali di Rischio recenti: ${signals.length > 0 ? JSON.stringify(signals) : 'Nessun segnale'}
- Focus odierno: ${pulse.length > 0 ? JSON.stringify(pulse) : 'Nessun focus impostato'}

STRUTTURA DEL BRIEFING (usa esattamente questo formato markdown):
## Situazione Strategica
[2-3 frasi sullo stato complessivo basate sugli OKR e dossier]

## Alert Prioritari
[Elenco puntato dei rischi o disallineamenti da gestire oggi. Se non ci sono dati, scrivi "Nessun alert critico."]

## Raccomandazione del Giorno
[1 azione concreta e specifica che il team dovrebbe prioritizzare oggi]

TONO: assertivo, diretto, da CoS di alto livello. Niente frasi generiche.
`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(briefingPrompt);
        const text = result.response.text();

        logger.info("Briefing generated. Length:", text.length);
        return { data: text };

    } catch (error) {
        logger.error("BRIEFING FAILURE:", { error: error.message });
        return {
            data: null,
            debug: error.message
        };
    }
});

// ── RESEARCH & REPORT ─────────────────────────────────────────────────────────
exports.researchAndReport = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public"
}, async (request) => {

    logger.info("--- RESEARCH & REPORT START ---");
    logger.info("Invoked by:", request.auth?.token.email || "Unauthenticated");

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found in process.env");

        const { topic, reportType = "strategic" } = request.data;
        if (!topic) throw new Error("Missing topic in request data");
        logger.info("Research topic:", topic, "| type:", reportType);

        const { okrs, signals } = await fetchContext();

        const systemInstruction = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — un analista strategico con accesso a fonti web in tempo reale.

REGOLE FONDAMENTALI:
- Usa SEMPRE la ricerca web per trovare dati, notizie e trend recenti sul topic richiesto.
- CRITICO: Il topic di ricerca è ESATTAMENTE quello indicato dall'utente. NON sostituirlo, NON disambiguarlo, NON rimpiazzarlo con soggetti simili o più noti. Se il topic è "Andersen Italia", ricerca SOLO "Andersen Italia", non "Accenture" né altri nomi simili.
- Rispondi nella stessa lingua della richiesta (italiano o inglese).
- Il tuo stile è da CoS di alto livello: assertivo, preciso, orientato all'azione.
- NON inventare dati. Cita solo informazioni verificate dalle fonti web.
- Collega sempre le informazioni al contesto operativo dell'azienda quando rilevante.

CONTESTO OPERATIVO:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : 'Nessun OKR attivo'}
- Segnali di Rischio: ${signals.length > 0 ? JSON.stringify(signals) : 'Nessun segnale rilevato'}`;

        const reportTemplates = {
            strategic: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT STRATEGICO strutturato così:

# Report Strategico: ${topic}

## Executive Summary
[2-3 frasi: situazione attuale basata su dati reali]

## Trend & Dati Chiave
[Dati, statistiche, notizie recenti con fonti]

## Implicazioni per Quinta OS
[Come questo impatta gli OKR e le priorità aziendali]

## Raccomandazioni Tattiche
[3 azioni concrete e prioritizzate]

## Fonti
[Lista delle fonti utilizzate]`,

            competitive: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT COMPETITIVO strutturato così:

# Analisi Competitiva: ${topic}

## Panorama Attuale
[Chi sono i player principali, quote di mercato, posizionamento]

## Mosse Recenti dei Competitor
[Ultime notizie: funding, lanci, acquisizioni, partnership]

## Opportunità & Minacce
[Spazi aperti vs rischi per Quinta OS]

## Raccomandazione Strategica
[1 mossa prioritaria]

## Fonti
[Lista delle fonti utilizzate]`,

            market: `Il topic di questa ricerca è ESATTAMENTE: "${topic}". Ricerca SOLO questo soggetto specifico usando fonti web aggiornate e produci un REPORT DI MERCATO strutturato così:

# Market Intelligence: ${topic}

## Dimensioni & Crescita del Mercato
[TAM/SAM/SOM, CAGR, proiezioni]

## Driver di Crescita
[Fattori che stanno accelerando il mercato]

## Barriere & Rischi
[Ostacoli regolatori, tecnologici, economici]

## Opportunità per Quinta OS
[Dove posizionarsi]

## Fonti
[Lista delle fonti utilizzate]`,
        };

        const prompt = reportTemplates[reportType] || reportTemplates.strategic;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction,
            tools: [{ googleSearch: {} }],
        });

        logger.info("Calling Gemini with Google Search grounding...");
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract grounding metadata (sources) if available
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map(chunk => ({
            title: chunk.web?.title || '',
            uri: chunk.web?.uri || '',
        })).filter(s => s.uri) || [];

        // Strip AI conversational preamble (everything before the first markdown heading)
        let cleanContent = text;
        const firstHeadingIdx = text.search(/^#{1,3}\s/m);
        if (firstHeadingIdx > 0) {
            cleanContent = text.slice(firstHeadingIdx).trim();
        }

        logger.info(`Report generated. Length: ${cleanContent.length}, Sources: ${sources.length}`);

        return {
            data: {
                content: cleanContent,
                sources,
                topic,
                reportType,
                generatedAt: new Date().toISOString(),
            }
        };

    } catch (error) {
        logger.error("RESEARCH FAILURE:", { error: error.message, stack: error.stack });
        return {
            data: null,
            debug: error.message
        };
    }
});

// ── ANALYZE DECISION ──────────────────────────────────────────────────────────
exports.analyzeDecision = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public"
}, async (request) => {

    logger.info("--- ANALYZE DECISION START ---");
    logger.info("Invoked by:", request.auth?.token.email || "Unauthenticated");

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY not found in process.env");

        const { decision, rationale = "", decisionMaker = "Admin" } = request.data;
        if (!decision) throw new Error("Missing decision in request data");
        logger.info("Decision:", decision);

        const { okrs, signals } = await fetchContext();

        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const prompt = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — analista strategico di alto livello.

Il responsabile "${decisionMaker}" ha registrato la seguente decisione strategica in data ${today}:

DECISIONE: "${decision}"
${rationale ? `MOTIVAZIONE DICHIARATA: "${rationale}"` : ''}

CONTESTO OPERATIVO CORRENTE:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : 'Nessun OKR attivo'}
- Segnali di Rischio recenti: ${signals.length > 0 ? JSON.stringify(signals) : 'Nessun segnale rilevato'}

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

        // Strip AI conversational preamble (everything before the first markdown heading)
        let cleanAnalysis = text;
        const firstHeadingIdx = text.search(/^#{1,3}\s/m);
        if (firstHeadingIdx > 0) {
            cleanAnalysis = text.slice(firstHeadingIdx).trim();
        }

        logger.info("Decision analysis generated. Length:", cleanAnalysis.length);

        return {
            data: {
                analysis: cleanAnalysis,
                decision,
                rationale,
                decisionMaker,
                analyzedAt: new Date().toISOString(),
            }
        };

    } catch (error) {
        logger.error("ANALYZE DECISION FAILURE:", { error: error.message, stack: error.stack });
        return {
            data: null,
            debug: error.message
        };
    }
});

// ── COMPUTE RANK SCORES (scheduled daily at 22:00 UTC = 23:00 CET) ────────────
const computeScoresLogic = async () => {
    const db = admin.firestore();
    const [usersSnap, decisionsSnap, signalsSnap, okrsSnap, pulseSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('decisions').get(),
        db.collection('signals').get(),
        db.collection('okrs').get(),
        db.collection('daily_pulse').get(),
    ]);
    if (usersSnap.empty) return 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPulseDocs = pulseSnap.docs.filter(d => new Date(d.id) >= sevenDaysAgo);

    const krByUser = {}, decByUser = {}, sigByUser = {}, pulseByUser = {};

    okrsSnap.docs.forEach(d => {
        const uid = d.data().createdBy;
        if (!uid) return;
        const done = (d.data().keyResults || []).filter(kr => kr.completed).length;
        krByUser[uid] = (krByUser[uid] || 0) + done;
    });
    decisionsSnap.docs.forEach(d => {
        const uid = d.data().uid || d.data().createdBy;
        if (!uid) return;
        decByUser[uid] = (decByUser[uid] || 0) + 1;
    });
    signalsSnap.docs.forEach(d => {
        const uid = d.data().uid || d.data().createdBy;
        if (!uid) return;
        sigByUser[uid] = (sigByUser[uid] || 0) + 1;
    });
    recentPulseDocs.forEach(doc => {
        const uid = doc.data().uid || doc.data().createdBy;
        if (!uid) return;
        const done = (doc.data().focus_items || []).filter(i => i.completed).length;
        pulseByUser[uid] = (pulseByUser[uid] || 0) + done;
    });

    const batch = db.batch();
    usersSnap.docs.forEach(userDoc => {
        const uid = userDoc.id;
        const score =
            (krByUser[uid] || 0) * 20 +
            (decByUser[uid] || 0) * 15 +
            (sigByUser[uid] || 0) * 10 +
            (pulseByUser[uid] || 0) * 5;
        logger.info('RankScore uid=' + uid + ' score=' + score);
        batch.update(userDoc.ref, { rank_score: score });
    });
    await batch.commit();
    return usersSnap.size;
};

exports.computeRankScores = onSchedule({
    schedule: '0 22 * * *',
    timeZone: 'Europe/Rome',
}, async () => {
    logger.info('--- COMPUTE RANK SCORES (scheduled) ---');
    try {
        const n = await computeScoresLogic();
        logger.info('RANK SCORES updated for ' + n + ' users');
    } catch (e) {
        logger.error('RANK SCORE SCHEDULED FAILURE:', { message: e.message });
    }
});

exports.triggerRankScores = onCall({ cors: true, invoker: 'public' }, async () => {
    logger.info('--- TRIGGER RANK SCORES (manual) ---');
    try {
        const n = await computeScoresLogic();
        return { data: { updated: n } };
    } catch (e) {
        logger.error('TRIGGER RANK FAILURE:', { message: e.message });
        return { data: null, debug: e.message };
    }
});