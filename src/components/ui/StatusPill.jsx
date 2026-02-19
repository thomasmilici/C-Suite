import React from 'react';

const tones = {
    neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
};

const sizes = {
    sm: "px-1.5 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]"
};

export const StatusPill = ({
    children,
    tone = "neutral",
    size = "sm",
    className = ""
}) => {
    const toneClasses = tones[tone] || tones.neutral;
    const sizeClasses = sizes[size] || sizes.sm;

    return (
        <span
            className={`
                inline-flex items-center justify-center 
                font-mono font-medium rounded border 
                uppercase tracking-wide 
                ${toneClasses} 
                ${sizeClasses}
                ${className}
            `}
        >
            {children}
        </span>
    );
};
