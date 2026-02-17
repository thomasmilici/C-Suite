import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, X, Loader2, ChevronRight, AlertTriangle, CheckCircle, Minus, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

// ── PDF EXPORT ─────────────────────────────────────────────────────────────────
const generateDocNumber = () => {
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const r = Math.floor(Math.random() * 9000) + 1000;
    return `DEC-${ds}-${r}`;
};

const exportDecisionToPDF = (entry, adminName) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;
    const margin = 20;
    const contentW = W - margin * 2;
    const docNumber = entry.docNumber || generateDocNumber();
    const dateStr = entry.analyzedAt
        ? new Date(entry.analyzedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── COVER PAGE ────────────────────────────────────────────────────────────
    doc.setFillColor(5, 5, 8);
    doc.rect(0, 0, W, H, 'F');

    // Accent bar top
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, W, 2, 'F');

    // Logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('QUINTA', margin, 22);
    doc.setTextColor(80, 80, 120);
    doc.text(' OS', margin + 32, 22);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    doc.text('DECISION INTELLIGENCE LAYER', margin, 28);

    // Badge tipo documento
    const badgeX = margin;
    const badgeY = 48;
    doc.setFillColor(99, 102, 241, 0.15);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.3);
    doc.roundedRect(badgeX, badgeY, 52, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 210);
    doc.text('DECISION ANALYSIS REPORT', badgeX + 4, badgeY + 4.5);

    // Titolo decisione
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(entry.decision, contentW);
    doc.text(titleLines, margin, 72);
    const titleH = titleLines.length * 8;

    // Rationale se presente
    let cursorY = 72 + titleH + 4;
    if (entry.rationale) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 160);
        const rationaleLines = doc.splitTextToSize(`"${entry.rationale}"`, contentW);
        doc.text(rationaleLines, margin, cursorY);
        cursorY += rationaleLines.length * 5 + 6;
    }

    // Meta info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);
    doc.text(`Data analisi: ${dateStr}`, margin, cursorY + 6);
    doc.text(`Decision Maker: ${entry.decisionMaker || adminName || 'Admin'}`, margin, cursorY + 12);
    doc.text(`Documento: ${docNumber}`, margin, cursorY + 18);

    // Verdict badge
    const verdictY = cursorY + 32;
    const { color, label } = getVerdictMeta(entry.analysis);
    doc.setFillColor(...color, 0.1);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, verdictY, 40, 10, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(`VERDICT: ${label}`, margin + 3, verdictY + 6.5);

    // C-Suite Certification stamp
    const stampY = H - 60;
    doc.setDrawColor(60, 60, 90);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, stampY, contentW, 32, 3, 3, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 120);
    doc.text('C-SUITE CERTIFIED ANALYSIS', margin + 4, stampY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 80);
    doc.text('Questo documento è stato generato e validato da Quinta OS Decision Intelligence.', margin + 4, stampY + 13);
    doc.text(`Analisi AI: Shadow CoS v2 (Gemini 2.0 Flash) | Certificato per uso interno C-Suite.`, margin + 4, stampY + 18);
    doc.text(`Doc. N°: ${docNumber} | Prodotto il: ${dateStr} | Riservato e confidenziale.`, margin + 4, stampY + 23);
    if (adminName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(99, 102, 241);
        doc.text(`Autorizzato da: ${adminName}`, margin + 4, stampY + 28);
    }

    // Bottom accent
    doc.setFillColor(99, 102, 241);
    doc.rect(0, H - 2, W, 2, 'F');

    // ── CONTENT PAGES ─────────────────────────────────────────────────────────
    const addHeaderFooter = (pageNum) => {
        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, W, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 120);
        doc.text('QUINTA OS — DECISION INTELLIGENCE', margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 80);
        doc.text(docNumber, W - margin, 8, { align: 'right' });
        doc.setDrawColor(40, 40, 60);
        doc.setLineWidth(0.2);
        doc.line(margin, 10, W - margin, 10);

        // Footer
        doc.line(margin, H - 12, W - margin, 12);
        doc.setFontSize(6);
        doc.setTextColor(60, 60, 80);
        doc.text('RISERVATO — C-SUITE ONLY | Quinta OS Decision Intelligence', margin, H - 8);
        doc.text(`Pagina ${pageNum}`, W - margin, H - 8, { align: 'right' });
        doc.setFillColor(99, 102, 241);
        doc.rect(0, H - 2, W, 2, 'F');
    };

    doc.addPage();
    addHeaderFooter(2);

    // Analysis content
    let y = 18;
    const analysis = entry.analysis || '';
    const lines = analysis.split('\n');
    let pageNum = 2;

    for (const line of lines) {
        if (y > H - 20) {
            doc.addPage();
            pageNum++;
            addHeaderFooter(pageNum);
            y = 18;
        }

        const trimmed = line.trim();
        if (!trimmed) { y += 3; continue; }

        if (trimmed.startsWith('## ')) {
            y += 4;
            doc.setFillColor(20, 20, 35);
            doc.rect(margin - 2, y - 4, contentW + 4, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(130, 130, 210);
            doc.text(trimmed.replace('## ', '').toUpperCase(), margin, y + 1);
            y += 8;
        } else if (trimmed.startsWith('# ')) {
            y += 3;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(200, 200, 230);
            doc.text(trimmed.replace('# ', ''), margin, y);
            y += 7;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 200);
            const bullet = trimmed.replace(/^[-*] /, '');
            const wrapped = doc.splitTextToSize(`• ${bullet}`, contentW - 4);
            wrapped.forEach(wl => {
                if (y > H - 20) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin + 3, y);
                y += 5;
            });
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(200, 200, 230);
            const wrapped = doc.splitTextToSize(trimmed.replace(/\*\*/g, ''), contentW);
            wrapped.forEach(wl => {
                if (y > H - 20) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin, y);
                y += 5;
            });
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(160, 160, 180);
            const clean = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
            const wrapped = doc.splitTextToSize(clean, contentW);
            wrapped.forEach(wl => {
                if (y > H - 20) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin, y);
                y += 5;
            });
        }
    }

    const filename = `${docNumber}_${entry.decision.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.pdf`;
    doc.save(filename);
};

