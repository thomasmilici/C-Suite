import React, { useState, useRef, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { X, Send, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useMission } from '../../context/MissionContext';

const functions = getFunctions();
// Step 1: The AI interviewer — stateless, no missionId required.
const startMissionOnboarding = httpsCallable(functions, 'startMissionOnboarding');
// Step 2: Creates the mission atomically (archives old ones, creates new).
const forceMissionSetup = httpsCallable(functions, 'forceMissionSetup');

export function OnboardingModal({ onClose }) {
    // We use setActiveMissionId from MissionContext to switch to the new mission
    // once forceMissionSetup returns. We do NOT depend on activeMissionId here —
    // we're creating the mission, so it doesn't exist yet.
    const { setActiveMissionId } = useMission();

    const [messages, setMessages] = useState([]); // {role: 'ai'|'user', text: string}
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [questionNum, setQuestionNum] = useState(0);
    const [committing, setCommitting] = useState(false); // forceMissionSetup in progress
    const bottomRef = useRef(null);

    // Start the AI interview on mount — no missionId needed.
    useEffect(() => {
        sendToAI([]);
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, committing]);

    // ── Step 1: AI interview turn ──────────────────────────────────────────────
    async function sendToAI(history) {
        setLoading(true);
        try {
            // No missionId sent — startMissionOnboarding is now a stateless interviewer.
            const result = await startMissionOnboarding({ messages: history });
            const data = result.data;

            if (data.done) {
                // Interview complete: the AI returned masterPrompt + layoutPreferences.
                // Hand off to Step 2 to atomically create the mission in Firestore.
                await commitMission(data.masterPrompt, data.layoutPreferences);
            } else if (data.question) {
                setMessages(prev => [...prev, { role: 'ai', text: data.question }]);
                setQuestionNum(prev => prev + 1);
            }
        } catch (err) {
            const msg = err?.code === 'functions/permission-denied'
                ? '⚠️ Permessi insufficienti: serve il ruolo COS o superiore.'
                : `⚠️ Errore di comunicazione: ${err.message}. Riprova.`;
            setMessages(prev => [...prev, { role: 'ai', text: msg }]);
        } finally {
            setLoading(false);
        }
    }

    // ── Step 2: Commit the mission to Firestore via forceMissionSetup ──────────
    // This runs atomically: archives any existing active missions, creates the new one.
    async function commitMission(masterPrompt, layoutPreferences) {
        setCommitting(true);
        setMessages(prev => [...prev, {
            role: 'ai',
            text: '⚙️ Mandato calibrato. Sto configurando la tua missione...',
        }]);
        try {
            const result = await forceMissionSetup({ masterPrompt, layoutPreferences });
            const { missionId } = result.data;

            // Switch MissionContext to the newly created mission.
            // The snapshot listener in MissionContext will pick up the new doc automatically.
            setActiveMissionId(missionId);

            setDone(true);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: '✅ Mandato strategico calibrato. Il tuo Copilota AI è ora pronto.',
            }]);
        } catch (err) {
            const msg = err?.code === 'functions/permission-denied'
                ? '⚠️ Permessi insufficienti per creare la missione.'
                : `⚠️ Errore nella creazione della missione: ${err.message}. Riprova.`;
            setMessages(prev => [...prev, { role: 'ai', text: msg }]);
        } finally {
            setCommitting(false);
        }
    }

    async function handleSend() {
        if (!input.trim() || loading || committing || done) return;
        const userText = input.trim();
        setInput('');
        const nextHistory = [...messages, { role: 'user', text: userText }];
        setMessages(nextHistory);
        await sendToAI(nextHistory);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const isbusy = loading || committing;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-[#0d0f1e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#101325]/80">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Setup Mandato Strategico</h3>
                            {!done && (
                                <p className="text-[10px] font-mono text-white/30">
                                    Domanda {Math.min(questionNum, 3)} di 3
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                {!done && (
                    <div className="h-0.5 bg-white/5 mx-6 mt-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500/60 rounded-full transition-all duration-500"
                            style={{ width: `${(Math.min(questionNum, 3) / 3) * 100}%` }}
                        />
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto thin-scroll px-6 py-4 flex flex-col gap-4">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'ai'
                                ? 'bg-[#161b2b] border border-white/5 text-white/80 rounded-tl-sm'
                                : 'bg-indigo-600/80 text-white rounded-tr-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Loading spinner (interview turn) */}
                    {loading && !committing && (
                        <div className="flex justify-start">
                            <div className="bg-[#161b2b] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                <span className="text-[11px] font-mono text-white/30">Il Copilota sta elaborando...</span>
                            </div>
                        </div>
                    )}

                    {/* Committing spinner (forceMissionSetup) */}
                    {committing && (
                        <div className="flex justify-start">
                            <div className="bg-[#161b2b] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                                <span className="text-[11px] font-mono text-white/30">Configurazione missione in corso...</span>
                            </div>
                        </div>
                    )}

                    {done && (
                        <div className="flex justify-center mt-4">
                            <div className="flex flex-col items-center gap-3 text-center p-6">
                                <CheckCircle className="w-10 h-10 text-emerald-400" />
                                <p className="text-sm font-semibold text-white">Mandato Calibrato</p>
                                <p className="text-xs text-white/40 max-w-xs">Il dashboard si aggiornerà automaticamente con il layout ottimale per la tua missione.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-2 px-5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                                >
                                    Vai al Cockpit
                                </button>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                {!done && (
                    <div className="px-6 py-4 border-t border-white/5 flex gap-3 items-end">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Scrivi la tua risposta..."
                            rows={2}
                            disabled={isbusy}
                            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors font-mono resize-none disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isbusy || !input.trim()}
                            className="p-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
