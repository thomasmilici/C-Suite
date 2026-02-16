const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Initialize Gemini
// Note: GOOGLE_API_KEY must be set in Firebase functions secrets or environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.askShadowCoS = onRequest({ secrets: ["GOOGLE_API_KEY"] }, (req, res) => {
    cors(req, res, async () => {
        try {
            const { query } = req.body;
            logger.info("Shadow CoS received query:", query);

            // 1. Fetch REAL Context from Firestore
            // OKRs
            const okrsSnap = await admin.firestore().collection('okrs').where('status', '==', 'active').get();
            const okrs = okrsSnap.docs.map(d => ({ title: d.data().title, status: d.data().status, progress: d.data().progress }));

            // Signals (Risks)
            const signalsSnap = await admin.firestore().collection('signals').orderBy('createdAt', 'desc').limit(5).get();
            const signals = signalsSnap.docs.map(d => ({ text: d.data().text, level: d.data().level }));

            // Daily Focus (Pulse) - Get today's pulse
            const today = new Date().toISOString().split('T')[0];
            const pulseSnap = await admin.firestore().collection('daily_pulse').doc(today).get();
            const pulse = pulseSnap.exists ? pulseSnap.data().focus_items : [];

            // 2. System Prompt Construction
            const systemPrompt = `
SYSTEM ROLE: You are 'Shadow CoS', the strategic AI engine for "Quinta OS". You act as a Chief of Staff.
TONE: Executive, Concise, Strategic, No-nonsense.
DATA CONTEXT:
- **Active Strategy (OKRs)**: ${JSON.stringify(okrs)}
- **Risk Signals**: ${JSON.stringify(signals)}
- **Today's Focus**: ${JSON.stringify(pulse)}

USER QUERY: "${query}"

INSTRUCTIONS: 
- Answer the user's query using the provided context.
- Highlight misalignments between Today's Focus and Active Strategy.
- Flag risks from Signals that impact Strategy.
- Suggest concrete actions.
- If data is empty, note it professionally.
            `;

            logger.info("Sending prompt to Gemini...", systemPrompt);

            // 3. Call Gemini 2.0 Flash
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text();

            logger.info("Gemini response received.");

            res.status(200).json({ data: text });

        } catch (error) {
            logger.error("Error in askShadowCoS:", error);
            res.status(500).json({ error: "Neural Failure: " + error.message });
        }
    });
});