// ── VERDICT META ──────────────────────────────────────────────────────────────
const getVerdictMeta = (analysis = '') => {
    const upper = analysis.toUpperCase();
    if (upper.includes('A RISCHIO') || upper.includes('AT RISK')) return { color: [239, 68, 68], label: 'A RISCHIO', icon: 'risk' };
    if (upper.includes('ALLINEATA') || upper.includes('ALIGNED')) return { color: [16, 185, 129], label: 'ALLINEATA', icon: 'ok' };
    return { color: [245, 158, 11], label: 'NEUTRALE', icon: 'neutral' };
};

const VerdictBadge = ({ analysis }) => {
    const { color, label, icon } = getVerdictMeta(analysis);
    const [r, g, b] = color;
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
            style={{ background: `rgba(${r},${g},${b},0.12)`, color: `rgb(${r},${g},${b})`, border: `1px solid rgba(${r},${g},${b},0.3)` }}
        >
            {icon === 'ok' && <CheckCircle className="w-2.5 h-2.5" />}
            {icon === 'risk' && <AlertTriangle className="w-2.5 h-2.5" />}
            {icon === 'neutral' && <Minus className="w-2.5 h-2.5" />}
            {label}
        </span>
    );
};

// ── DECISION MODAL ────────────────────────────────────────────────────────────
const DecisionModal = ({ entry, onClose, adminName }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Modal header */}
            <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Decision Analysis</span>
                        <VerdictBadge analysis={entry.analysis} />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white leading-snug truncate">{entry.decision}</h3>
                    {entry.rationale && (
                        <p className="text-[10px] text-zinc-500 mt-1 italic">"{entry.rationale}"</p>
                    )}
                    <p className="text-[9px] text-zinc-700 mt-1">
                        {entry.decisionMaker} · {entry.analyzedAt ? new Date(entry.analyzedAt).toLocaleDateString('it-IT') : '—'} · {entry.docNumber}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => exportDecisionToPDF(entry, adminName)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 rounded-lg transition-all"
                    >
                        <Download className="w-3 h-3" /> Esporta PDF
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Analysis content */}
            <div className="flex-grow overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/5">
                <ReactMarkdown
                    className="prose prose-invert prose-sm max-w-none"
                    components={{
                        h2: ({ children }) => (
                            <h2 className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-widest border-b border-white/[0.05] pb-1 mb-2 mt-5 first:mt-0">{children}</h2>
                        ),
                        p: ({ children }) => (
                            <p className="text-xs text-zinc-300 leading-relaxed mb-2">{children}</p>
                        ),
                        li: ({ children }) => (
                            <li className="text-xs text-zinc-300 leading-relaxed">{children}</li>
                        ),
                        strong: ({ children }) => (
                            <strong className="text-zinc-100 font-semibold">{children}</strong>
                        ),
                    }}
                >
                    {entry.analysis}
                </ReactMarkdown>
            </div>
        </motion.div>
    </motion.div>
);

