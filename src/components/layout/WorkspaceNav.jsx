import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutList, Layers, Users, Wrench, LayoutDashboard } from 'lucide-react';
import { todayId } from '../../services/dailyPlanService';
import { currentWeekId } from '../../services/weeklyPlanService';

export const WorkspaceNav = () => {
    const location = useLocation();

    // Helper for active state style
    const getNavLinkClass = ({ isActive }) => `
        px-3 py-1.5 rounded-md transition-colors 
        ${isActive
            ? 'bg-white/10 text-white shadow-[0_1px_8px_rgba(0,0,0,0.2)] border border-white/10'
            : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'}
    `;

    return (
        <div className="sticky top-14 z-20 w-full border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between overflow-x-auto no-scrollbar">

                {/* Navigation Groups */}
                <div className="flex items-center gap-6 min-w-max text-sm">

                    {/* Cockpit / Home */}
                    <NavLink to="/dashboard" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-mono tracking-wide text-[11px] flex items-center gap-2">
                        <LayoutDashboard className="w-3.5 h-3.5 opacity-70" />
                        <span>Cockpit</span>
                    </NavLink>

                    <div className="w-px h-4 bg-white/10" />

                    {/* Viste */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Viste:</span>
                        <NavLink to={`/steering/daily/${todayId()}`} className={getNavLinkClass}>
                            Giornaliero
                        </NavLink>
                        <NavLink to={`/steering/weekly/${currentWeekId()}`} className={getNavLinkClass}>
                            Settimanale
                        </NavLink>
                    </div>

                    <div className="w-px h-4 bg-white/10" />

                    {/* Moduli */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Moduli:</span>
                        <NavLink to="/themes" className={getNavLinkClass}>
                            Strategia
                        </NavLink>
                        <NavLink to="/stakeholder" className={getNavLinkClass}>
                            Stakeholder
                        </NavLink>
                        <NavLink to="/toolbox" className={getNavLinkClass}>
                            Strumenti
                        </NavLink>
                    </div>

                </div>
            </div>
        </div>
    );
};
