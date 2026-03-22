import React, { useState } from 'react';

export const CorrelationGrid = ({ 
    rowItems = [], 
    colItems = [], 
    correlations = [], 
    onCorrelationChange,
    fromType,
    toType,
    align = 'center' // 'bottom-right', 'bottom-left', 'top-right', 'top-left' to align the grid inside its cell
}) => {
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    if (!rowItems.length || !colItems.length) return null;

    const parseStrength = (fromId, toId) => {
        // Try both directions since correlations are basically bidirectional conceptually 
        // even if stored with a specific from/to
        const corr = correlations.find(c => 
            (c.fromId === fromId && c.toId === toId && c.fromType === fromType && c.toType === toType) ||
            (c.fromId === toId && c.toId === fromId && c.fromType === toType && c.toType === fromType)
        );
        return corr ? corr.strength : 'none';
    };

    const handleCellClick = (fromId, toId, currentStrength) => {
        const nextStrength = currentStrength === 'none' 
            ? 'strong' 
            : currentStrength === 'strong' 
                ? 'weak' 
                : 'none';
                
        onCorrelationChange(fromType, fromId, toType, toId, nextStrength);
    };

    let alignClass = "justify-center items-center";
    if (align === 'bottom-right') alignClass = "justify-end items-end";
    if (align === 'bottom-left') alignClass = "justify-start items-end";
    if (align === 'top-right') alignClass = "justify-end items-start";
    if (align === 'top-left') alignClass = "justify-start items-start";

    return (
        <div className={`w-full h-full flex ${alignClass}`}>
            <div 
                className="grid gap-[1px] bg-zinc-800 border border-zinc-700 rounded overflow-hidden"
                style={{
                    gridTemplateColumns: `repeat(${colItems.length}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rowItems.length}, minmax(0, 1fr))`
                }}
            >
                {rowItems.map((rowItem, rIdx) => (
                    colItems.map((colItem, cIdx) => {
                        const strength = parseStrength(rowItem.id, colItem.id);
                        const isHoveredCol = hoveredCol === cIdx;
                        const isHoveredRow = hoveredRow === rIdx;
                        const isCrosshair = isHoveredCol || isHoveredRow;

                        return (
                            <button
                                key={`${rowItem.id}-${colItem.id}`}
                                className={`
                                    w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center 
                                    bg-zinc-950 transition-colors duration-150
                                    ${isCrosshair ? 'bg-zinc-800' : 'hover:bg-zinc-900'}
                                `}
                                onMouseEnter={() => {
                                    setHoveredRow(rIdx);
                                    setHoveredCol(cIdx);
                                }}
                                onMouseLeave={() => {
                                    setHoveredRow(null);
                                    setHoveredCol(null);
                                }}
                                onClick={() => handleCellClick(rowItem.id, colItem.id, strength)}
                                title={`${rowItem.text} ↔ ${colItem.text}`}
                            >
                                {strength === 'strong' && (
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-cyan-500" />
                                )}
                                {strength === 'weak' && (
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-zinc-400" />
                                )}
                            </button>
                        );
                    })
                ))}
            </div>
        </div>
    );
};
