import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, RotateCcw, Lightbulb, CheckCheck, Clock, Clipboard,
    ChevronDown, ChevronUp, Shuffle, Copy, Check
} from 'lucide-react';

// ── Retrospective Frameworks ───────────────────────────────────────────────────
const RETRO_FRAMEWORKS = [
    {
        id: 'start-stop-continue',
        name: 'Start / Stop / Continue',
        description: 'Classica retrospettiva di team su comportamenti e processi.',
        sections: ['Cosa iniziare a fare', 'Cosa smettere di fare', 'Cosa continuare a fare'],
    },
    {
        id: '4ls',
        name: '4Ls: Liked / Learned / Lacked / Longed for',
        description: 'Retrospettiva profonda con focus su apprendimento e desideri.',
        sections: ['Cosa ho apprezzato', 'Cosa ho imparato', 'Cosa è mancato', 'Cosa avrei voluto'],
    },
    {
        id: 'mad-sad-glad',
        name: 'Mad / Sad / Glad',
        description: 'Retrospettiva emotional intelligence-driven.',
        sections: ['Cosa mi ha frustrato', 'Cosa mi ha deluso', 'Cosa mi ha dato energia'],
    },
    {
        id: 'primed',
        name: 'PRIMED (C-Suite custom)',
        description: 'Framework di regia per CEO/COS: Priorità · Relazioni · Iniziative · Mosse · Esiti · Decisioni.',
        sections: ['Priorità mantenute?', 'Relazioni costruite?', 'Iniziative avanzate?', 'Mosse politiche fatte?', 'Esiti raggiunti?', 'Decisioni prese?'],
    },
];

// ── Decision Checklist questions ──────────────────────────────────────────────
const DECISION_CHECKLIST = [
    { id: 1, q: 'Ho ascoltato le voci critiche, non solo gli alleati?', group: 'Context' },
    { id: 2, q: 'Ho definito il problema in modo preciso (non il sintomo)?', group: 'Context' },
    { id: 3, q: 'Quali assunzioni sto facendo? Sono validate?', group: 'Bias check' },
    { id: 4, q: 'Sto navigando con bias di conferma?', group: 'Bias check' },
    { id: 5, q: 'Ho considerato almeno 3 alternative realistiche?', group: 'Alternatives' },
    { id: 6, q: 'Qual è il costo del non decidere?', group: 'Alternatives' },
    { id: 7, q: 'Chi vince e chi perde da questa decisione?', group: 'Stakeholders' },
    { id: 8, q: 'Ho verificato l\'allineamento con gli OKR prioritari?', group: 'Alignment' },
    { id: 9, q: 'É reversibile? Se sì, decido rapidamente. Se no, sono sicuro al 70%?', group: 'Reversibility' },
    { id: 10, q: 'Ho un piano di implementazione e un owner chiaro?', group: 'Execution' },
];

// ── Coaching Prompts ──────────────────────────────────────────────────────────
const COACHING_PROMPTS = [
    '🎯 Qual è la cosa più importante che NON stai affrontando questa settimana?',
    '⚡ Dove stai spendendo energia su cose che non cambiano l\'outcome?',
    '🛑 Quale conversazione stai evitando che dovresti fare entro 48h?',
    '🔭 Se guardi tra 6 mesi, questa decisione sarà stata giusta?',
    '🤝 Chi è il tuo alleato meno ovvio su questa battaglia?',
    '🧊 Qual è il rischio che nessuno osa nominare nella stanza?',
    '💡 Cosa sta rallentando la tua organizzazione che solo tu puoi sbloccare?',
    '📊 Stai guidando sulla strategia o stai gestendo il quotidiano?',
    '🌊 Dove stai nuotando contro la corrente inutilmente?',
    '🎭 In quale contesto stai recitando un ruolo invece di essere autentico?',
    '🔑 Qual è la decisione più difficile da prendere che, se presa, cambierebbe tutto?',
    '⏳ Cosa stai rimandando per paura di sbagliare?',
];

