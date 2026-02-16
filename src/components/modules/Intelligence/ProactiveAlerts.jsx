import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

export const ProactiveAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());

    useEffect(() => {
        // Watch OKRs
        let okrs = [];
        let pulseItems = [];

        const today = new Date().toISOString().split('T')[0];

        const unsubOKR = onSnapshot(
            query(collection(db, "okrs"), orderBy("createdAt", "desc")),
            (snap) => {
                okrs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                computeAlerts(okrs, pulseItems);
            }
        );

        const unsubPulse = onSnapshot(doc(db, "daily_pulse", today), (snap) => {
            pulseItems = snap.exists() ? (snap.data().focus_items || []) : [];
            computeAlerts(okrs, pulseItems);
        });

        const unsubSignals = onSnapshot(
            query(collection(db, "signals"), orderBy("createdAt", "desc"), limit(3)),
            (snap) => {
                const highSignals = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(s => s.level === 'high');

                if (highSignals.length > 0) {
                    setAlerts(prev => {
                        const signalAlert = {
                            id: 'high-signal',
                            type: 'danger',
                            title: 'CRITICAL SIGNAL ACTIVE',
                            message: `${highSignals.length} high-risk signal${highSignals.length > 1 ? 's' : ''} require immediate attention.`
                        };
                        const filtered = prev.filter(a => a.id !== 'high-signal');
                        return [signalAlert, ...filtered];
                    });
                } else {
                    setAlerts(prev => prev.filter(a => a.id !== 'high-signal'));
                }
            }
        );

        function computeAlerts(currentOKRs, currentPulse) {
            const newAlerts = [];

            // Check: OKRs at risk with no pulse focus
            const riskOKRs = currentOKRs.filter(o => o.status === 'risk');
            if (riskOKRs.length > 0 && currentPulse.length === 0) {
                newAlerts.push({
                    id: 'okr-no-pulse',
                    type: 'warning',
                    title: 'MISALIGNMENT DETECTED',
                    message: `${riskOKRs.length} OKR${riskOKRs.length > 1 ? 's' : ''} at risk but no daily focus set. Assign targets now.`
                });
            }

            // Check: OKRs below 30% progress
            const laggingOKRs = currentOKRs.filter(o => o.progress < 30);
            if (laggingOKRs.length > 0) {
                newAlerts.push({
                    id: 'okr-lagging',
                    type: 'warning',
                    title: 'OKR LAGGING BEHIND',
                    message: `"${laggingOKRs[0].title}" is at ${laggingOKRs[0].progress}% — below critical threshold.`
                });
            }

            // Check: pulse fully completed — positive reinforcement
            const completedPulse = currentPulse.filter(i => i.completed);
            if (currentPulse.length > 0 && completedPulse.length === currentPulse.length) {
                newAlerts.push({
                    id: 'pulse-done',
                    type: 'success',
                    title: 'ALL TARGETS EXECUTED',
                    message: 'Daily pulse complete. Velocity nominal. Update OKR progress.'
                });
            }

            setAlerts(prev => {
                const signalAlert = prev.find(a => a.id === 'high-signal');
                return signalAlert ? [signalAlert, ...newAlerts] : newAlerts;
            });
        }

        return () => {
            unsubOKR();
            unsubPulse();
            unsubSignals();
        };
    }, []);

    const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

    if (visibleAlerts.length === 0) return null;

    const colorMap = {
        danger: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300', icon: 'text-red-400', dot: 'bg-red-400' },
        warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-300', icon: 'text-yellow-400', dot: 'bg-yellow-400' },
        success: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
    };

    return (
        <div className="max-w-screen-2xl mx-auto mb-4 space-y-2">
            <AnimatePresence>
                {visibleAlerts.map(alert => {
                    const c = colorMap[alert.type] || colorMap.warning;
                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.bg} backdrop-blur-sm`}
                        >
                            <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${c.icon}`} />
                            <div className="flex-grow min-w-0">
                                <span className={`text-[10px] font-bold font-mono uppercase tracking-widest ${c.icon} mr-2`}>
                                    {alert.title}
                                </span>
                                <span className={`text-xs font-mono ${c.text}`}>
                                    {alert.message}
                                </span>
                            </div>
                            <button
                                onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                                className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
