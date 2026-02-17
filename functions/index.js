const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Helper: fetch context from Firestore
async function fetchContext() {
    let okrs = [];
    try {
        const okrsSnap = await admin.firestore().collection('okrs').orderBy('createdAt', 'desc').get();
        okrs = okrsSnap.docs.map(d => ({ title: d.data().title, status: d.data().status, progress: d.data().progress }));
    } catch (e) {
        logger.warn("Failed to fetch OKRs:", e.message);
    }

    let signals = [];
    try {
        const signalsSnap = await admin.firestore().collection('signals').orderBy('createdAt', 'desc').limit(5).get();
        signals = signalsSnap.docs.map(d => ({ text: d.data().text, level: d.data().level }));
    } catch (e) {
        logger.warn("Failed to fetch Signals:", e.message);
    }

    let pulse = [];
    try {
        const today = new Date().toISOString().split('T')[0];
        const pulseSnap = await admin.firestore().collection('daily_pulse').doc(today).get();
        pulse = pulseSnap.exists ? (pulseSnap.data().focus_items || []) : [];
    } catch (e) {
        logger.warn("Failed to fetch Pulse:", e.message);
    }

    return { okrs, signals, pulse };
}

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

        logger.info("Fetching Firestore context...");
        const { okrs, signals, pulse } = await fetchContext();
        logger.info(`Context: ${okrs.length} OKRs, ${signals.length} Signals, ${pulse.length} Pulse items`);

        const systemInstruction = `Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS — un assistente strategico intelligente, diretto e umano.

REGOLE DI COMPORTAMENTO:
- Rispondi SEMPRE nella stessa lingua dell'utente (italiano se scrive in italiano, inglese se scrive in inglese).
- Sii conciso e diretto. Niente intro verbose o disclaimer.
- Se il messaggio è un saluto o conversazionale (es. "ciao", "come stai"), rispondi in modo naturale e breve, poi offri il tuo aiuto strategico.
- Quando hai dati di contesto rilevanti, usali per dare insight proattivi.
- Il tuo stile è da CoS di alto livello: assertivo, preciso, orientato all'azione.
- Ricorda il contesto della conversazione precedente e costruisci su di esso.

CONTESTO OPERATIVO CORRENTE:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : 'Nessun OKR attivo'}
- Segnali di Rischio: ${signals.length > 0 ? JSON.stringify(signals) : 'Nessun segnale rilevato'}
- Focus del Giorno: ${pulse.length > 0 ? JSON.stringify(pulse) : 'Nessun focus impostato oggi'}`;

        logger.info("Calling Gemini API (multi-turn)...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction,
        });

        // Build chat history from previous turns
        const { history = [] } = request.data;
        const chatHistory = history.map(h => ({
            role: h.role, // 'user' or 'model'
            parts: [{ text: h.text }],
        }));

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(query);
        const text = result.response.text();

        logger.info("Gemini Success. Length:", text.length);
        return { data: text };

    } catch (error) {
        logger.error("CRITICAL FAILURE:", { error: error.message, stack: error.stack });
        return {
            data: "Shadow CoS Offline. Neural Link Severed.",
            debug: error.message
        };
    }
});

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

        const { okrs, signals, pulse } = await fetchContext();
        logger.info(`Context: ${okrs.length} OKRs, ${signals.length} Signals, ${pulse.length} Pulse items`);

        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

        const briefingPrompt = `
Sei "Shadow CoS", il Chief of Staff digitale di Quinta OS.

Genera il BRIEFING GIORNALIERO operativo per oggi, ${today}.

DATI DISPONIBILI:
- OKR Strategici: ${okrs.length > 0 ? JSON.stringify(okrs) : 'Nessun OKR registrato'}
- Segnali di Rischio recenti: ${signals.length > 0 ? JSON.stringify(signals) : 'Nessun segnale'}
- Focus odierno: ${pulse.length > 0 ? JSON.stringify(pulse) : 'Nessun focus impostato'}

STRUTTURA DEL BRIEFING (usa esattamente questo formato markdown):
## Situazione Strategica
[2-3 frasi sullo stato complessivo basate sugli OKR]

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
