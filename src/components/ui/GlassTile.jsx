import React from 'react';
import { motion } from 'framer-motion';

export const GlassTile = ({
    children,
    className = "",
    variant = "default", // default | dense | actionable
    padding, // optional padding override
    onClick,
    ...props
}) => {
    // Determine base classes based on variant
    const getBaseClasses = () => {
        const base = "rounded-2xl border transition-all duration-200 relative overflow-hidden";

        switch (variant) {
            case 'dense':
                return `${base} bg-zinc-900/40 border-white/[0.05] ${padding || 'p-3'}`;
            case 'actionable':
                return `${base} glass-tile actionable cursor-pointer hover:border-white/20 active:scale-[0.99] ${padding || 'p-4 sm:p-6'}`;
            case 'default':
            default:
                return `${base} glass-tile ${padding || 'p-4 sm:p-6'}`;
        }
    };

    const combinedClasses = `${getBaseClasses()} ${className}`;

    // If it's actionable/clickable, wrap in motion.div for subtle interaction
    if (onClick || variant === 'actionable') {
        return (
            <motion.div
                className={combinedClasses}
                onClick={onClick}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                {...props}
            >
                {children}
            </motion.div>
        );
    }

    return (
        <div className={combinedClasses} {...props}>
            {children}
        </div>
    );
};
