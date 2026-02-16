const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Note: Vertex AI is commented out until billing/API is confirmed.
// const { VertexAI } = require("@google-cloud/vertexai");

admin.initializeApp();

exports.askShadowCoS = onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // 1. Auth Headers Check (Optional for tight security, skipped for speed here)

            const { query } = req.body;
            logger.info("Shadow CoS received query:", query);

            // 2. Fetch REAL Context from Firestore
            // OKRs
            const okrsSnap = await admin.firestore().collection('okrs').where('status', '==', 'active').get();
            const okrs = okrsSnap.docs.map(d => ({ title: d.data().title, progress: d.data().progress }));

            // Signals (Risks)
            const signalsSnap = await admin.firestore().collection('signals').orderBy('createdAt', 'desc').limit(5).get();
            const signals = signalsSnap.docs.map(d => ({ text: d.data().text, level: d.data().level }));

            // Daily Focus (Pulse) - Get today's pulse
            const today = new Date().toISOString().split('T')[0];
            const pulseSnap = await admin.firestore().collection('daily_pulse').doc(today).get();
            const pulse = pulseSnap.exists ? pulseSnap.data().focus_items : [];

            // 3. System Prompt Construction
            const systemPrompt = `
SYSTEM ROLE: You are 'Shadow CoS', the strategic AI engine for Quinta OS.
CONTEXT:
- **Active Strategy (OKRs)**: ${JSON.stringify(okrs)}
- **Risk Signals**: ${JSON.stringify(signals)}
- **Today's Focus**: ${JSON.stringify(pulse)}

USER QUERY: "${query}"

INSTRUCTIONS: 
- Synthesize the above data. 
- Highlight misalignments between Today's Focus and Active Strategy.
- Flag risks from Signals that impact Strategy.
- Be concise, professional, and executive (C-Suite tone).
            `;

            logger.info("System Prompt Constructed (Internal):", systemPrompt);

            // 4. Simulated AI Response (Since we don't have Vertex AI active yet)
            // We simulate a smart response by manually checking the data we just fetched.

            let simulatedResponse = `**[Shadow CoS Analysis]**\n\n`;

            if (okrs.length === 0) {
                simulatedResponse += `*Alert*: No Active Strategic Themes found. Prioritize defining OKRs immediately.\n`;
            } else {
                simulatedResponse += `**Strategy Alignment**: Tracking ${okrs.length} active objectives.\n`;
            }

            if (signals.some(s => s.level === 'high')) {
                const highRisk = signals.find(s => s.level === 'high');
                simulatedResponse += `\n**CRITICAL RISK**: Detected high-level signal regarding "${highRisk.text}". Does this impact your current focus?\n`;
            }

            if (pulse.length > 0) {
                simulatedResponse += `\n**Daily Pulse**: You have ${pulse.length} items locked for today. Ensure they drive forward the "${okrs[0]?.title || 'Strategy'}" objective.`;
            } else {
                simulatedResponse += `\n**Action Required**: No Daily Focus set. The system detects a drift in execution discipline. Set your 3 targets now.`;
            }

            simulatedResponse += `\n\n*(Note: This analysis is based on live Firestore data, processed by the Shadow CoS Protocol).*`;

            res.status(200).json({ data: simulatedResponse });

        } catch (error) {
            logger.error("Error in askShadowCoS:", error);
            res.status(500).json({ error: "Internal Neural Failure" });
        }
    });
});
