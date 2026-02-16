const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

exports.askShadowCoS = onCall({
    cors: true,
    secrets: ["GOOGLE_API_KEY"],
    invoker: "public"
}, async (request) => {

    logger.info("--- SHADOW COS START ---");
    logger.info("Invoked by:", request.auth?.token.email || "Unauthenticated");

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            logger.error("MISSING API KEY IN ENV");
            throw new Error("GOOGLE_API_KEY not found in process.env");
        }
        logger.info("API Key found (prefix):", apiKey.substring(0, 4));

        const { query } = request.data;
        if (!query) throw new Error("Missing query in request data");
        logger.info("User Query:", query);

        // 1. Fetch Context from Firestore
        logger.info("Fetching Firestore context...");

        let okrs = [];
        try {
            const okrsSnap = await admin.firestore().collection('okrs').where('status', '==', 'active').get();
            okrs = okrsSnap.docs.map(d => ({ title: d.data().title, status: d.data().status, progress: d.data().progress }));
            logger.info(`Fetched ${okrs.length} OKRs`);
        } catch (e) {
            logger.warn("Failed to fetch OKRs:", e.message);
        }

        let signals = [];
        try {
            const signalsSnap = await admin.firestore().collection('signals').orderBy('createdAt', 'desc').limit(5).get();
            signals = signalsSnap.docs.map(d => ({ text: d.data().text, level: d.data().level }));
            logger.info(`Fetched ${signals.length} Signals`);
        } catch (e) {
            logger.warn("Failed to fetch Signals:", e.message);
        }

        let pulse = [];
        try {
            const today = new Date().toISOString().split('T')[0];
            const pulseSnap = await admin.firestore().collection('daily_pulse').doc(today).get();
            pulse = pulseSnap.exists ? pulseSnap.data().focus_items : [];
            logger.info(`Fetched ${pulse.length} Pulse items`);
        } catch (e) {
            logger.warn("Failed to fetch Pulse:", e.message);
        }

        // 2. System Prompt
        const systemPrompt = `
SYSTEM ROLE: You are 'Shadow CoS', the strategic AI engine for "Quinta OS". 
DATA CONTEXT:
- OKRs: ${JSON.stringify(okrs)}
- Signals: ${JSON.stringify(signals)}
- Pulse: ${JSON.stringify(pulse)}

QUERY: "${query}"
`;

        // 3. Generate
        logger.info("Initializing GenAI...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        logger.info("Calling Gemini API...");
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        logger.info("Gemini Success. Length:", text.length);
        return { data: text };

    } catch (error) {
        logger.error("CRITICAL FAILURE:", {
            error: error.message,
            stack: error.stack,
            type: error.constructor.name
        });
        return {
            data: "Shadow CoS Offline. Neural Link Severed.",
            debug: error.message
        };
    }
});
