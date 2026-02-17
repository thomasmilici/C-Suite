import React, { useState, useEffect } from 'react';
import { Zap, Search, FileSearch, ChevronRight, Loader2, X, ExternalLink, Download, BookOpen, Clock, AlertTriangle, BarChart2, Swords, Globe, Archive, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

const REPORT_PRESETS = [
    { label: 'Analisi Strategica', type: 'strategic', Icon: BarChart2, description: 'Executive summary, trend, implicazioni e raccomandazioni' },
    { label: 'Report Competitivo', type: 'competitive', Icon: Swords, description: 'Player, mosse competitor, opportunità e minacce' },
    { label: 'Market Intelligence', type: 'market', Icon: Globe, description: 'Dimensioni mercato, driver, barriere e posizionamento' },
];

const TYPE_LABELS = {
    strategic: 'Report Strategico',
    competitive: 'Analisi Competitiva',
    market: 'Market Intelligence',
};

const TYPE_COLORS = {
    strategic: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
    competitive: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
    market: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
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
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageW, 18, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('QUINTA OS', marginL, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(199, 195, 255);
    pdf.text('C-SUITE INTELLIGENCE PLATFORM', marginL, 16);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(199, 195, 255);
    pdf.text(docNumber, pageW - marginR, 12, { align: 'right' });
    pdf.setFillColor(79, 70, 229);
    pdf.rect(marginL - 3, 26, 1.5, 220, 'F');
    pdf.setFillColor(237, 233, 254);
    pdf.roundedRect(marginL, 32, 60, 8, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(79, 70, 229);
    pdf.text(TYPE_LABELS[report.reportType]?.toUpperCase() || 'INTELLIGENCE REPORT', marginL + 3, 37.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(15, 23, 42);
    const titleLines = pdf.splitTextToSize(report.topic, contentW);
    pdf.text(titleLines, marginL, 56);
    const metaY = 56 + titleLines.length * 10 + 4;
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(marginL, metaY, pageW - marginR, metaY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Data generazione:`, marginL, metaY + 8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(generatedDate, marginL + 36, metaY + 8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Preparato da:`, marginL, metaY + 15);
    pdf.setTextColor(15, 23, 42);
    pdf.text(adminName || 'Quinta OS System', marginL + 36, metaY + 15);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`N° Documento:`, marginL, metaY + 22);
    pdf.setFont('courier', 'bold');
    pdf.setTextColor(79, 70, 229);
    pdf.text(docNumber, marginL + 36, metaY + 22);
    const stampY = pageH - 65;
    pdf.setFillColor(237, 233, 254);
    pdf.setDrawColor(167, 139, 250);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(marginL, stampY, contentW, 38, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(79, 70, 229);
    pdf.text('✦  C-SUITE CERTIFIED INTELLIGENCE', marginL + 5, stampY + 8);
    pdf.setDrawColor(167, 139, 250);
    pdf.setLineWidth(0.2);
    pdf.line(marginL + 5, stampY + 11, marginL + contentW - 5, stampY + 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(79, 70, 229);
    pdf.text('Questo documento è stato generato da Quinta OS Intelligence Layer e certificato per uso interno C-Suite.', marginL + 5, stampY + 17);
    pdf.text(`Analisi condotta da: Shadow CoS v2 (Gemini 2.0 Flash + Google Search Grounding)`, marginL + 5, stampY + 23);
    pdf.text(`Doc. Rif.: ${docNumber}  ·  Classificazione: RISERVATO — USO INTERNO`, marginL + 5, stampY + 29);
    if (adminName) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(109, 40, 217);
        pdf.text(`Autorizzato da: ${adminName}`, marginL + 5, stampY + 35);
    }
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, pageH - 10, pageW, 10, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(199, 195, 255);
    pdf.text(`${docNumber}  ·  QUINTA OS  ·  CONFIDENZIALE & RISERVATO`, pageW / 2, pageH - 4, { align: 'center' });

    // ── CONTENT PAGES ───────────────────────────────────────────────────────
    const addHeaderFooter = (pageNum, totalPages) => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.setFillColor(79, 70, 229);
        pdf.rect(0, 0, pageW, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.setTextColor(255, 255, 255);
        pdf.text('QUINTA OS', marginL, 7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(199, 195, 255);
        pdf.text(`${docNumber}  ·  ${TYPE_LABELS[report.reportType] || 'INTELLIGENCE REPORT'}`, pageW / 2, 7, { align: 'center' });
        pdf.text(`${pageNum} / ${totalPages}`, pageW - marginR, 7, { align: 'right' });
        pdf.setFillColor(79, 70, 229);
        pdf.rect(marginL - 3, 12, 1.5, pageH - 24, 'F');
        pdf.setFillColor(79, 70, 229);
        pdf.rect(0, pageH - 10, pageW, 10, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(199, 195, 255);
        pdf.text(`Quinta OS Intelligence  ·  C-Suite Certified  ·  ${generatedDate}  ·  CONFIDENZIALE`, pageW / 2, pageH - 4, { align: 'center' });
    };

    pdf.addPage();
    const lines = pdf.splitTextToSize(
        report.content.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, ''),
        contentW
    );
    let y = 22;
    const lineH = 5;
    const contentPageH = pageH - 26;
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
        const isHeading = line.trim().match(/^(#{1,3}|[A-Z][A-Z\s]{4,}:)/);
        if (isHeading) {
            pdf.setFillColor(237, 233, 254);
            pdf.rect(marginL - 1, y - 4, contentW + 2, 6.5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(79, 70, 229);
            pdf.text(line.replace(/^#+\s*/, ''), marginL + 1, y);
            y += lineH + 3;
        } else {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(30, 41, 59);
            pdf.text(line, marginL, y);
            y += lineH;
        }
    });
    if (report.sources && report.sources.length > 0) {
        pdf.addPage();
        pageNum++;
        addHeaderFooter(pageNum, pageNum);
        pdf.setFillColor(237, 233, 254);
        pdf.rect(marginL - 1, 16, contentW + 2, 7, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(79, 70, 229);
        pdf.text('FONTI & RIFERIMENTI WEB', marginL + 1, 21);
        let sy = 30;
        report.sources.slice(0, 20).forEach((src, i) => {
            if (sy > contentPageH) return;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(79, 70, 229);
            pdf.text(`${i + 1}.`, marginL, sy);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(30, 64, 175);
            const uriLines = pdf.splitTextToSize(src.uri || '', contentW - 8);
            pdf.text(uriLines, marginL + 6, sy);
            if (src.title) {
                pdf.setTextColor(71, 85, 105);
                pdf.setFontSize(6.5);
                pdf.text(src.title, marginL + 6, sy + uriLines.length * 4 + 1);
            }
            sy += src.title ? uriLines.length * 4 + 8 : uriLines.length * 4 + 5;
        });
    }
    pdf.save(`${docNumber}_${report.topic.replace(/\s+/g, '_').slice(0, 30)}.pdf`);
};

// ── MODAL REPORT VIEWER ──────────────────────────────────────────────────────
const ReportModal = ({ report, onClose, adminName }) => {
    const [exporting, setExporting] = useState(false);
    const handleExport = async () => {
        setExporting(true);
        try { exportToPDF(report, adminName); }
        finally { setTimeout(() => setExporting(false), 1500); }
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
                <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/5">
                    <div className="prose prose-invert prose-sm max-w-none font-mono
                        prose-headings:text-zinc-200 prose-headings:font-bold prose-headings:tracking-tight
                        prose-h1:hidden
                        prose-h2:text-[11px] prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-indigo-300 prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:border-white/[0.06] prose-h2:pb-1
                        prose-p:text-zinc-300 prose-p:text-xs prose-p:leading-relaxed
                        prose-li:text-zinc-300 prose-li:text-xs prose-li:leading-relaxed
                        prose-strong:text-zinc-100
                        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown>{report.content}</ReactMarkdown>
                    </div>
                </div>
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

// ── ARCHIVE MODAL ────────────────────────────────────────────────────────────
const ArchiveModal = ({ onClose, adminName, onOpenReport }) => {
    const [allReports, setAllReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // id to confirm

    useEffect(() => {
        const q = query(collection(db, 'reports'), orderBy('savedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const valid = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => r.topic && r.content && r.content.length > 50);
            setAllReports(valid);
            setLoading(false);
        }, (err) => {
            console.error('Archive load error:', err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (reportId) => {
        setDeletingId(reportId);
        try {
            await deleteDoc(doc(db, 'reports', reportId));
            setConfirmDelete(null);
        } catch (e) {
            console.error('Delete error:', e);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-indigo-400" />
                        <div>
                            <h3 className="text-sm font-mono font-bold text-white">Archivio Intelligence Reports</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                {allReports.length} report{allReports.length !== 1 ? 's' : ''} salvati
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            <span className="text-xs font-mono text-zinc-500">Caricamento archivio...</span>
                        </div>
                    ) : allReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Archive className="w-8 h-8 text-zinc-800" />
                            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Nessun report in archivio</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence>
                                {allReports.map((r, i) => (
                                    <motion.div
                                        key={r.id}
                                        layout
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="group flex items-center gap-3 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                                    >
                                        {/* Info */}
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onOpenReport(r); onClose(); }}>
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[r.reportType] || 'text-zinc-400 border-white/10 bg-white/5'}`}>
                                                    {TYPE_LABELS[r.reportType] || 'Report'}
                                                </span>
                                                {r.docNumber && (
                                                    <span className="text-[9px] font-mono text-zinc-600">{r.docNumber}</span>
                                                )}
                                                {r.savedAt && (
                                                    <span className="text-[9px] font-mono text-zinc-700">
                                                        {new Date(r.savedAt.toDate?.() || r.savedAt).toLocaleDateString('it-IT')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors truncate">
                                                {r.topic}
                                            </p>
                                            {r.sources?.length > 0 && (
                                                <p className="text-[9px] text-zinc-700 mt-0.5">{r.sources.length} fonti web</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => exportToPDF(r, adminName)}
                                                title="Scarica PDF"
                                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            {confirmDelete === r.id ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-mono text-red-400">Confermi?</span>
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        disabled={deletingId === r.id}
                                                        className="px-2 py-1 text-[9px] font-mono text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all"
                                                    >
                                                        {deletingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sì'}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete(null)}
                                                        className="px-2 py-1 text-[9px] font-mono text-zinc-500 border border-white/[0.06] rounded-lg hover:bg-white/[0.04] transition-all"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDelete(r.id)}
                                                    title="Elimina report"
                                                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
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
    const [topicDialog, setTopicDialog] = useState(null);
    const [topicInput, setTopicInput] = useState('');
    const [showArchive, setShowArchive] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'reports'), orderBy('savedAt', 'desc'), limit(5));
        const unsub = onSnapshot(q, (snap) => {
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

    const handlePreset = (preset) => { setTopicDialog(preset); setTopicInput(''); };
    const handleDialogConfirm = () => {
        if (!topicInput.trim() || !topicDialog) return;
        const { type } = topicDialog;
        setTopicDialog(null);
        runGenerate(type, topicInput);
    };
    const handleCustomGenerate = () => { runGenerate('strategic', customTopic); };

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
                                <div>
                                    <p className="text-xs font-mono text-white font-bold">{topicDialog.label}</p>
                                    <p className="text-[10px] text-zinc-500">{topicDialog.description}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-zinc-300 font-mono mb-2">Su quale topic devo fare la ricerca?</p>
                            <input
                                autoFocus
                                type="text"
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDialogConfirm()}
                                placeholder="es. mercato SaaS italiano 2026..."
                                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all mb-3"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setTopicDialog(null)} className="flex-1 px-3 py-2 text-xs font-mono text-zinc-500 border border-white/[0.07] rounded-lg hover:bg-white/[0.04] transition-all">
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
                    <div className="flex items-center gap-2">
                        {isGenerating && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Ricerca...</span>
                            </div>
                        )}
                        <button
                            onClick={() => setShowArchive(true)}
                            title="Archivio completo"
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-zinc-500 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/20 bg-white/[0.02] hover:bg-indigo-500/5 rounded-lg transition-all"
                        >
                            <Archive className="w-3 h-3" />
                            Archivio
                        </button>
                    </div>
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
                            title={preset.description}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-indigo-500/[0.07] hover:border-indigo-500/20 transition-all group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5">
                                <preset.Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <div className="text-left">
                                    <p className="text-xs font-mono text-zinc-200 group-hover:text-white transition-colors">{preset.label}</p>
                                    <p className="text-[10px] text-zinc-500">{preset.description}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
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
                        className="flex-grow bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/40 transition-all disabled:opacity-40"
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
                                    title={`${TYPE_LABELS[r.reportType] || 'Report'} · ${r.docNumber || ''}`}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group text-left cursor-pointer"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-mono text-zinc-300 group-hover:text-white transition-colors truncate">
                                            {r.topic}
                                        </p>
                                        <p className="text-[9px] text-zinc-500">
                                            {TYPE_LABELS[r.reportType] || 'Report'} · {r.docNumber || '—'}
                                        </p>
                                    </div>
                                    <BookOpen className="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 flex-shrink-0 ml-2 transition-colors" />
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

            {/* Archive Modal */}
            <AnimatePresence>
                {showArchive && (
                    <ArchiveModal
                        onClose={() => setShowArchive(false)}
                        adminName={adminName}
                        onOpenReport={(r) => setActiveReport(r)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
