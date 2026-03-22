import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, User, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const DropdownSelector = ({ 
    items, 
    selectedId, 
    selectedIds = [], 
    onSelect, 
    multi = false, 
    triggerIcon, 
    triggerLabel,
    anchorEl 
}) => {
    if (!anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const isBottomSpace = window.innerHeight - rect.bottom > 200;
    
    return createPortal(
        <div  
            className="fixed z-50 bg-zinc-900 border border-zinc-700/50 shadow-2xl rounded-xl p-2 w-48 max-h-[250px] overflow-y-auto custom-scrollbar"
            style={{
                top: isBottomSpace ? rect.bottom + 8 : 'auto',
                bottom: !isBottomSpace ? window.innerHeight - rect.top + 8 : 'auto',
                left: rect.left,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2 px-2">Seleziona Stakeholder</div>
            {items.map(item => {
                const isSelected = multi ? selectedIds.includes(item.id) : selectedId === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-mono transition-colors ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-300 hover:bg-white/5'}`}
                    >
                        <div className={`w-3 h-3 rounded-full border border-indigo-500 flex items-center justify-center`}>
                           {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </div>
                        <span className="truncate">{item.name}</span>
                    </button>
                )
            })}
            {items.length === 0 && (
                <div className="text-zinc-500 text-xs px-2 py-4 text-center font-mono">Nessun dato</div>
            )}
        </div>,
        document.body
    );
};

export const AccountabilityColumn = ({ 
    items = [], 
    accountabilityData = [], 
    onAccountabilityChange 
}) => {
    const [stakeholders, setStakeholders] = useState([]);
    const [openDropdown, setOpenDropdown] = useState(null); // { itemId, type: 'owner' | 'support', el }
    const containerRef = useRef();

    useEffect(() => {
        const q = query(collection(db, 'stakeholders'));
        const unsub = onSnapshot(q, snap => {
            setStakeholders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));
        return () => unsub();
    }, []);

    useEffect(() => {
        const clickOutside = () => setOpenDropdown(null);
        window.addEventListener('click', clickOutside);
        return () => window.removeEventListener('click', clickOutside);
    }, []);

    const getItemData = (id) => {
        return accountabilityData.find(a => a.initiativeId === id) || { ownerId: null, supportIds: [] };
    };

    const handleSelect = (itemId, initiativeType, type, stakeholderId) => {
        const data = getItemData(itemId);
        let newOwner = data.ownerId;
        let newSupport = [...(data.supportIds || [])];

        if (type === 'owner') {
            newOwner = newOwner === stakeholderId ? null : stakeholderId; // Toggle
        } else {
            if (newSupport.includes(stakeholderId)) {
                newSupport = newSupport.filter(id => id !== stakeholderId);
            } else {
                newSupport.push(stakeholderId);
            }
        }

        onAccountabilityChange(itemId, initiativeType, newOwner, newSupport);
        
        if (type === 'owner') {
            setOpenDropdown(null);
        }
    };

    const getStakeholderName = (id) => {
        const s = stakeholders.find(x => x.id === id);
        return s ? s.name.split(' ')[0] : 'Unknown';
    };

    const openMenu = (e, itemId, type) => {
        e.stopPropagation();
        setOpenDropdown({ itemId, type, el: e.currentTarget });
    };

    return (
        <div className="h-full flex flex-col justify-between" ref={containerRef}>
            <div className="flex flex-col gap-2 flex-1 pt-2">
                <div className="text-[10px] font-mono text-zinc-500 text-center border-b border-white/5 pb-2 mb-1 uppercase tracking-widest">
                    Accountability
                </div>
                {items.map(item => {
                    // Determine initiative type based on where it came from in the parent array. 
                    // Parent provides tactical concatenated with KPI.
                    // We can assume if it has a `unit` or `target` it's a KPI, else Tactical.
                    const initiativeType = item.target !== undefined ? 'kpi' : 'tacticalPriority';
                    const data = getItemData(item.id);
                    
                    return (
                        <div key={item.id} className="min-h-[40px] flex items-center gap-2 group relative">
                            {/* Owner Select */}
                            <button
                                onClick={(e) => openMenu(e, item.id, 'owner')}
                                className="flex items-center justify-center gap-1.5 h-6 px-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-mono transition-colors min-w-[32px]"
                                title="Primary Responsibility (Owner)"
                            >
                                <span className="text-indigo-400 text-[10px] leading-none">●</span>
                                {data.ownerId && <span className="text-indigo-200 text-[10px] pr-1">{getStakeholderName(data.ownerId)}</span>}
                            </button>

                            {/* Supporters Select */}
                            <button
                                onClick={(e) => openMenu(e, item.id, 'support')}
                                className="flex items-center gap-1 min-h-[24px] px-1 rounded-full border border-dotted border-zinc-600 hover:border-zinc-400 hover:bg-white/5 transition-colors"
                                title="Secondary Responsibility (Supporters)"
                            >
                                <span className="text-zinc-500 text-[10px] pl-1">○</span>
                                {data.supportIds?.map(sid => (
                                    <div key={sid} className="bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        {getStakeholderName(sid)}
                                        <X className="w-2 h-2 cursor-pointer hover:text-red-400" onClick={(e) => {
                                             e.stopPropagation();
                                             handleSelect(item.id, initiativeType, 'support', sid);
                                        }} />
                                    </div>
                                ))}
                                {!data.supportIds?.length && <span className="w-3 h-3" />} {/* Empty spacer */}
                            </button>

                            {openDropdown?.itemId === item.id && openDropdown?.type === 'owner' && (
                                <DropdownSelector
                                    items={stakeholders}
                                    anchorEl={openDropdown.el}
                                    selectedId={data.ownerId}
                                    onSelect={(sid) => handleSelect(item.id, initiativeType, 'owner', sid)}
                                    triggerLabel="Owner"
                                />
                            )}
                            
                            {openDropdown?.itemId === item.id && openDropdown?.type === 'support' && (
                                <DropdownSelector
                                    items={stakeholders}
                                    anchorEl={openDropdown.el}
                                    selectedIds={data.supportIds}
                                    multi={true}
                                    onSelect={(sid) => handleSelect(item.id, initiativeType, 'support', sid)}
                                    triggerLabel="Supporters"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="text-[9px] font-mono text-zinc-500 flex flex-col gap-1 border-t border-white/5 pt-2 mt-4 opacity-50">
                <div className="flex items-center gap-1.5"><span className="text-emerald-500 text-[10px]">●</span> Relationship</div>
                <div className="flex items-center gap-1.5"><span className="text-indigo-400 text-[10px]">●</span> Primary responsibility</div>
                <div className="flex items-center gap-1.5"><span className="text-zinc-400 text-[10px]">○</span> Secondary responsibility</div>
            </div>
        </div>
    );
};
