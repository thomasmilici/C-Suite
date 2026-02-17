import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, X, Loader2, ChevronRight, AlertTriangle, CheckCircle, Minus, Download, Pencil, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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
    const { color: verdictColor, label: verdictLabel } = getVerdictMeta(entry.verdict || entry.analysis);

    // ── COVER PAGE ────────────────────────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, W, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('QUINTA OS', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(199, 195, 255);
    doc.text('DECISION INTELLIGENCE LAYER', margin, 16);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(docNumber, W - margin, 12, { align: 'right' });

    doc.setFillColor(79, 70, 229);
    doc.rect(margin - 3, 26, 1.5, 220, 'F');

    doc.setFillColor(237, 233, 254);
    doc.roundedRect(margin, 32, 60, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229);
    doc.text('DECISION ANALYSIS REPORT', margin + 3, 37.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(entry.decision, contentW);
    doc.text(titleLines, margin, 54);
    let cursorY = 54 + titleLines.length * 9 + 2;

    if (entry.rationale) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const rationaleLines = doc.splitTextToSize(`"${entry.rationale}"`, contentW);
        doc.text(rationaleLines, margin, cursorY);
        cursorY += rationaleLines.length * 5 + 4;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, cursorY + 2, W - margin, cursorY + 2);
    cursorY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Data analisi:', margin, cursorY);
    doc.setTextColor(15, 23, 42);
    doc.text(dateStr, margin + 34, cursorY);

    doc.setTextColor(100, 116, 139);
    doc.text('Decision Maker:', margin, cursorY + 7);
    doc.setTextColor(15, 23, 42);
    doc.text(entry.decisionMaker || adminName || 'Admin', margin + 34, cursorY + 7);

    doc.setTextColor(100, 116, 139);
    doc.text('N° Documento:', margin, cursorY + 14);
    doc.setFont('courier', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(docNumber, margin + 34, cursorY + 14);
    cursorY += 26;

    const [vr, vg, vb] = verdictColor;
    doc.setDrawColor(vr, vg, vb);
    doc.setLineWidth(0.5);
    doc.setFillColor(Math.min(vr + 180, 255), Math.min(vg + 180, 255), Math.min(vb + 180, 255));
    doc.roundedRect(margin, cursorY, 48, 11, 2, 2, 'F');
    doc.roundedRect(margin, cursorY, 48, 11, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(vr, vg, vb);
    doc.text(`VERDICT: ${verdictLabel}`, margin + 3, cursorY + 7.5);

    const stampY = H - 65;
    doc.setFillColor(237, 233, 254);
    doc.setDrawColor(167, 139, 250);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, stampY, contentW, 40, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229);
    doc.text('✦  C-SUITE CERTIFIED ANALYSIS', margin + 5, stampY + 8);
    doc.setDrawColor(167, 139, 250);
    doc.setLineWidth(0.2);
    doc.line(margin + 5, stampY + 11, margin + contentW - 5, stampY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229);
    doc.text('Documento generato e validato da Quinta OS Decision Intelligence Layer.', margin + 5, stampY + 17);
    doc.text('Analisi: Shadow CoS v2 (Gemini 2.0 Flash) | Certificato per uso interno C-Suite.', margin + 5, stampY + 23);
    doc.text(`Doc. Rif.: ${docNumber}  ·  Prodotto il: ${dateStr}  ·  Classificazione: RISERVATO`, margin + 5, stampY + 29);
    if (adminName) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(109, 40, 217);
        doc.text(`Autorizzato da: ${adminName}`, margin + 5, stampY + 36);
    }

    doc.setFillColor(79, 70, 229);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(199, 195, 255);
    doc.text(`${docNumber}  ·  QUINTA OS  ·  CONFIDENZIALE & RISERVATO`, W / 2, H - 4, { align: 'center' });

    // ── CONTENT PAGES ─────────────────────────────────────────────────────────
    const addHeaderFooter = (pageNum) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, W, H, 'F');
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, W, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('QUINTA OS — DECISION INTELLIGENCE', margin, 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(199, 195, 255);
        doc.text(docNumber, W - margin, 7, { align: 'right' });
        doc.setFillColor(79, 70, 229);
        doc.rect(margin - 3, 12, 1.5, H - 24, 'F');
        doc.setFillColor(79, 70, 229);
        doc.rect(0, H - 10, W, 10, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(199, 195, 255);
        doc.text(`RISERVATO — C-SUITE ONLY | Quinta OS Decision Intelligence`, margin, H - 4);
        doc.text(`Pagina ${pageNum}`, W - margin, H - 4, { align: 'right' });
    };

    doc.addPage();
    addHeaderFooter(2);

    let y = 18;
    const analysis = entry.analysis || '';
    const lines = analysis.split('\n');
    let pageNum = 2;

    for (const line of lines) {
        if (y > H - 18) {
            doc.addPage();
            pageNum++;
            addHeaderFooter(pageNum);
            y = 18;
        }
        const trimmed = line.trim();
        if (!trimmed) { y += 3; continue; }

        if (trimmed.startsWith('## ')) {
            y += 3;
            doc.setFillColor(237, 233, 254);
            doc.rect(margin - 1, y - 4, contentW + 2, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(79, 70, 229);
            doc.text(trimmed.replace('## ', '').toUpperCase(), margin, y + 1);
            y += 8;
        } else if (trimmed.startsWith('# ')) {
            y += 3;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(trimmed.replace('# ', ''), margin, y);
            y += 7;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            const bullet = trimmed.replace(/^[-*] /, '');
            const wrapped = doc.splitTextToSize(`• ${bullet}`, contentW - 4);
            wrapped.forEach(wl => {
                if (y > H - 18) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin + 3, y);
                y += 5;
            });
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            const wrapped = doc.splitTextToSize(trimmed.replace(/\*\*/g, ''), contentW);
            wrapped.forEach(wl => {
                if (y > H - 18) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin, y);
                y += 5;
            });
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            const clean = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
            const wrapped = doc.splitTextToSize(clean, contentW);
            wrapped.forEach(wl => {
                if (y > H - 18) { doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 18; }
                doc.text(wl, margin, y);
                y += 5;
            });
        }
    }

    const filename = `${docNumber}_${entry.decision.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.pdf`;
    doc.save(filename);
};

