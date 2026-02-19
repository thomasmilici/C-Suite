import React from 'react';

export const TileHeader = ({
    title,
    icon: Icon,
    badge,
    actions,
    subtitle,
    className = ""
}) => {
    return (
        <div className={`flex items-start justify-between mb-4 ${className}`}>
            <div className="flex items-center gap-2 min-w-0">
                {Icon && (
                    <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
                <div className="min-w-0 flex flex-col">
                    <h3 className="tile-title flex items-center gap-2 truncate">
                        {title}
                        {badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-zinc-300">
                                {badge}
                            </span>
                        )}
                    </h3>
                    {subtitle && (
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate uppercase tracking-wider">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-1 -mr-1">
                    {actions}
                </div>
            )}
        </div>
    );
};
