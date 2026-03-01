import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getMissions, subscribeMission } from '../services/missionService';

const MissionContext = createContext(null);

const STORAGE_KEY = 'cos_active_mission_id';

export function MissionProvider({ children }) {
    const [authResolved, setAuthResolved] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [missions, setMissions] = useState([]);
    const [activeMissionId, setActiveMissionIdState] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || null;
    });
    const [mission, setMission] = useState(null);
    const [loadingMissions, setLoadingMissions] = useState(true);

    // ── Fix 1: Resolve Firebase Auth before any Firestore access ──────────────
    // We wait for onAuthStateChanged to emit at least once (authResolved = true)
    // before running any Firestore queries or snapshot listeners.
    // This prevents the "Missing or insufficient permissions" race condition that
    // occurs when the SDK hasn't confirmed the auth state yet on first render.
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setAuthResolved(true);
        });
        return () => unsubAuth();
    }, []);

    // Load all missions ONLY after Auth is resolved and a user is logged in
    useEffect(() => {
        if (!authResolved || !currentUser) {
            // Auth still loading OR user is logged out → don't touch Firestore
            if (authResolved && !currentUser) {
                // User is definitively logged out
                setMissions([]);
                setLoadingMissions(false);
            }
            return;
        }

        getMissions().then(list => {
            setMissions(list);
            setLoadingMissions(false);
            // If no activeMissionId is stored, default to first mission
            if (!localStorage.getItem(STORAGE_KEY) && list.length > 0) {
                setActiveMissionIdState(list[0].id);
                localStorage.setItem(STORAGE_KEY, list[0].id);
            }
        }).catch(err => {
            console.error('[MissionContext] Failed to load missions:', err);
            setLoadingMissions(false);
        });
    }, [authResolved, currentUser]);

    // Subscribe to active mission document ONLY when Auth is resolved and user is logged in
    useEffect(() => {
        if (!authResolved || !currentUser || !activeMissionId) {
            setMission(null);
            return;
        }
        const unsub = subscribeMission(activeMissionId, (data) => {
            setMission(data);
        });
        return () => unsub();
    }, [authResolved, currentUser, activeMissionId]);

    const setActiveMissionId = (id) => {
        localStorage.setItem(STORAGE_KEY, id);
        setActiveMissionIdState(id);
    };

    const isSetupComplete = mission?.isSetupComplete === true;

    return (
        <MissionContext.Provider value={{
            missions,
            mission,
            activeMissionId,
            setActiveMissionId,
            isSetupComplete,
            loadingMissions,
        }}>
            {children}
        </MissionContext.Provider>
    );
}

export function useMission() {
    const ctx = useContext(MissionContext);
    if (!ctx) throw new Error('useMission must be used inside <MissionProvider>');
    return ctx;
}