// ── NEW DECISION FORM ─────────────────────────────────────────────────────────
const NewDecisionForm = ({ onClose, onSuccess, isAdmin, adminName }) => {
    const [decision, setDecision] = useState('');
    const [rationale, setRationale] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (!decision.trim()) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const analyzeFn = httpsCallable(functions, 'analyzeDecision');
            const result = await analyzeFn({
                decision: decision.trim(),
                rationale: rationale.trim(),
                decisionMaker: adminName || 'Admin',
            });

            if (result.data?.data?.analysis) {
                const docNumber = generateDocNumber();
                const entry = {
                    ...result.data.data,
                    docNumber,
                };
                await addDoc(collection(db, 'decisions'), {
                    ...entry,
                    savedAt: serverTimestamp(),
                });
                onSuccess(entry);
            } else {
                setError("L'analisi non ha prodotto risultati. Riprova.");
            }
        } catch (e) {
            console.error('Decision analysis error:', e);
            setError('Errore nella connessione. Controlla e riprova.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="relative z-10 w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-mono font-bold text-white">Nuova Decisione</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">L'AI analizzerà la decisione nel contesto degli OKR e segnali attivi</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">
                            Decisione *
                        </label>
                        <textarea
                            value={decision}
                            onChange={e => setDecision(e.target.value)}
                            placeholder="Descrivi la decisione presa... (es. Investire €50k in una campagna marketing Q2)"
                            rows={3}
                            disabled={isAnalyzing}
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all resize-none disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">
                            Motivazione <span className="text-zinc-700">(opzionale)</span>
                        </label>
                        <textarea
                            value={rationale}
                            onChange={e => setRationale(e.target.value)}
                            placeholder="Perché è stata presa questa decisione?"
                            rows={2}
                            disabled={isAnalyzing}
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all resize-none disabled:opacity-50"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-red-900/10 border border-red-500/20 rounded-lg">
                            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] font-mono text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isAnalyzing}
                        className="flex-1 px-4 py-2.5 text-xs font-mono text-zinc-500 border border-white/[0.07] rounded-xl hover:bg-white/[0.03] transition-all disabled:opacity-40"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!decision.trim() || isAnalyzing}
                        className="flex-1 px-4 py-2.5 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analisi AI in corso...
                            </>
                        ) : (
                            <>
                                <BookOpen className="w-3 h-3" />
                                Analizza & Registra
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── MAIN TILE ─────────────────────────────────────────────────────────────────
export const TileDecisionLog = ({ isAdmin, adminName }) => {
    const [decisions, setDecisions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [activeDecision, setActiveDecision] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'decisions'), orderBy('savedAt', 'desc'), limit(10));
        const unsub = onSnapshot(q, snap => {
            setDecisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, err => {
            console.error('Firestore decisions error:', err);
        });
        return () => unsub();
    }, []);

    const handleSuccess = (entry) => {
        setShowForm(false);
        setActiveDecision(entry);
    };

    return (
        <>
            <div className="h-full flex flex-col p-7 relative">
                {/* Top highlight */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Decision Log
                    </h3>
                    {isAdmin && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 hover:text-white border border-white/[0.07] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-all"
                        >
                            <Plus className="w-3 h-3" /> Nuova
                        </button>
                    )}
                </div>

                {/* Decision list */}
                <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 space-y-2 pr-1">
                    {decisions.length > 0 ? (
                        <AnimatePresence>
                            {decisions.map((d, i) => (
                                <motion.button
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => setActiveDecision(d)}
                                    className="w-full flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <VerdictBadge analysis={d.analysis} />
                                            <span className="text-[9px] font-mono text-zinc-700">
                                                {d.analyzedAt ? new Date(d.analyzedAt).toLocaleDateString('it-IT') : '—'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors truncate leading-snug">
                                            {d.decision}
                                        </p>
                                        {d.decisionMaker && (
                                            <p className="text-[9px] text-zinc-700 mt-0.5">{d.decisionMaker}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-indigo-400 flex-shrink-0 ml-3 transition-colors" />
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-8">
                            <BookOpen className="w-6 h-6 text-zinc-800" />
                            <p className="text-[10px] font-mono text-zinc-700 tracking-widest uppercase">
                                {isAdmin ? 'Nessuna decisione registrata.' : 'Decision Log vuoto.'}
                            </p>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-1 text-[10px] font-mono text-indigo-500 hover:text-indigo-400 transition-colors"
                                >
                                    + Aggiungi la prima decisione
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom glow */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-500/[0.04] to-transparent rounded-tl-full pointer-events-none" />
            </div>

            {/* Modals via portal */}
            <AnimatePresence>
                {showForm && (
                    <NewDecisionForm
                        onClose={() => setShowForm(false)}
                        onSuccess={handleSuccess}
                        isAdmin={isAdmin}
                        adminName={adminName}
                    />
                )}
                {activeDecision && (
                    <DecisionModal
                        entry={activeDecision}
                        onClose={() => setActiveDecision(null)}
                        adminName={adminName}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
