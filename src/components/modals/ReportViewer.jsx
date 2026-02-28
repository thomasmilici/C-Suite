import React, { useState } from 'react';
import { X, FileSearch, ExternalLink, Copy, Check, Download, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const REPORT_TYPE_LABELS = {
    strategic: 'Report Strategico',
    competitive: 'Analisi Competitiva',
    market: 'Market Intelligence',
};

export const ReportViewer = ({ report, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    const { content, sources = [], topic, reportType, generatedAt } = report;

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        try {
            await addDoc(collection(db, "reports"), {
                content,
                sources,
                topic,
                reportType,
                generatedAt,
                savedAt: serverTimestamp(),
            });
            setSaved(true);
        } catch (e) {
            console.error("Error saving report:", e);
        }
    };

    const date = generatedAt ? new Date(generatedAt).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col
                    bg-[#07070d]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl
                    shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]"
            >
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <FileSearch className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
                                {REPORT_TYPE_LABELS[reportType] || 'Intelligence Report'}
                            </span>
                        </div>
                        <h2 className="text-base font-bold text-white font-mono truncate">{topic}</h2>
                        {date && <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{date}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {/* Copy */}
                        <button onClick={handleCopy}
                            className={`p-2 rounded-lg border transition-all text-xs font-mono flex items-center gap-1.5 ${copied
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20'}`}>
                            {copied ? <><Check className="w-3 h-3" /> Copiato</> : <><Copy className="w-3 h-3" /> Copia</>}
                        </button>
                        {/* Save to DB */}
                        <button onClick={handleSave} disabled={saved}
                            className={`p-2 rounded-lg border transition-all text-xs font-mono flex items-center gap-1.5 ${saved
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-60'
                                : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20'}`}>
                            <BookOpen className="w-3 h-3" />
                            {saved ? 'Salvato' : 'Salva'}
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Report content */}
                <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/5">
                    <div className="prose prose-invert prose-sm max-w-none font-mono
                        prose-headings:text-zinc-200 prose-headings:font-bold prose-headings:tracking-tight
                        prose-h1:text-base prose-h1:uppercase prose-h1:tracking-widest prose-h1:text-xs prose-h1:text-indigo-300 prose-h1:mb-4
                        prose-h2:text-xs prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-zinc-400 prose-h2:mt-6 prose-h2:mb-2
                        prose-p:text-zinc-400 prose-p:text-xs prose-p:leading-relaxed
                        prose-li:text-zinc-400 prose-li:text-xs prose-li:leading-relaxed
                        prose-strong:text-zinc-200
                        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Sources footer */}
                {sources.length > 0 && (
                    <div className="border-t border-white/[0.06] p-4">
                        <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mb-2">
                            {sources.length} fonte{sources.length > 1 ? 'i' : ''} web utilizzate
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {sources.slice(0, 8).map((source, i) => (
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
