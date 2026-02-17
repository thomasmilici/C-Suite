import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, BrainCircuit, Zap, BookOpen, BarChart2, Radio, FileText, Users, Lightbulb, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
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
Per ogni sezione (Strategic Themes, Daily Pulse, Risk Radar, Intelligence Reports, Daily Briefing, Decision Log, Shadow CoS) spiega: cosa è, a cosa serve, come si usa.

## Come iniziare
[3 azioni concrete da fare subito per un nuovo utente]

## Consigli pratici
[2-3 suggerimenti per usare l'app al meglio]`
    },
    { label: 'Analisi OKR', Icon: BarChart2, prompt: 'Analizza lo stato attuale degli OKR strategici. Identifica quelli a rischio e dimmi cosa fare concretamente.' },
    { label: 'Radar Rischi', Icon: Radio, prompt: 'Analizza i segnali di rischio registrati e dimmi quali sono le minacce più critiche da gestire oggi.' },
    { label: 'Briefing', Icon: FileText, prompt: 'Dammi un briefing rapido sulla situazione operativa attuale: OKR, rischi e focus del giorno.' },
    { label: 'Allineamento Team', Icon: Users, prompt: 'Come è allineato il team rispetto agli obiettivi strategici? Cosa dovrei comunicare o correggere?' },
    { label: 'Decisione Rapida', Icon: Lightbulb, prompt: 'Ho bisogno di prendere una decisione strategica. Analizza il contesto attuale e guidami.' },
];

const getInitialMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    return `**${greeting}. Shadow CoS online.**  \n${today} — sistema operativo. Come posso supportarti?`;
};

// UX-05: Load/save chat history from Firestore per user
const HISTORY_LIMIT = 20; // max messages saved

async function loadChatHistory(uid) {
    try {
        const snap = await getDoc(doc(db, 'shadow_cos_prefs', uid));
        if (snap.exists() && snap.data().history?.length > 0) {
            return snap.data().history;
        }
    } catch (_) {}
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
    } catch (_) {}
}

async function clearChatHistory(uid) {
    try {
        await setDoc(doc(db, 'shadow_cos_prefs', uid), { history: [], updatedAt: serverTimestamp() });
    } catch (_) {}
}

export const NeuralInterface = ({ onClose }) => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'ai', text: getInitialMessage() }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [uid, setUid] = useState(null);
    const scrollRef = useRef(null);

    // Get current user UID
    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) setUid(user.uid);
    }, []);

    // UX-05: Load persistent history on open
    useEffect(() => {
        if (!uid || historyLoaded) return;
        loadChatHistory(uid).then(history => {
            if (history && history.length > 0) {
                setMessages([
                    { id: 0, type: 'ai', text: getInitialMessage() },
                    ...history.map((m, i) => ({ id: i + 10, type: m.role === 'user' ? 'user' : 'ai', text: m.text }))
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
        setMessages([{ id: 1, type: 'ai', text: getInitialMessage() }]);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text: input };
        const currentMessages = [...messages, userMsg];
        setMessages(currentMessages);
        setInput("");
        setIsThinking(true);

        // Save user message to Firestore
        if (uid) await saveChatMessage(uid, { role: 'user', text: input });

        // Build history for AI (skip initial greeting)
        const history = currentMessages
            .slice(1, -1)
            .map(m => ({ role: m.type === 'user' ? 'user' : 'model', text: m.text }));

        try {
            const askShadow = httpsCallable(functions, 'askShadowCoS');
            const result = await askShadow({ query: input, history });
            const aiResponse = result.data.data;
            const aiText = aiResponse || "Analysis incomplete. Try clarifying intent.";

            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: aiText }]);

            // UX-05: Save AI response to Firestore
            if (uid) await saveChatMessage(uid, { role: 'model', text: aiText });

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'ai',
                text: "Neural link unstable. Retry or check connection."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-8 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-full sm:w-[500px] h-[80vh] sm:h-[620px] bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto relative"
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
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
                                    {historyLoaded && messages.length > 1 && (
                                        <span className="text-indigo-500 ml-1">· MEMORIA ATTIVA</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Clear history button */}
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
                <div className="flex-grow bg-black/50 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800" ref={scrollRef}>
                    {/* UX-05: Memory banner when history loaded */}
                    {historyLoaded && messages.length > 2 && (
                        <div className="flex justify-center">
                            <span className="text-[9px] font-mono text-indigo-500/60 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                ↑ conversazione precedente
                            </span>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed ${msg.type === 'user'
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
                            </div>
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
                <div className="px-4 pt-3 pb-1 bg-zinc-900/50 border-t border-zinc-800 flex flex-wrap gap-2">
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
                <div className="p-4 pt-2 bg-zinc-900/50">
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
