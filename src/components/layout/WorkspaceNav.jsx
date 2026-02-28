import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutList, Layers, Users, Wrench, LayoutDashboard } from 'lucide-react';
import { todayId } from '../../services/dailyPlanService';
import { currentWeekId } from '../../services/weeklyPlanService';

export const WorkspaceNav = () => {
    const location = useLocation();

    // Helper for active state style
    const getNavLinkClass = ({ isActive }) => `
        relative px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium uppercase tracking-wide transition-all duration-200
        flex items-center gap-2 group
        ${isActive
            ? 'bg-white/10 text-white shadow-[0_1px_8px_rgba(0,0,0,0.2)] border border-white/10'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'}
    `;

    return (
        <div className="sticky top-14 z-20 w-full border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between overflow-x-auto no-scrollbar">

                {/* Navigation Groups */}
                <div className="flex items-center gap-6 min-w-max">

                    {/* HOME: Cockpit */}
                    <NavLink to="/dashboard" className={getNavLinkClass}>
                        <LayoutDashboard className="w-3.5 h-3.5 opacity-70" />
                        <span>Cockpit</span>
                    </NavLink>

                    {/* Divider */}
                    <div className="w-px h-4 bg-white/10 transform rotate-12" />

                    {/* GROUP: OPERATIVITÀ */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mr-1">Operatività</span>

                        <NavLink to={`/steering/daily/${todayId()}`} className={getNavLinkClass}>
                            <CalendarDays className="w-3.5 h-3.5 opacity-70" />
                            <span>Giornaliero</span>
                        </NavLink>

                        <NavLink to={`/steering/weekly/${currentWeekId()}`} className={getNavLinkClass}>
                            <LayoutList className="w-3.5 h-3.5 opacity-70" />
                            <span>Settimanale</span>
                        </NavLink>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-4 bg-white/10 transform rotate-12" />

                    {/* GROUP: STRATEGIA */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mr-1">Strategia</span>

                        <NavLink to="/themes" className={getNavLinkClass}>
                            <Layers className="w-3.5 h-3.5 opacity-70" />
                            <span>Temi</span>
                        </NavLink>

                        <NavLink to="/stakeholder" className={getNavLinkClass}>
                            <Users className="w-3.5 h-3.5 opacity-70" />
                            <span>Stakeholder</span>
                        </NavLink>

                        <NavLink to="/toolbox" className={getNavLinkClass}>
                            <Wrench className="w-3.5 h-3.5 opacity-70" />
                            <span>Strumenti</span>
                        </NavLink>
                    </div>

                </div>
            </div>
        </div>
    );
};
