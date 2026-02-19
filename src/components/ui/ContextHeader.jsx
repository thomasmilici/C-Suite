import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ContextHeader = ({
    context = "PORTFOLIO", // PORTFOLIO | DOSSIER
    title,
    subtitle,
    backTo,
    actions
}) => {
    const navigate = useNavigate();

    return (
        <div className="mb-6">
            {/* Breadcrumb / Context Label */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                    {context}
                </span>

                {context === 'DOSSIER' && (
                    <>
                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                        <Link to="/dashboard" className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors uppercase tracking-wider">
                            Portfolio
                        </Link>
                    </>
                )}
            </div>

            {/* Title Row */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    {backTo && (
                        <button
                            onClick={() => navigate(backTo)}
                            className="group p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                        </button>
                    )}

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <div className="flex items-center gap-2 mt-1">
                                {subtitle}
                            </div>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};
