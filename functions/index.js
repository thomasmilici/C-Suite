const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { VertexAI } = require("@google-cloud/vertexai");

admin.initializeApp();

// Initialize Vertex AI (Mock/Stub for now, requires GCP project setup with billing)
// const vertex_ai = new VertexAI({project: 'quinta-os-manager', location: 'us-central1'});
// const model = vertex_ai.preview.getGenerativeModel({model: 'gemini-2.0-flash-001'});

exports.askShadowCoS = onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // 1. Auth Check (Basic implementation)
            // In a real scenario, verify ID token from Authorization header:
            // const idToken = req.headers.authorization?.split('Bearer ')[1];
            // const decodedToken = await admin.auth().verifyIdToken(idToken);

            const { query, context } = req.body;

            logger.info("Shadow CoS received query:", query);

            // 2. Fetch Context (OKRs, Tasks, Signals)
            const okrsSnap = await admin.firestore().collection('okrs').where('status', '==', 'active').get();
            const okrs = okrsSnap.docs.map(d => d.data());

            const signalsSnap = await admin.firestore().collection('signals').orderBy('createdAt', 'desc').limit(5).get();
            const signals = signalsSnap.docs.map(d => d.data());

            // 3. System Prompt construction
            const systemPrompt = `
        Sei 'Shadow CoS', l'AI strategica di Quinta. 
        Hai accesso ai dati operativi e strategici:
        - OKRs: ${JSON.stringify(okrs)}
        - Segnali: ${JSON.stringify(signals)}
        
        Il tuo obiettivo non è chattare, ma 'unire i puntini'.
        Segnala se i Task del team non sono allineati agli OKR.
        Incrocia i 'Segnali Deboli' con gli Stakeholder per prevedere rischi.
        Quando richiesto, genera Briefing Executive sintetici.
      `;

            // 4. Call Gemini (Simulated response for safety until billing/API check)
            // const result = await model.generateContent(systemPrompt + "\nUser Query: " + query);
            // const response = result.response.candidates[0].content.parts[0].text;

            const simulatedResponse = `[Neural Interface Simulation]\nAnalysing ${okrs.length} Active Strategies and ${signals.length} Weak Signals...\n\nBased on your query "${query}", I detect a potential misalignment in the 'Market Penetration' OKR. Recent signals suggest stakeholder hesitation. Recommend immediate review of Q2 priorities.`;

            res.status(200).json({ data: simulatedResponse });

        } catch (error) {
            logger.error("Error in askShadowCoS:", error);
            res.status(500).json({ error: "Internal Neural Failure" });
        }
    });
});
