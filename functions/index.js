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
