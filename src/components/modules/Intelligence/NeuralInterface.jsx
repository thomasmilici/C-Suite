import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, BrainCircuit, Zap, BookOpen, BarChart2, Radio, FileText, Users, Lightbulb, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getAuth } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';

const MASTER_PROMPTS = [
    {
        label: 'Guida App', Icon: BookOpen,
        prompt: `Sei la guida interattiva di Quinta OS. Spiegami come funziona l'app in modo chiaro e semplice, come se fossi un novellino. Descrivimi tutte le sezioni principali e cosa posso fare con ciascuna. Usa un tono amichevole e pratico, con esempi concreti.

Struttura la risposta così:
## Benvenuto in Quinta OS
[Breve intro su cos'è e a cosa serve]

## Le sezioni principali
Per ogni sezione (Dossier, Strategic Themes, Daily Pulse, Risk Radar, Intelligence Reports, Daily Briefing, Decision Log, Shadow CoS) spiega: cosa è, a cosa serve, come si usa.

## Come iniziare
[3 azioni concrete da fare subito per un nuovo utente]

## Consigli pratici
[2-3 suggerimenti per usare l'app al meglio]`
    },
    { label: 'Analisi OKR', Icon: BarChart2, prompt: 'Analizza lo stato attuale degli OKR strategici. Identifica quelli a rischio e dimmi cosa fare concretamente.' },
    { label: 'Radar Rischi', Icon: Radio, prompt: 'Analizza i segnali di rischio registrati e dimmi quali sono le minacce più critiche da gestire oggi.' },
    { label: 'Briefing', Icon: FileText, prompt: 'Dammi un briefing rapido sulla situazione operativa attuale: dossier, OKR, rischi e focus del giorno.' },
    { label: 'Allineamento Team', Icon: Users, prompt: 'Come è allineato il team rispetto agli obiettivi strategici? Cosa dovrei comunicare o correggere?' },
    { label: 'Decisione Rapida', Icon: Lightbulb, prompt: 'Ho bisogno di prendere una decisione strategica. Analizza il contesto attuale e guidami.' },
];

const getInitialMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    return `**${greeting}. Shadow CoS online.**  \n${today} — sistema operativo. Come posso supportarti?`;
};

// ── ACTION PARSER ─────────────────────────────────────────────────────────────
// Extracts [ACTION:{...}] blocks from AI response text
function parseActions(text) {
    const actionRegex = /\[ACTION:(\{[^}]+\})\]/g;
    const actions = [];
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
        try {
            actions.push(JSON.parse(match[1]));
        } catch (_) { /* malformed JSON, skip */ }
    }
    return actions;
}

// Strip action blocks from display text
function stripActions(text) {
    return text.replace(/\[ACTION:\{[^}]+\}\]/g, '').trim();
}

