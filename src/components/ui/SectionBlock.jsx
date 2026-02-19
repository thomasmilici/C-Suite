import React from 'react';

export const SectionBlock = ({
    title,
    icon: Icon,
    children,
    className = "",
    action
}) => {
    return (
        <div className={`mb-6 last:mb-0 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-mono text-muted uppercase tracking-widest flex items-center gap-2">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {title}
                </h4>
                {action && (
                    <div>{action}</div>
                )}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
};
