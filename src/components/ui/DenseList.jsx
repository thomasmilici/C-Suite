import React from 'react';

/**
 * A dense list component for displaying items in a compact way.
 * @param {Array} items - Array of items to display.
 * @param {Function} renderItem - Function to render each item.
 * @param {ReactNode} emptyState - Content to display when list is empty.
 * @param {string} maxHeight - Max height class (default: max-h-48).
 */
export const DenseList = ({
    items = [],
    renderItem,
    emptyState,
    maxHeight = "max-h-64",
    className = ""
}) => {
    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-white/5 rounded-lg bg-white/[0.01]">
                {emptyState || <span className="text-muted text-[10px] uppercase tracking-widest">No items</span>}
            </div>
        );
    }

    return (
        <div className={`overflow-y-auto ${maxHeight} scrollbar-thin scrollbar-thumb-white/10 space-y-1 ${className}`}>
            {items.map((item, index) => (
                <div key={item.id || index} className="group">
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
};
