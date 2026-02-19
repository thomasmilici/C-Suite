import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const StickyActionBar = ({
    children,
    isVisible = true,
    height = "h-16"
}) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className={`
                        fixed bottom-20 left-4 right-4 z-40 
                        md:hidden
                        ${height}
                        bg-zinc-900/90 backdrop-blur-xl 
                        border border-white/10 rounded-2xl 
                        shadow-2xl shadow-black/50
                        flex items-center justify-between px-4
                    `}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
