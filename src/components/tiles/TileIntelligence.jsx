import React, { useState, useEffect } from 'react';
import { Zap, Search, FileSearch, ChevronRight, Loader2, X, ExternalLink, Download, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

const REPORT_PRESETS = [
    { label: 'Analisi Strategica', type: 'strategic', icon: '📊', description: 'Executive summary, trend, implicazioni e raccomandazioni' },
    { label: 'Report Competitivo', type: 'competitive', icon: '⚔️', description: 'Player, mosse competitor, opportunità e minacce' },
    { label: 'Market Intelligence', type: 'market', icon: '🌐', description: 'Dimensioni mercato, driver, barriere e posizionamento' },
];

const TYPE_LABELS = {
    strategic: 'Report Strategico',
    competitive: 'Analisi Competitiva',
    market: 'Market Intelligence',
};

// Genera numero documento univoco
const generateDocNumber = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `RPT-${dateStr}-${rand}`;
};

// PDF export con certificazione C-Suite
const exportToPDF = (report, adminName) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;
    const docNumber = report.docNumber || generateDocNumber();
    const generatedDate = report.generatedAt
        ? new Date(report.generatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    pdf.setFillColor(5, 5, 8);
    pdf.rect(0, 0, pageW, pageH, 'F');

    // Accent line top
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, pageW, 2, 'F');

    // Logo area
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    pdf.text('QUINTA', marginL, 50);
    pdf.setTextColor(80, 80, 100);
    pdf.text(' OS', marginL + 50, 50);

    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 100);
    pdf.setFont('courier', 'normal');
    pdf.text('C-SUITE OPERATING SYSTEM', marginL, 57);

    // Horizontal separator
    pdf.setDrawColor(40, 40, 60);
    pdf.setLineWidth(0.3);
    pdf.line(marginL, 65, pageW - marginR, 65);

    // Report type badge
    pdf.setFillColor(99, 102, 241, 0.15);
    pdf.roundedRect(marginL, 75, 55, 8, 2, 2, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 130, 255);
    pdf.setFont('courier', 'bold');
    pdf.text(TYPE_LABELS[report.reportType]?.toUpperCase() || 'INTELLIGENCE REPORT', marginL + 4, 80.5);

    // Report title
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(220, 220, 230);
    const titleLines = pdf.splitTextToSize(report.topic, contentW);
    pdf.text(titleLines, marginL, 96);

    // Meta info
    const metaY = 96 + titleLines.length * 10 + 10;
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 110);
    pdf.text(`Generato: ${generatedDate}`, marginL, metaY);
    pdf.text(`Operatore: ${adminName?.toUpperCase() || 'QUINTA OS SYSTEM'}`, marginL, metaY + 6);
    pdf.text(`Documento: ${docNumber}`, marginL, metaY + 12);

    // C-Suite Certification Stamp
    const stampX = pageW - marginR - 55;
    const stampY = metaY - 8;
    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(stampX, stampY, 55, 28, 3, 3);
    pdf.setFontSize(6);
    pdf.setFont('courier', 'bold');
    pdf.setTextColor(150, 130, 255);
    pdf.text('C-SUITE CERTIFIED', stampX + 4, stampY + 7);
    pdf.setDrawColor(99, 102, 241, 0.3);
    pdf.setLineWidth(0.2);
    pdf.line(stampX + 3, stampY + 10, stampX + 52, stampY + 10);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(100, 100, 130);
    pdf.text('QUINTA OS INTELLIGENCE', stampX + 4, stampY + 15);
    pdf.text(docNumber, stampX + 4, stampY + 20);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(5);
    pdf.setTextColor(130, 110, 220);
    pdf.text('CERTIFICATO & VERIFICATO', stampX + 4, stampY + 25);

    // Decorative bottom element on cover
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, pageH - 2, pageW, 2, 'F');
    pdf.setFontSize(7);
    pdf.setFont('courier', 'normal');
    pdf.setTextColor(60, 60, 80);
    pdf.text(`${docNumber}  ·  QUINTA OS C-SUITE INTELLIGENCE  ·  CONFIDENZIALE`, pageW / 2, pageH - 6, { align: 'center' });

    // ── CONTENT PAGES ────────────────────────────────────────────────────────
    const addHeaderFooter = (pageNum, totalPages) => {
        // Header
        pdf.setFillColor(5, 5, 8);
        pdf.rect(0, 0, pageW, 14, 'F');
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, pageW, 1, 'F');
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(150, 130, 255);
        pdf.text('QUINTA OS', marginL, 9);
        pdf.setFont('courier', 'normal');
        pdf.setTextColor(70, 70, 90);
        pdf.text(`${docNumber}  ·  ${TYPE_LABELS[report.reportType] || 'INTELLIGENCE REPORT'}`, pageW / 2, 9, { align: 'center' });
        pdf.text(`${pageNum} / ${totalPages}`, pageW - marginR, 9, { align: 'right' });
        pdf.setDrawColor(30, 30, 45);
        pdf.setLineWidth(0.2);
        pdf.line(marginL, 13, pageW - marginR, 13);

        // Footer
        pdf.setFillColor(5, 5, 8);
        pdf.rect(0, pageH - 12, pageW, 12, 'F');
        pdf.setDrawColor(30, 30, 45);
        pdf.line(marginL, pageH - 11, pageW - marginR, pageH - 11);
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, pageH - 1, pageW, 1, 'F');
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(60, 60, 80);
        pdf.text(`Generato da Quinta OS  ·  C-Suite Certified  ·  ${generatedDate}`, pageW / 2, pageH - 5, { align: 'center' });
    };

    // Render content text
    pdf.addPage();
    const lines = pdf.splitTextToSize(
        report.content.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, ''),
        contentW
    );

    let y = 22;
    const lineH = 5;
    const contentPageH = pageH - 26; // leave space for header+footer
    let pageNum = 2;
    const totalEstimatedPages = Math.ceil(lines.length * lineH / (contentPageH - 22)) + 2;

    addHeaderFooter(pageNum, Math.max(totalEstimatedPages, pageNum));

    lines.forEach((line) => {
        if (y > contentPageH) {
            pdf.addPage();
            pageNum++;
            addHeaderFooter(pageNum, Math.max(totalEstimatedPages, pageNum));
            y = 22;
        }
        const isHeading = line.trim().match(/^(#{1,3}|[A-Z][A-Z\s]+:)/);
        pdf.setFont('courier', isHeading ? 'bold' : 'normal');
        pdf.setFontSize(isHeading ? 9 : 8);
        pdf.setTextColor(isHeading ? 200 : 140, isHeading ? 200 : 140, isHeading ? 220 : 160);
        pdf.text(line, marginL, y);
        y += isHeading ? lineH + 2 : lineH;
    });

    // Sources page if any
    if (report.sources && report.sources.length > 0) {
        pdf.addPage();
        pageNum++;
        addHeaderFooter(pageNum, pageNum);
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(150, 130, 255);
        pdf.text('FONTI & RIFERIMENTI', marginL, 26);
        pdf.setDrawColor(60, 60, 80);
        pdf.line(marginL, 29, pageW - marginR, 29);
        let sy = 36;
        report.sources.slice(0, 20).forEach((src, i) => {
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(120, 120, 150);
            pdf.text(`${i + 1}.`, marginL, sy);
            pdf.setTextColor(100, 120, 200);
            const uriLines = pdf.splitTextToSize(src.uri || '', contentW - 8);
            pdf.text(uriLines, marginL + 6, sy);
            if (src.title) {
                pdf.setTextColor(80, 80, 100);
                pdf.setFontSize(6);
                pdf.text(src.title, marginL + 6, sy + 4);
            }
            sy += src.title ? 10 : 7;
            if (sy > contentPageH) return;
        });
    }

    pdf.save(`${docNumber}_${report.topic.replace(/\s+/g, '_').slice(0, 30)}.pdf`);
};

// ── MODAL REPORT VIEWER ──────────────────────────────────────────────────────
const ReportModal = ({ report, onClose, adminName }) => {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            exportToPDF(report, adminName);
        } finally {
            setTimeout(() => setExporting(false), 1500);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col
                    bg-[#07070d]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl
                    shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]"
            >
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <FileSearch className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
                                {TYPE_LABELS[report.reportType] || 'Intelligence Report'}
                            </span>
                            {report.docNumber && (
                                <span className="text-[9px] font-mono text-zinc-600 ml-2">{report.docNumber}</span>
                            )}
                        </div>
                        <h2 className="text-base font-bold text-white font-mono truncate">{report.topic}</h2>
                        {report.generatedAt && (
                            <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                {new Date(report.generatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-mono transition-all disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {exporting ? 'Esportando...' : 'Esporta PDF'}
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/5">
                    <div className="prose prose-invert prose-sm max-w-none font-mono
                        prose-headings:text-zinc-200 prose-headings:font-bold prose-headings:tracking-tight
                        prose-h1:text-xs prose-h1:uppercase prose-h1:tracking-widest prose-h1:text-indigo-300 prose-h1:mb-4
                        prose-h2:text-xs prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-zinc-400 prose-h2:mt-6 prose-h2:mb-2
                        prose-p:text-zinc-400 prose-p:text-xs prose-p:leading-relaxed
                        prose-li:text-zinc-400 prose-li:text-xs prose-li:leading-relaxed
                        prose-strong:text-zinc-200
                        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown>{report.content}</ReactMarkdown>
                    </div>
                </div>

                {/* Sources */}
                {report.sources && report.sources.length > 0 && (
                    <div className="border-t border-white/[0.06] p-4">
                        <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mb-2">
                            {report.sources.length} fonte{report.sources.length > 1 ? 'i' : ''} web utilizzate
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {report.sources.slice(0, 8).map((source, i) => (
                                <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-mono text-zinc-600 hover:text-indigo-400 transition-colors max-w-[200px] truncate">
                                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{source.title || source.uri}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// ── MAIN TILE ────────────────────────────────────────────────────────────────
export const TileIntelligence = ({ adminName }) => {
    const [customTopic, setCustomTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeReport, setActiveReport] = useState(null);
    const [recentReports, setRecentReports] = useState([]);
    const [error, setError] = useState(null);
    // Dialog per topic preset
    const [topicDialog, setTopicDialog] = useState(null); // { preset } oppure null
    const [topicInput, setTopicInput] = useState('');

    // Load recent reports from Firestore (ordinati per savedAt)
    useEffect(() => {
        const q = query(collection(db, 'reports'), orderBy('savedAt', 'desc'), limit(5));
        const unsub = onSnapshot(q, (snap) => {
            // Filtra documenti che hanno un content valido (almeno 100 char) e un topic
            const valid = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => r.topic && r.content && r.content.length > 100);
            setRecentReports(valid);
        }, (err) => {
            console.error('Firestore reports error:', err);
        });
        return () => unsub();
    }, []);

    const runGenerate = async (type, topic) => {
        if (!topic.trim()) return;
        setIsGenerating(true);
        setError(null);
        try {
            const researchFn = httpsCallable(functions, 'researchAndReport');
            const result = await researchFn({ topic: topic.trim(), reportType: type });
            if (result.data?.data && result.data.data.content) {
                const docNumber = generateDocNumber();
                const reportData = { ...result.data.data, docNumber };
                // Salva su Firestore
                await addDoc(collection(db, 'reports'), {
                    ...reportData,
                    savedAt: serverTimestamp(),
                });
                setActiveReport(reportData);
                setCustomTopic('');
            } else {
                setError('La generazione del report non ha prodotto contenuto. Riprova.');
            }
        } catch (e) {
            console.error('Research error:', e);
            setError('Errore nella generazione del report. Controlla la connessione e riprova.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Click su preset → apre dialog per inserire il topic specifico
    const handlePreset = (preset) => {
        setTopicDialog(preset);
        setTopicInput('');
    };

    // Conferma dal dialog
    const handleDialogConfirm = () => {
        if (!topicInput.trim() || !topicDialog) return;
        const { type } = topicDialog;
        setTopicDialog(null);
        runGenerate(type, topicInput);
    };

    // Genera da campo libero
    const handleCustomGenerate = () => {
        runGenerate('strategic', customTopic);
    };

    return (
        <>
            {/* Dialog per topic specifico */}
            <AnimatePresence>
                {topicDialog && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl" onClick={() => setTopicDialog(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-10 w-full max-w-xs bg-zinc-950 border border-white/[0.1] rounded-xl p-5 shadow-2xl"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">{topicDialog.icon}</span>
                                <div>
                                    <p className="text-xs font-mono text-white font-bold">{topicDialog.label}</p>
                                    <p className="text-[10px] text-zinc-500">{topicDialog.description}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mb-2">Su quale topic devo fare la ricerca?</p>
                            <input
                                autoFocus
                                type="text"
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDialogConfirm()}
                                placeholder="es. mercato SaaS italiano 2026..."
                                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-all mb-3"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTopicDialog(null)}
                                    className="flex-1 px-3 py-2 text-xs font-mono text-zinc-500 border border-white/[0.07] rounded-lg hover:bg-white/[0.04] transition-all"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleDialogConfirm}
                                    disabled={!topicInput.trim()}
                                    className="flex-1 px-3 py-2 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Genera Report
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="h-full flex flex-col p-6 relative">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" /> Intelligence Reports
                    </h3>
                    {isGenerating && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Ricerca in corso...</span>
                        </div>
                    )}
                </div>

                {/* Errore */}
                {error && (
                    <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-red-900/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] font-mono text-red-400 leading-relaxed">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Preset buttons */}
                <div className="space-y-2 mb-4">
                    {REPORT_PRESETS.map((preset) => (
                        <button
                            key={preset.type}
                            onClick={() => handlePreset(preset)}
                            disabled={isGenerating}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-indigo-500/[0.07] hover:border-indigo-500/20 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="text-base">{preset.icon}</span>
                                <div className="text-left">
                                    <p className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors">{preset.label}</p>
                                    <p className="text-[10px] text-zinc-600">{preset.description}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                        </button>
                    ))}
                </div>

                {/* Custom topic input */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomGenerate()}
                        placeholder="Topic personalizzato..."
                        disabled={isGenerating}
                        className="flex-grow bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/30 transition-all disabled:opacity-40"
                    />
                    <button
                        onClick={handleCustomGenerate}
                        disabled={!customTopic.trim() || isGenerating}
                        className="px-3 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Recent reports */}
                {recentReports.length > 0 ? (
                    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5" /> Report recenti
                        </p>
                        <div className="space-y-1.5">
                            {recentReports.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setActiveReport(r)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">
                                            {r.topic}
                                        </p>
                                        <p className="text-[9px] text-zinc-700">
                                            {TYPE_LABELS[r.reportType] || 'Report'} · {r.docNumber || '—'}
                                        </p>
                                    </div>
                                    <BookOpen className="w-3 h-3 text-zinc-700 group-hover:text-indigo-400 flex-shrink-0 ml-2 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    !isGenerating && (
                        <p className="text-[10px] font-mono text-zinc-700 text-center mt-2">
                            Nessun report ancora. Clicca un preset per iniziare.
                        </p>
                    )
                )}

                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-500/[0.04] to-transparent rounded-tl-full pointer-events-none" />
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {activeReport && (
                    <ReportModal
                        report={activeReport}
                        onClose={() => setActiveReport(null)}
                        adminName={adminName}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
