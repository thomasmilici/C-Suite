import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Layers, Grid, Sparkles } from 'lucide-react';
import { todayId } from '../../services/dailyPlanService';
import { currentWeekId } from '../../services/weeklyPlanService';

export const BottomNav = ({ onAiClick }) => {
    const location = useLocation();

    // Check if we are inside a project (dossier) context to highlight correctly if needed
    // But mostly global nav items

    const navItems = [
        {
            to: '/dashboard',
            icon: LayoutDashboard,
            label: 'Home'
        },
        {
            to: `/steering/daily/${todayId()}`,
            icon: Calendar,
            label: 'Daily'
        },
        {
            to: `/steering/weekly/${currentWeekId()}`,
            icon: Grid,
            label: 'Weekly'
        },
        // We link to themes/toolbox or just a general menu? Using "Strumenti" -> Themes for now or Toolbox
        {
            to: '/toolbox',
            icon: Layers,
            label: 'Tools'
        },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050508]/95 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6 h-20 flex justify-between items-start">
            {/* Left Group */}
            {navItems.slice(0, 2).map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `
                        flex flex-col items-center gap-1 min-w-[3.5rem]
                        transition-colors duration-200
                        ${isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}
                    `}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`
                                p-1.5 rounded-xl transition-all
                                ${isActive ? 'bg-indigo-500/10' : 'bg-transparent'}
                            `}>
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-medium tracking-tight">
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}

            {/* Center AI Action */}
            <button
                onClick={onAiClick}
                className="relative -top-6 flex flex-col items-center gap-1 min-w-[3.5rem] group"
            >
                <div className="
                    w-14 h-14 rounded-full 
                    bg-gradient-to-br from-indigo-500 to-purple-600 
                    border-[3px] border-[#050508]
                    shadow-[0_4px_20px_rgba(99,102,241,0.4)]
                    flex items-center justify-center
                    text-white
                    transform transition-transform duration-200 active:scale-95
                ">
                    <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                    AI
                </span>
            </button>

            {/* Right Group */}
            {navItems.slice(2, 4).map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `
                        flex flex-col items-center gap-1 min-w-[3.5rem]
                        transition-colors duration-200
                        ${isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}
                    `}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`
                                p-1.5 rounded-xl transition-all
                                ${isActive ? 'bg-indigo-500/10' : 'bg-transparent'}
                            `}>
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-medium tracking-tight">
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </div>
    );
};