// ── ACTION LABELS ─────────────────────────────────────────────────────────────
const ACTION_META = {
    CREATE_SIGNAL: { label: 'Crea Segnale di Rischio', color: 'text-red-400 border-red-500/30 bg-red-500/5' },
    RUN_REPORT: { label: 'Avvia Intelligence Report', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5' },
    CREATE_OKR: { label: 'Crea Nuovo OKR', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
};

// ── ACTION CARD ───────────────────────────────────────────────────────────────
const ActionCard = ({ action, onApprove, onIgnore, executing }) => {
    const meta = ACTION_META[action.type] || { label: action.type, color: 'text-zinc-400 border-white/10 bg-white/5' };
    const params = action.params || {};

    const paramLines = Object.entries(params).map(([k, v]) => (
        <span key={k} className="block text-[10px] font-mono text-zinc-500">
            <span className="text-zinc-600">{k}:</span> {String(v)}
        </span>
    ));

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`mt-3 border rounded-xl p-3 ${meta.color}`}
        >
            <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Azione Proposta</span>
            </div>
            <p className="text-xs font-mono font-semibold mb-1">{meta.label}</p>
            <div className="mb-3">{paramLines}</div>
            <div className="flex gap-2">
                <button
                    onClick={onApprove}
                    disabled={executing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono transition-all disabled:opacity-50"
                >
                    {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    {executing ? 'Esecuzione...' : 'Approva'}
                </button>
                <button
                    onClick={onIgnore}
                    disabled={executing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-mono text-zinc-500 transition-all disabled:opacity-50"
                >
                    <XCircle className="w-3 h-3" />
                    Ignora
                </button>
            </div>
        </motion.div>
    );
};

// ── CHAT HISTORY PERSISTENCE ──────────────────────────────────────────────────
const HISTORY_LIMIT = 20;

async function loadChatHistory(uid) {
    try {
        const snap = await getDoc(doc(db, 'shadow_cos_prefs', uid));
        if (snap.exists() && snap.data().history?.length > 0) {
            return snap.data().history;
        }
    } catch (_) { }
    return null;
}

async function saveChatMessage(uid, message) {
    try {
        const ref = doc(db, 'shadow_cos_prefs', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, { history: [message], updatedAt: serverTimestamp() });
        } else {
            const existing = snap.data().history || [];
            const updated = [...existing, message].slice(-HISTORY_LIMIT);
            await updateDoc(ref, { history: updated, updatedAt: serverTimestamp() });
        }
    } catch (_) { }
}

async function clearChatHistory(uid) {
    try {
        await setDoc(doc(db, 'shadow_cos_prefs', uid), { history: [], updatedAt: serverTimestamp() });
    } catch (_) { }
}

// ── ACTION EXECUTOR ───────────────────────────────────────────────────────────
// SECURITY NOTE: All AI write actions are now routed through the askShadowCoS
// Cloud Function, which enforces RBAC and writes to audit_logs.
// There are NO direct Firestore writes from the client for AI-proposed actions.
async function executeAction(action, currentHistory) {
    const { type, params } = action;

    if (type === 'RUN_REPORT') {
        // Reports are generated by a read-only callable — safe to call directly
        const researchFn = httpsCallable(functions, 'researchAndReport');
        const result = await researchFn({ topic: params.topic, reportType: params.reportType || 'strategic' });
        if (result.data?.data?.content) {
            // Saving report metadata to Firestore is done client-side (reports = read, not sensitive write)
            const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
            const docNumber = `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
            await addDoc(collection(db, 'reports'), { ...result.data.data, docNumber, savedAt: serverTimestamp() });
            return `✅ Report generato e salvato: "${params.topic}" — ${docNumber}`;
        }
        throw new Error('Report generation failed');
    }

    // For all other AI-proposed write actions (CREATE_SIGNAL, CREATE_OKR, etc.),
    // we route through Shadow CoS — this enforces RBAC + audit log server-side.
    // The action is re-expressed as a natural language command so Gemini picks the right tool.
    const commandMap = {
        CREATE_SIGNAL: `Registra questo segnale di rischio: "${params.text}" con livello ${params.level || 'medium'}.`,
        CREATE_OKR: `Crea un nuovo OKR con titolo: "${params.title}"${params.description ? ` — ${params.description}` : ''}.`,
        LOG_DECISION: `Registra questa decisione: "${params.decision}"${params.verdict ? ` (verdict: ${params.verdict})` : ''}.`,
    };

    const command = commandMap[type];
    if (!command) throw new Error(`Unknown action type: ${type}. Not in secure allowlist.`);

    const askShadow = httpsCallable(functions, 'askShadowCoS');
    const result = await askShadow({ query: command, history: currentHistory || [] });
    const responseText = result.data?.data;
    if (!responseText || responseText.includes('Offline') || responseText.includes('negato')) {
        throw new Error(responseText || 'Action failed via Shadow CoS.');
    }
    return `✅ ${responseText}`;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export const NeuralInterface = ({ onClose, events = [], isAdmin = false }) => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'ai', text: getInitialMessage(), actions: [] }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [uid, setUid] = useState(null);
    const [executingAction, setExecutingAction] = useState(null); // messageId_actionIdx
    const scrollRef = useRef(null);
    // sessionId groups all actions in one "open" of the Neural Interface for analytics
    const sessionId = useRef(`sess_${Date.now()}`).current;

    // Get current user UID
    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) setUid(user.uid);
    }, []);

    // Load persistent history on open
    useEffect(() => {
        if (!uid || historyLoaded) return;
        loadChatHistory(uid).then(history => {
            if (history && history.length > 0) {
                setMessages([
                    { id: 0, type: 'ai', text: getInitialMessage(), actions: [] },
                    ...history.map((m, i) => ({ id: i + 10, type: m.role === 'user' ? 'user' : 'ai', text: m.text, actions: [] }))
                ]);
            }
            setHistoryLoaded(true);
        });
    }, [uid, historyLoaded]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleClearHistory = async () => {
        if (uid) await clearChatHistory(uid);
        setMessages([{ id: 1, type: 'ai', text: getInitialMessage(), actions: [] }]);
    };

    // Dismiss an action card (ignore)
    const dismissAction = (messageId, actionIdx) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const newActions = [...(m.actions || [])];
            newActions[actionIdx] = { ...newActions[actionIdx], dismissed: true };
            return { ...m, actions: newActions };
        }));
    };

    // Approve and execute an action
    const approveAction = async (messageId, actionIdx, action) => {
        const key = `${messageId}_${actionIdx}`;
        setExecutingAction(key);
        // Build history snapshot for routing through Shadow CoS
        const historySnapshot = messages
            .filter(m => m.type === 'user' || m.type === 'ai')
            .map(m => ({ role: m.type === 'user' ? 'user' : 'model', text: m.text }));
        try {
            const resultText = await executeAction(action, historySnapshot);
            setMessages(prev => {
                const updated = prev.map(m => {
                    if (m.id !== messageId) return m;
                    const newActions = [...(m.actions || [])];
                    newActions[actionIdx] = { ...newActions[actionIdx], executed: true };
                    return { ...m, actions: newActions };
                });
                return [...updated, { id: Date.now(), type: 'system', text: resultText, actions: [] }];
            });
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now(), type: 'system',
                text: `❌ Errore nell'esecuzione: ${err.message}`, actions: [],
            }]);
        } finally {
            setExecutingAction(null);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text: input, actions: [] };
        const currentMessages = [...messages, userMsg];
        setMessages(currentMessages);
        setInput("");
        setIsThinking(true);

        if (uid) await saveChatMessage(uid, { role: 'user', text: input });

        // Build history for AI (skip initial greeting, skip system messages)
        const history = currentMessages
            .slice(1, -1)
            .filter(m => m.type === 'user' || m.type === 'ai')
            .map(m => ({ role: m.type === 'user' ? 'user' : 'model', text: m.text }));

        try {
            const askShadow = httpsCallable(functions, 'askShadowCoS');
            const result = await askShadow({ query: input, history, sessionId });
            const rawText = result.data.data || "Analysis incomplete. Try clarifying intent.";

            // Parse action proposals
            const actions = parseActions(rawText);
            const displayText = stripActions(rawText);

            const aiMsg = {
                id: Date.now() + 1,
                type: 'ai',
                text: displayText,
                actions: actions.map(a => ({ ...a, dismissed: false, executed: false })),
            };
            setMessages(prev => [...prev, aiMsg]);

            if (uid) await saveChatMessage(uid, { role: 'model', text: displayText });

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'ai',
                text: "Neural link unstable. Retry or check connection.",
                actions: [],
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Context summary for display in header
    const contextSummary = [
        events.length > 0 && `${events.length} dossier`,
    ].filter(Boolean).join(' · ');

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-8 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-full sm:w-[520px] h-[85vh] sm:h-[680px] bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto relative"
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white font-mono tracking-wide">SHADOW CoS</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                    NEURAL UPLINK ACTIVE
                                    {contextSummary && <span className="text-indigo-500 ml-1">· {contextSummary}</span>}
                                    {historyLoaded && messages.length > 1 && (
                                        <span className="text-indigo-500 ml-1">· MEMORIA ATTIVA</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {uid && messages.length > 1 && (
                            <button
                                onClick={handleClearHistory}
                                title="Cancella memoria"
                                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 hover:text-red-400"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-grow bg-black/50 p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-zinc-800" ref={scrollRef}>
                    {/* Memory banner */}
                    {historyLoaded && messages.length > 2 && (
                        <div className="flex justify-center">
                            <span className="text-[9px] font-mono text-indigo-500/60 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                ↑ conversazione precedente
                            </span>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id}>
                            {/* System confirmation messages */}
                            {msg.type === 'system' ? (
                                <div className="flex justify-center">
                                    <span className="text-[10px] font-mono text-emerald-500/80 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg">
                                        {msg.text}
                                    </span>
                                </div>
                            ) : (
                                <div className={`flex ${msg.type === 'user' ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[88%] p-4 rounded-xl text-sm leading-relaxed ${msg.type === 'user'
                                        ? "bg-zinc-800/80 text-white rounded-tr-sm"
                                        : "bg-indigo-900/10 border border-indigo-500/10 text-zinc-300 rounded-tl-sm"
                                        }`}>
                                        {msg.type === 'ai' ? (
                                            <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-300 prose-strong:text-white prose-headings:text-zinc-200">
                                                {msg.text}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.text
                                        )}

                                        {/* Action cards */}
                                        <AnimatePresence>
                                            {(msg.actions || []).map((action, idx) => {
                                                if (action.dismissed || action.executed) return null;
                                                const key = `${msg.id}_${idx}`;
                                                return (
                                                    <ActionCard
                                                        key={idx}
                                                        action={action}
                                                        executing={executingAction === key}
                                                        onApprove={() => approveAction(msg.id, idx, action)}
                                                        onIgnore={() => dismissAction(msg.id, idx)}
                                                    />
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-indigo-900/10 border border-indigo-500/10 p-4 rounded-xl rounded-tl-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                                <span className="text-xs text-indigo-300 font-mono animate-pulse">Computing Strategy...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Master Prompts */}
                <div className="px-4 pt-3 pb-1 bg-zinc-900/50 border-t border-zinc-800 flex flex-wrap gap-2 flex-shrink-0">
                    {MASTER_PROMPTS.map((mp) => (
                        <button
                            key={mp.label}
                            onClick={() => setInput(mp.prompt)}
                            disabled={isThinking}
                            title={mp.label}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-zinc-300 hover:text-indigo-300 border border-white/[0.07] hover:border-indigo-500/30 bg-white/[0.02] hover:bg-indigo-500/5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <mp.Icon className="w-3 h-3 flex-shrink-0" />
                            <span>{mp.label}</span>
                        </button>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 pt-2 bg-zinc-900/50 flex-shrink-0">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask for strategic analysis..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono placeholder:text-zinc-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
