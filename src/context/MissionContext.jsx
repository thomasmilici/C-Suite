import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMissions, subscribeMission } from '../services/missionService';

const MissionContext = createContext(null);

const STORAGE_KEY = 'cos_active_mission_id';

export function MissionProvider({ children }) {
    const [missions, setMissions] = useState([]);
    const [activeMissionId, setActiveMissionIdState] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || null;
    });
    const [mission, setMission] = useState(null);
    const [loadingMissions, setLoadingMissions] = useState(true);

    // Load all missions once on mount to find the default
    useEffect(() => {
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
    }, []);

    // Subscribe to active mission document in real-time
    useEffect(() => {
        if (!activeMissionId) {
            setMission(null);
            return;
        }
        const unsub = subscribeMission(activeMissionId, (data) => {
            setMission(data);
        });
        return () => unsub();
    }, [activeMissionId]);

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
