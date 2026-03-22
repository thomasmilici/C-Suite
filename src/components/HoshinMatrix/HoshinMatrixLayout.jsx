import React, { useState } from 'react';
import { Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import { CorrelationGrid } from './CorrelationGrid';
import { AccountabilityColumn } from './AccountabilityColumn';

const CenterMatrixSVG = () => {
    return (
        <div className="w-full h-full relative border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-zinc-900/40">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {/* North Triangle (Tactical Priorities) - Blue/Indigo */}
                <polygon points="0,0 100,0 50,50" fill="currentColor" className="text-indigo-500/20" />
                <polygon points="0,0 100,0 50,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
                
                {/* East Triangle (KPIs) - Orange */}
                <polygon points="100,0 100,100 50,50" fill="currentColor" className="text-orange-500/20" />
                <polygon points="100,0 100,100 50,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
                
                {/* South Triangle (Long-Term Objectives) - Green */}
                <polygon points="0,100 100,100 50,50" fill="currentColor" className="text-emerald-500/20" />
                <polygon points="0,100 100,100 50,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
                
                {/* West Triangle (Annual Objectives) - Yellow/Amber */}
                <polygon points="0,0 0,100 50,50" fill="currentColor" className="text-amber-500/20" />
                <polygon points="0,0 0,100 50,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />

                {/* Diagonals / Borders */}
                <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-white/30" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-white/30" />
                
                {/* Center Circle */}
                <circle cx="50" cy="50" r="10" fill="#18181b" stroke="currentColor" strokeWidth="0.5" className="text-white/30" />
                <text x="50" y="52" fontSize="5" fill="currentColor" textAnchor="middle" className="text-white/60 font-mono font-bold">X</text>
            </svg>
            
            {/* Labels overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="absolute top-[15%] text-center text-indigo-300 font-mono font-bold text-[10px] uppercase tracking-widest max-w-[120px]">Top Level Priorities</span>
                <span className="absolute bottom-[15%] text-center text-emerald-300 font-mono font-bold text-[10px] uppercase tracking-widest max-w-[120px]">Long-Term Objectives</span>
                <span className="absolute left-[10%] text-center text-amber-300 font-mono font-bold text-[10px] uppercase tracking-widest -rotate-90 origin-center min-w-[140px]">Annual Objectives</span>
                <span className="absolute right-[10%] text-center text-orange-300 font-mono font-bold text-[10px] uppercase tracking-widest rotate-90 origin-center min-w-[140px]">Metrics To Improve</span>
            </div>
        </div>
    );
};

const SectionList = ({ items, onAdd, onDelete, section, vertical = false, correlations = [] }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItemText, setNewItemText] = useState("");

    const handleAdd = (e) => {
        e.preventDefault();
        if (newItemText.trim()) {
            onAdd(section, newItemText.trim());
            setNewItemText("");
            setIsAdding(false);
        }
    };

    const isOrphan = (itemId) => {
        if (!correlations || correlations.length === 0) return true;
        return !correlations.some(c => c.fromId === itemId || c.toId === itemId);
    };

    const containerClasses = vertical 
        ? "flex flex-row gap-2 h-full items-end justify-center" 
        : "flex flex-col gap-2 w-full justify-center";

    const itemClasses = vertical
        ? "writing-vertical-rl flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 hover:bg-white/10 group min-w-[40px] h-[180px]"
        : "flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 hover:bg-white/10 group min-h-[40px]";

    const addBtnClasses = vertical
        ? "min-w-[40px] h-[180px] writing-vertical-rl flex items-center justify-center rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white hover:bg-white/5 hover:border-white/40 transition-colors"
        : "w-full p-2 flex items-center justify-center rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white hover:bg-white/5 hover:border-white/40 transition-colors";

    return (
        <div className={containerClasses}>
            {items?.map((item, idx) => {
                const orphan = isOrphan(item.id);
                return (
                    <div key={item.id} className={`${itemClasses} ${orphan ? 'border-red-500/50' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-bold opacity-60">{idx + 1}.</span>
                            <span className={vertical ? "rotate-180" : ""}>{item.text}</span>
                            {orphan && (
                                <span title="Orphan item: no correlations mapped" className={`text-red-400 font-bold ${vertical ? 'rotate-90' : ''}`}>⚠</span>
                            )}
                        </div>
                        <button 
                            onClick={() => onDelete(section, item.id)}
                            className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-all ${vertical ? 'rotate-90' : ''}`}
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                );
            })}
            
            {isAdding ? (
                <form onSubmit={handleAdd} className={itemClasses}>
                    <div className="flex gap-2 w-full items-center">
                        <input 
                            autoFocus
                            type="text" 
                            className={`bg-black/50 border border-indigo-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono w-full ${vertical ? 'rotate-180 writing-vertical-rl h-[140px]' : ''}`}
                            placeholder="Descrizione..."
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onBlur={() => {
                                if(!newItemText.trim()) setIsAdding(false);
                            }}
                        />
                        <button type="submit" className="hidden" />
                    </div>
                </form>
            ) : (
                <button onClick={() => setIsAdding(true)} className={addBtnClasses}>
                    <Plus className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export const HoshinMatrixLayout = ({ 
    matrixData, 
    onAddItem, 
    onDeleteItem, 
    onCorrelationChange,
    onAccountabilityChange
}) => {
    if (!matrixData) return null;

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 overflow-x-auto">
            {/* The main 3x3 layout Grid */}
             <div className="min-w-[1200px] grid grid-cols-[300px_450px_1fr] grid-rows-[300px_450px_300px] gap-4" style={{
                /* Per le colonne: 
                 * col 1: Obiettivi Annuali (West) + eventuale correlazione = 300px
                 * col 2: Centro (SVG) + Tactical Priorities (North) + Long-term (South) = 450px
                 * col 3: KPIs (East) + Accountability = 1fr (il resto dello spazio)
                 * Le celle d'angolo conterranno le CorrelationGrid
                 */
             }}>
                 
                 {/* Row 1 */}
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-end justify-end">
                    {/* Top-Left Corner: North vs West Correlation */}
                    <CorrelationGrid 
                        rowItems={matrixData.annualObjectives} 
                        colItems={matrixData.tacticalPriorities} 
                        correlations={matrixData.correlations}
                        onCorrelationChange={onCorrelationChange}
                        fromType="annualObjective"
                        toType="tacticalPriority"
                        align="bottom-right"
                    />
                 </div>
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-end justify-center">
                     {/* North: Tactical Priorities */}
                     <SectionList 
                        items={matrixData.tacticalPriorities} 
                        onAdd={onAddItem} 
                        onDelete={onDeleteItem} 
                        section="tacticalPriorities" 
                        correlations={matrixData.correlations}
                    />
                 </div>
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-end justify-start">
                     {/* Top-Right Corner: North vs East Correlation */}
                     <CorrelationGrid 
                        rowItems={matrixData.tacticalPriorities} 
                        colItems={matrixData.kpis} 
                        correlations={matrixData.correlations}
                        onCorrelationChange={onCorrelationChange}
                        fromType="tacticalPriority"
                        toType="kpi"
                        align="bottom-left"
                    />
                 </div>

                 {/* Row 2 */}
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-center justify-end">
                     {/* West: Annual Objectives (Vertical) */}
                     <SectionList 
                        items={matrixData.annualObjectives} 
                        onAdd={onAddItem} 
                        onDelete={onDeleteItem} 
                        section="annualObjectives" 
                        vertical={true}
                        correlations={matrixData.correlations}
                    />
                 </div>
                 <div className="p-2">
                     {/* Center: The SVG Matrix */}
                     <CenterMatrixSVG />
                 </div>
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-center justify-start overflow-hidden">
                     {/* East: KPIs + Accountability */}
                     <div className="flex gap-4 w-full">
                         <div className="flex-1">
                            <SectionList 
                                items={matrixData.kpis} 
                                onAdd={onAddItem} 
                                onDelete={onDeleteItem} 
                                section="kpis" 
                                correlations={matrixData.correlations}
                            />
                         </div>
                         <div className="w-[180px] border-l border-white/10 pl-4">
                            <AccountabilityColumn 
                                items={matrixData.tacticalPriorities.concat(matrixData.kpis)}
                                accountabilityData={matrixData.accountability}
                                onAccountabilityChange={onAccountabilityChange}
                            />
                         </div>
                     </div>
                 </div>

                 {/* Row 3 */}
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-start justify-end">
                     {/* Bottom-Left Corner: South vs West Correlation */}
                     <CorrelationGrid 
                        rowItems={matrixData.longTermGoals} 
                        colItems={matrixData.annualObjectives} 
                        correlations={matrixData.correlations}
                        onCorrelationChange={onCorrelationChange}
                        fromType="longTermGoal"
                        toType="annualObjective"
                        align="top-right"
                    />
                 </div>
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-start justify-center">
                     {/* South: Long-term Objectives */}
                     <SectionList 
                        items={matrixData.longTermGoals} 
                        onAdd={onAddItem} 
                        onDelete={onDeleteItem} 
                        section="longTermGoals" 
                        correlations={matrixData.correlations}
                    />
                 </div>
                 <div className="border border-white/5 rounded-xl bg-zinc-900/20 p-4 flex items-start justify-start">
                     {/* Bottom-Right Corner: South vs East Correlation */}
                     <CorrelationGrid 
                        rowItems={matrixData.longTermGoals} 
                        colItems={matrixData.kpis} 
                        correlations={matrixData.correlations}
                        onCorrelationChange={onCorrelationChange}
                        fromType="longTermGoal"
                        toType="kpi"
                        align="top-left"
                    />
                 </div>
             </div>
        </div>
    );
};
