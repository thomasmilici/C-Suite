import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { WorkspaceNav } from './WorkspaceNav';
import { AiFab } from '../ui/AiFab';
import { NeuralInterface } from '../modules/Intelligence/NeuralInterface';
import { BottomNav } from '../ui/BottomNav';
import { AppCredits } from '../ui/AppCredits';
import { CommandBar } from '../CommandBar';
import { CopilotDialogue } from '../CopilotDialogue';
import { useLiveSession } from '../../hooks/useLiveSession';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const HISTORY_LIMIT = 20;

async function loadHistory(uid) {
    try {
        const snap = await getDoc(doc(db, 'shadow_cos_prefs', uid));
        if (snap.exists() && snap.data().history?.length > 0) return snap.data().history;
    } catch (_) {}
    return [];
}

async function saveMessage(uid, message) {
    try {
        const ref = doc(db, 'shadow_cos_prefs', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, { history: [message], updatedAt: new Date() });
        } else {
            const existing = snap.data().history || [];
            const updated = [...existing, message].slice(-HISTORY_LIMIT);
            await updateDoc(ref, { history: updated, updatedAt: new Date() });
        }
    } catch (_) {}
}

export const AppShell = ({ children, user, isAdmin }) => {
    const [showLegacyAi, setShowLegacyAi] = useState(false);
    const [showCopilot, setShowCopilot] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isLiveActive, setIsLiveActive] = useState(false);
    const location = useLocation();

    const showWorkspaceNav = !location.pathname.includes('/login') &&
        !location.pathname.includes('/join');

    // Resolve contextId from URL for dossier isolation
    const contextMatch = location.pathname.match(/\/progetto\/([^/]+)/);
    const contextId = contextMatch ? contextMatch[1] : null;

    // ── Live Session ──────────────────────────────────────────────────────────
    const { isConnected, isSpeaking, transcript, volume, startSession, endSession } =
        useLiveSession({
            onTextMessage: useCallback((text) => {
                // Append AI voice transcript as a message in the drawer
                const aiMsg = { id: Date.now(), type: 'ai', text };
                setMessages(prev => [...prev, aiMsg]);
                setShowCopilot(true);
            }, []),
            onError: useCallback((msg) => {
                // Show error as system message and close Live mode
                const errMsg = { id: Date.now(), type: 'system', text: `⚠️ ${msg}` };
                setMessages(prev => [...prev, errMsg]);
                setIsLiveActive(false);
            }, []),
        });

    const handleLiveToggle = useCallback(async () => {
        if (isLiveActive) {
            endSession();
            setIsLiveActive(false);
        } else {
            // Open copilot drawer so user sees Live banner
            setShowCopilot(true);
            setIsLiveActive(true);
            // startSession must be called from a user gesture (button click)
            await startSession();
        }
    }, [isLiveActive, startSession, endSession]);

    // ── Text Send (unchanged — askShadowCoS Cloud Function flow) ─────────────
    const handleSend = useCallback(async (text, ctxId) => {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;

        // Add user message and open dialogue
        const userMsg = { id: Date.now(), type: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setShowCopilot(true);
        setIsThinking(true);

        // Build history for API
        const storedHistory = uid ? await loadHistory(uid) : [];
        const history = storedHistory.map(h => ({ role: h.role, text: h.text }));
        if (uid) await saveMessage(uid, { role: 'user', text });

        try {
            const askShadow = httpsCallable(functions, 'askShadowCoS');
            const result = await askShadow({ query: text, history, contextId: ctxId || null });
            const rawText = result.data?.data || 'Analisi non disponibile.';

            const aiMsg = { id: Date.now() + 1, type: 'ai', text: rawText };
            setMessages(prev => [...prev, aiMsg]);

            if (uid) await saveMessage(uid, { role: 'model', text: rawText });
        } catch (e) {
            const errMsg = { id: Date.now() + 1, type: 'ai', text: 'Neural link instabile. Riprova.' };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsThinking(false);
        }
    }, [contextId]);

    const handleClear = useCallback(() => {
        setMessages([]);
    }, []);

    return (
        <div className="min-h-screen bg-[#050508] text-gray-200 font-sans selection:bg-zinc-800 relative">

            {/* Level 1 Header: Global — includes CommandBar */}
            <AppHeader
                user={user}
                isAdmin={isAdmin}
                commandBarSlot={
                    <CommandBar
                        onSend={handleSend}
                        isProcessing={isThinking}
                        isLiveActive={isLiveActive}
                        onLiveToggle={handleLiveToggle}
                    />
                }
            />

            {/* Level 2 Header: Context Navigation */}
            {showWorkspaceNav && <WorkspaceNav />}

            {/* Main Content Area — shifted right when copilot open on desktop */}
            <div className={`relative z-10 transition-all duration-300 ${showCopilot ? 'md:mr-[420px]' : ''}`}>
                {children}
            </div>

            {/* CopilotDialogue — slide-in drawer */}
            <CopilotDialogue
                messages={messages}
                isOpen={showCopilot}
                isThinking={isThinking}
                onClose={() => setShowCopilot(false)}
                onClear={handleClear}
                isLiveActive={isLiveActive}
                transcript={transcript}
                volume={volume}
                isSpeaking={isSpeaking}
                onEndLive={() => {
                    endSession();
                    setIsLiveActive(false);
                }}
            />

            {/* Legacy AI FAB (desktop) — opens NeuralInterface modal for advanced use */}
            <AiFab
                onClick={() => setShowLegacyAi(true)}
                isProcessing={isThinking}
            />

            {/* Legacy NeuralInterface Modal */}
            {showLegacyAi && (
                <NeuralInterface
                    onClose={() => setShowLegacyAi(false)}
                    isAdmin={isAdmin}
                    initiallyOpen={true}
                />
            )}

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <BottomNav onAiClick={() => setShowCopilot(v => !v)} />
            </div>

            {/* Footer Credits (Global) */}
            <div className="fixed bottom-4 left-6 z-30 hidden md:block">
                <AppCredits />
            </div>

        </div>
    );
};
