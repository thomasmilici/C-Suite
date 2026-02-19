import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { WorkspaceNav } from './WorkspaceNav';
import { AiFab } from '../ui/AiFab';
import { NeuralInterface } from '../modules/Intelligence/NeuralInterface';
import { BottomNav } from '../ui/BottomNav';
import { AppCredits } from '../ui/AppCredits';

export const AppShell = ({ children, user, isAdmin }) => {
    const [showAi, setShowAi] = useState(false);
    const location = useLocation();

    // Determine if we should show the WorkspaceNav (Level 2)
    // Usually shown on dashboard and main feature pages
    const showWorkspaceNav = !location.pathname.includes('/login') &&
        !location.pathname.includes('/join');

    return (
        <div className="min-h-screen bg-[#050508] text-gray-200 font-sans selection:bg-zinc-800 relative">

            {/* Level 1 Header: Global */}
            <AppHeader user={user} isAdmin={isAdmin} />

            {/* Level 2 Header: Context Navigation */}
            {showWorkspaceNav && <WorkspaceNav />}

            {/* Main Content Area */}
            <div className="relative z-10">
                {children}
            </div>

            {/* AI Launcher (Desktop) - Keyline Anchored */}
            <AiFab
                onClick={() => setShowAi(true)}
                isProcessing={false} // Connect to actual AI state if available
            />

            {/* AI Interface Modal ( Global ) */}
            {showAi && (
                <NeuralInterface
                    onClose={() => setShowAi(false)}
                    isAdmin={isAdmin}
                    initiallyOpen={true}
                />
            )}

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <BottomNav onAiClick={() => setShowAi(true)} />
            </div>

            {/* Footer Credits (Global) */}
            <div className="fixed bottom-4 left-6 z-30 hidden md:block">
                <AppCredits />
            </div>

        </div>
    );
};
