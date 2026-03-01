import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { OnboardingModal } from '../modals/OnboardingModal';

export function OnboardingTaskTile({ missionName }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className="relative h-full rounded-2xl overflow-hidden border border-indigo-500/20 bg-[#0d0f1e] flex flex-col items-center justify-center p-8 text-center shadow-[0_0_60px_rgba(99,102,241,0.1),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>

                {/* Label */}
                <p className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-[0.2em] mb-2">
                    Setup Mandato Strategico
                </p>
                <h2 className="text-xl font-bold text-white mb-3">
                    {missionName ? `Benvenuto in «${missionName}»` : 'Sistema non calibrato'}
                </h2>
                <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
                    Il tuo Copilota AI non conosce ancora la tua visione, le tue priorità e il tuo stile di orchestrazione.
                    Un'intervista rapida di 3 domande è tutto ciò che serve.
                </p>

                {/* CTA */}
                <button
                    onClick={() => setOpen(true)}
                    className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/20 text-white font-semibold transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
                >
                    <span>Inizia il Setup</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Bottom label */}
                <p className="mt-6 text-[10px] font-mono text-white/20">
                    ~2 minuti · Ricalcolabile in qualsiasi momento
                </p>
            </div>

            {open && <OnboardingModal onClose={() => setOpen(false)} />}
        </>
    );
}