// ── Component: Copyable textarea ──────────────────────────────────────────────
function CopyTextarea({ value, rows = 4, placeholder }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative">
            <textarea value={value} readOnly rows={rows} placeholder={placeholder}
                className="w-full bg-zinc-950/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-300 resize-none font-mono focus:outline-none" />
            <button onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-white border border-white/[0.06] rounded-lg transition-all bg-black/40">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ToolboxPage = ({ user }) => {
    const [activeTab, setActiveTab] = useState('retro');
    const [selectedFramework, setSelectedFramework] = useState(RETRO_FRAMEWORKS[0]);
    const [retroAnswers, setRetroAnswers] = useState({});
    const [checkedItems, setCheckedItems] = useState({});
    const [currentPrompt, setCurrentPrompt] = useState(COACHING_PROMPTS[0]);
    const [promptHistory, setPromptHistory] = useState([0]);

    const setAnswer = (key, val) => setRetroAnswers(a => ({ ...a, [key]: val }));
    const toggleCheck = (id) => setCheckedItems(c => ({ ...c, [id]: !c[id] }));

    const randomPrompt = () => {
        let idx;
        do { idx = Math.floor(Math.random() * COACHING_PROMPTS.length); } while (idx === promptHistory[promptHistory.length - 1]);
        setCurrentPrompt(COACHING_PROMPTS[idx]);
        setPromptHistory(h => [...h.slice(-9), idx]);
    };

    const checklistScore = Object.values(checkedItems).filter(Boolean).length;
    const exportRetro = () => {
        const lines = [`# Retrospettiva — ${selectedFramework.name}`, `Data: ${new Date().toLocaleDateString('it-IT')}`, ''];
        selectedFramework.sections.forEach(sec => {
            lines.push(`## ${sec}`);
            lines.push(retroAnswers[sec] || '_(vuoto)_');
            lines.push('');
        });
        return lines.join('\n');
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white font-mono pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors text-xs">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
                        {[['retro', 'Retrospettiva'], ['checklist', 'Decision Check'], ['coaching', 'Coaching Prompts']].map(([t, label]) => (
                            <button key={t} onClick={() => setActiveTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap
                                    ${activeTab === t ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="w-20" />
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

                {/* ── Retrospettiva tab ──────────────────────────────────── */}
                {activeTab === 'retro' && (
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-2">Framework</label>
                            <div className="grid grid-cols-2 gap-2">
                                {RETRO_FRAMEWORKS.map(f => (
                                    <button key={f.id} onClick={() => { setSelectedFramework(f); setRetroAnswers({}); }}
                                        className={`p-3 rounded-xl border text-left transition-all
                                            ${selectedFramework.id === f.id ? 'border-indigo-600/60 bg-indigo-950/20 text-indigo-200' : 'border-white/[0.06] text-zinc-500 hover:border-white/[0.12]'}`}>
                                        <div className="text-xs font-bold mb-0.5">{f.name}</div>
                                        <div className="text-[10px] opacity-70 leading-relaxed">{f.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedFramework.sections.map((sec) => (
                                <div key={sec} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-2 font-bold">{sec}</label>
                                    <textarea rows={3} value={retroAnswers[sec] || ''} onChange={e => setAnswer(sec, e.target.value)}
                                        placeholder="Rifletti su..."
                                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/30 transition-all resize-none font-mono" />
                                </div>
                            ))}
                        </div>

                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                            <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-2">Esporta Retrospettiva</label>
                            <CopyTextarea value={exportRetro()} rows={6} placeholder="Compila i campi sopra per generare l'output..." />
                        </div>
                    </div>
                )}

                {/* ── Decision Checklist tab ─────────────────────────────── */}
                {activeTab === 'checklist' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-zinc-600">Usa questa checklist prima di ogni decisione importante.</p>
                            <span className={`text-xs font-mono px-3 py-1.5 rounded-full border font-bold
                                ${checklistScore === DECISION_CHECKLIST.length ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-400' :
                                    checklistScore >= 7 ? 'border-indigo-800/50 bg-indigo-950/20 text-indigo-400' :
                                        checklistScore >= 4 ? 'border-amber-800/50 bg-amber-950/20 text-amber-400' :
                                            'border-zinc-700 text-zinc-600'}`}>
                                {checklistScore}/{DECISION_CHECKLIST.length}
                            </span>
                        </div>

                        {['Context', 'Bias check', 'Alternatives', 'Stakeholders', 'Alignment', 'Reversibility', 'Execution'].map(group => {
                            const items = DECISION_CHECKLIST.filter(i => i.group === group);
                            return (
                                <div key={group} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-3 font-bold">{group}</div>
                                    <div className="space-y-2.5">
                                        {items.map(item => (
                                            <button key={item.id} onClick={() => toggleCheck(item.id)}
                                                className="w-full flex items-start gap-3 text-left group">
                                                <div className={`w-5 h-5 rounded-lg border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                                                    ${checkedItems[item.id] ? 'bg-emerald-600 border-emerald-500' : 'border-white/[0.12] group-hover:border-white/[0.25]'}`}>
                                                    {checkedItems[item.id] && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={`text-sm leading-relaxed transition-colors
                                                    ${checkedItems[item.id] ? 'text-zinc-600 line-through' : 'text-zinc-300 group-hover:text-white'}`}>
                                                    {item.q}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        <button onClick={() => setCheckedItems({})}
                            className="w-full py-3 border border-white/[0.06] rounded-xl text-xs text-zinc-600 hover:text-zinc-300 transition-all flex items-center justify-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5" /> Reset checklist
                        </button>
                    </div>
                )}

                {/* ── Coaching Prompts tab ───────────────────────────────── */}
                {activeTab === 'coaching' && (
                    <div className="space-y-5">
                        <p className="text-[10px] text-zinc-600">Domande per uscire dalla reattività e rientrare nella regia strategica.</p>

                        <motion.div key={currentPrompt}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-8 text-center min-h-40 flex items-center justify-center">
                            <p className="text-lg text-indigo-100 leading-relaxed max-w-xl font-light">{currentPrompt}</p>
                        </motion.div>

                        <button onClick={randomPrompt}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-indigo-800/40 text-indigo-400 text-sm font-mono rounded-xl hover:bg-indigo-950/20 transition-all">
                            <Shuffle className="w-4 h-4" /> Prossima domanda
                        </button>

                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                            <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-2">Tutte le domande</label>
                            <div className="space-y-2">
                                {COACHING_PROMPTS.map((p, i) => (
                                    <button key={i} onClick={() => setCurrentPrompt(p)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all
                                            ${currentPrompt === p ? 'bg-indigo-950/30 text-indigo-300 border border-indigo-800/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