// ── VERDICT META ──────────────────────────────────────────────────────────────
const VERDICTS = [
    { key: 'aligned', keywords: ['allineata', 'aligned'], color: [16, 185, 129], label: 'ALLINEATA', icon: 'ok' },
    { key: 'risk', keywords: ['a rischio', 'at risk'], color: [239, 68, 68], label: 'A RISCHIO', icon: 'risk' },
    { key: 'neutral', keywords: ['neutrale', 'neutral'], color: [245, 158, 11], label: 'NEUTRALE', icon: 'neutral' },
];

const getVerdictMeta = (text = '', overrideVerdict = null) => {
    if (overrideVerdict) {
        const found = VERDICTS.find(v => v.key === overrideVerdict);
        if (found) return found;
    }
    const upper = text.toUpperCase();
    if (upper.includes('A RISCHIO') || upper.includes('AT RISK')) return VERDICTS[1];
    if (upper.includes('ALLINEATA') || upper.includes('ALIGNED')) return VERDICTS[0];
    return VERDICTS[2];
};

const VerdictBadge = ({ analysis, overrideVerdict }) => {
    const { color, label, icon } = getVerdictMeta(analysis, overrideVerdict);
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

// ── VERDICT SELECTOR ──────────────────────────────────────────────────────────
const VerdictSelector = ({ value, onChange }) => (
    <div className="flex gap-2">
        {VERDICTS.map(v => {
            const [r, g, b] = v.color;
            const isActive = value === v.key;
            return (
                <button
                    key={v.key}
                    onClick={() => onChange(v.key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono font-bold transition-all border"
                    style={{
                        background: isActive ? `rgba(${r},${g},${b},0.15)` : 'rgba(255,255,255,0.02)',
                        color: isActive ? `rgb(${r},${g},${b})` : 'rgb(113,113,122)',
                        borderColor: isActive ? `rgba(${r},${g},${b},0.4)` : 'rgba(255,255,255,0.06)',
                    }}
                >
                    {v.icon === 'ok' && <CheckCircle className="w-3 h-3" />}
                    {v.icon === 'risk' && <AlertTriangle className="w-3 h-3" />}
                    {v.icon === 'neutral' && <Minus className="w-3 h-3" />}
                    {v.label}
                </button>
            );
        })}
    </div>
);

// ── DECISION MODAL (view + edit saved) ───────────────────────────────────────
const DecisionModal = ({ entry, onClose, adminName, isAdmin }) => {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(entry.analysis || '');
    const [editVerdict, setEditVerdict] = useState(entry.verdict || null);
    const [saving, setSaving] = useState(false);

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'decisions', entry.id), {
                analysis: editText,
                verdict: editVerdict,
            });
            setEditing(false);
        } catch (e) {
            console.error('Edit save error:', e);
        } finally {
            setSaving(false);
        }
    };

    const entryForPDF = { ...entry, analysis: editText, verdict: editVerdict };

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
                className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Decision Analysis</span>
                            <VerdictBadge analysis={entry.analysis} overrideVerdict={editing ? editVerdict : entry.verdict} />
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
                        {isAdmin && !editing && (
                            <button
                                onClick={() => { setEditText(entry.analysis || ''); setEditVerdict(entry.verdict || null); setEditing(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-zinc-400 border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] rounded-lg transition-all"
                            >
                                <Pencil className="w-3 h-3" /> Modifica
                            </button>
                        )}
                        {isAdmin && editing && (
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 rounded-lg transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                {saving ? 'Salvo...' : 'Salva'}
                            </button>
                        )}
                        {isAdmin && editing && (
                            <button
                                onClick={() => setEditing(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-zinc-500 border border-white/[0.06] rounded-lg hover:bg-white/[0.03] transition-all"
                            >
                                Annulla
                            </button>
                        )}
                        {!editing && (
                            <button
                                onClick={() => exportDecisionToPDF(entryForPDF, adminName)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 rounded-lg transition-all"
                            >
                                <Download className="w-3 h-3" /> Esporta PDF
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Edit mode: verdict selector */}
                {editing && (
                    <div className="px-5 pt-4 pb-2">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Verdict</p>
                        <VerdictSelector value={editVerdict || getVerdictMeta(entry.analysis).key} onChange={setEditVerdict} />
                    </div>
                )}

                {/* Analysis content */}
                <div className="flex-grow overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/5">
                    {editing ? (
                        <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-full h-full min-h-[300px] bg-white/[0.02] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all resize-none"
                            placeholder="Testo analisi..."
                        />
                    ) : (
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
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── NEW DECISION FORM (with review step) ─────────────────────────────────────
const NewDecisionForm = ({ onClose, onSuccess, isAdmin, adminName }) => {
    const [step, setStep] = useState('input'); // 'input' | 'review'
    const [decision, setDecision] = useState('');
    const [rationale, setRationale] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    // Review step state
    const [aiResult, setAiResult] = useState(null);   // raw result from CF
    const [editedAnalysis, setEditedAnalysis] = useState('');
    const [selectedVerdict, setSelectedVerdict] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1: send to AI
    const handleAnalyze = async () => {
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
                const data = result.data.data;
                setAiResult(data);
                setEditedAnalysis(data.analysis);
                // Auto-detect verdict from AI text
                const meta = getVerdictMeta(data.analysis);
                setSelectedVerdict(meta.key);
                setStep('review');
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

    // Step 2: save to Firestore
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docNumber = generateDocNumber();
            const entry = {
                ...aiResult,
                analysis: editedAnalysis,
                verdict: selectedVerdict,
                docNumber,
                decision: decision.trim(),
                rationale: rationale.trim(),
                decisionMaker: adminName || 'Admin',
            };
            await addDoc(collection(db, 'decisions'), {
                ...entry,
                savedAt: serverTimestamp(),
            });
            onSuccess(entry);
        } catch (e) {
            console.error('Save decision error:', e);
            setError('Errore nel salvataggio. Riprova.');
            setIsSaving(false);
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
                        <h3 className="text-sm font-mono font-bold text-white">
                            {step === 'input' ? 'Nuova Decisione' : 'Rivedi Analisi AI'}
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                            {step === 'input'
                                ? "L'AI analizzerà la decisione nel contesto degli OKR e segnali attivi"
                                : 'Puoi modificare il testo e cambiare il verdict prima di salvare'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex px-5 pt-3 gap-2">
                    {['input', 'review'].map((s, i) => (
                        <div key={s} className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold transition-colors ${step === s || (s === 'input' && step === 'review') ? 'bg-indigo-600 text-white' : 'bg-white/[0.05] text-zinc-600'}`}>
                                {s === 'input' && step === 'review' ? '✓' : i + 1}
                            </div>
                            <span className={`text-[9px] font-mono uppercase tracking-wider ${step === s ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                {s === 'input' ? 'Input' : 'Review'}
                            </span>
                            {i < 1 && <div className="w-6 h-px bg-white/[0.1] mx-1" />}
                        </div>
                    ))}
                </div>

                {/* STEP 1: Input form */}
                {step === 'input' && (
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">Decisione *</label>
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
                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} disabled={isAnalyzing} className="flex-1 px-4 py-2.5 text-xs font-mono text-zinc-500 border border-white/[0.07] rounded-xl hover:bg-white/[0.03] transition-all disabled:opacity-40">
                                Annulla
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={!decision.trim() || isAnalyzing}
                                className="flex-1 px-4 py-2.5 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Analisi AI in corso...</>
                                ) : (
                                    <><BookOpen className="w-3 h-3" /> Analizza con AI</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Review & edit AI output */}
                {step === 'review' && (
                    <div className="p-5 space-y-4">
                        {/* Verdict selector */}
                        <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Verdict</label>
                            <VerdictSelector value={selectedVerdict} onChange={setSelectedVerdict} />
                        </div>

                        {/* Editable analysis */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Analisi AI</label>
                                <span className="text-[9px] font-mono text-zinc-600">Puoi modificare liberamente il testo</span>
                            </div>
                            <textarea
                                value={editedAnalysis}
                                onChange={e => setEditedAnalysis(e.target.value)}
                                rows={10}
                                className="w-full bg-white/[0.02] border border-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all resize-none"
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-900/10 border border-red-500/20 rounded-lg">
                                <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] font-mono text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setStep('input')} disabled={isSaving} className="px-4 py-2.5 text-xs font-mono text-zinc-500 border border-white/[0.07] rounded-xl hover:bg-white/[0.03] transition-all disabled:opacity-40">
                                ← Indietro
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editedAnalysis.trim()}
                                className="flex-1 px-4 py-2.5 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Salvataggio...</>
                                ) : (
                                    <><Save className="w-3 h-3" /> Salva Decisione</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
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
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

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
                                            <VerdictBadge analysis={d.analysis} overrideVerdict={d.verdict} />
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

                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-500/[0.04] to-transparent rounded-tl-full pointer-events-none" />
            </div>

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
                        isAdmin={isAdmin}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
