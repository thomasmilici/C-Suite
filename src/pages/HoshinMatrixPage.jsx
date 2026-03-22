import React, { useContext, useState } from 'react';
import { MissionContext } from '../components/layout/AppShell';
import { useHoshinMatrix } from '../hooks/useHoshinMatrix';
import { HoshinMatrixLayout } from '../components/HoshinMatrix/HoshinMatrixLayout';
import { ContextHeader } from '../components/ui/ContextHeader';
import { Loader2, Sparkles } from 'lucide-react';
import { AiStateContext } from '../components/layout/AppShell';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export const HoshinMatrixPage = ({ user }) => {
    const { activeMissionId, missionData } = useContext(MissionContext);
    const { 
        matrixData, 
        matrixId, 
        loading, 
        addLongTermGoal,
        addAnnualObjective,
        addTacticalPriority,
        addKpi,
        setCorrelation,
        setAccountability,
        deleteItem
    } = useHoshinMatrix(activeMissionId);

    const [isThinkingLocal, setIsThinkingLocal] = useState(false);

    const handleAddItem = (section, text) => {
        if (!matrixId) return;
        if (section === 'longTermGoals') addLongTermGoal(matrixId, text);
        if (section === 'annualObjectives') addAnnualObjective(matrixId, text);
        if (section === 'tacticalPriorities') addTacticalPriority(matrixId, text);
        if (section === 'kpis') addKpi(matrixId, text);
    };

    const handleDeleteItem = (section, id) => {
        if (!matrixId) return;
        deleteItem(matrixId, section, id);
    };

    const handleCorrelationChange = (fromType, fromId, toType, toId, strength) => {
        if (!matrixId) return;
        setCorrelation(matrixId, fromType, fromId, toType, toId, strength);
    };

    const handleAccountabilityChange = (itemId, initiativeType, ownerId, supportIds) => {
        if (!matrixId) return;
        setAccountability(matrixId, itemId, initiativeType, ownerId, supportIds);
    };

    const generateAiPrompt = () => {
        if (!matrixData) return "";
        
        let prompt = "Analizza questa Hoshin Kanri X-Matrix:\n\n";
        
        prompt += "OBIETTIVI LUNGO TERMINE:\n";
        matrixData.longTermGoals?.forEach(g => prompt += `- ${g.text}\n`);
        
        prompt += "\nOBIETTIVI ANNUALI:\n";
        matrixData.annualObjectives?.forEach(o => prompt += `- ${o.text}\n`);
        
        prompt += "\nPRIORITÀ TATTICHE:\n";
        matrixData.tacticalPriorities?.forEach(p => prompt += `- ${p.text}\n`);
        
        prompt += "\nKPI:\n";
        matrixData.kpis?.forEach(k => prompt += `- ${k.text}\n`);
        
        const orphans = [];
        const allItems = [
            ...matrixData.longTermGoals || [],
            ...matrixData.annualObjectives || [],
            ...matrixData.tacticalPriorities || [],
            ...matrixData.kpis || []
        ];
        
        allItems.forEach(item => {
            const hasCorr = matrixData.correlations?.some(c => c.fromId === item.id || c.toId === item.id);
            if (!hasCorr) orphans.push(item.text);
        });

        prompt += "\nCORRELAZIONI MANCANTI (item orfani):\n";
        if(orphans.length > 0) {
            orphans.forEach(o => prompt += `- ${o}\n`);
        } else {
            prompt += "- Nessuno. Tutti gli elementi sono correlati.\n";
        }
        
        prompt += "\nIdentifica: 1) obiettivi senza piano d'azione, 2) iniziative non collegate a nessun obiettivo, 3) suggerisci 3 nuove correlazioni da considerare, 4) valuta la coerenza strategica complessiva.";
        
        return prompt;
    };

    const handleRiepilogoAi = async () => {
        const prompt = generateAiPrompt();
        setIsThinkingLocal(true);
        try {
            const askShadow = httpsCallable(functions, 'askShadowCoS');
             // Open the Copilot Dialog via a hack if needed, or just let the response trigger it. 
             // We can fire a custom event or just let the user see the toast, but ideal is showing the drawer.
             // We trigger it via toast for simplicity if we can't access AppShell setter directly.
            toast.success("Prompt inviato a Shadow CoS. Risposta in elaborazione...");
            
            // To properly integrate with the Copilot drawer, we might need a context method.
            // But we will just call askShadow and log it or use the standard mechanism.
            // Since we don't have the write access to messages array from here directly, 
            // a hack could be dispatching an event that AppShell listens to.
            // For now, let's just make the call.
            await askShadow({ query: prompt, missionId: activeMissionId });
            toast.success("Riepilogo Hoshin Kanri completato nel pannello AI.");
            
            // Alternatively, dispatch event for AppShell to catch
            window.dispatchEvent(new CustomEvent('shadow-cos-message', { detail: { text: prompt } }));

        } catch (e) {
            console.error(e);
            toast.error("Errore di elaborazione AI.");
        } finally {
            setIsThinkingLocal(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-indigo-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black/90 pb-32">
            <div className="border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl sticky top-[104px] z-10 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-white font-mono tracking-widest uppercase">HOSHIN X-MATRIX</h1>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Live Sync</span>
                    </div>
                </div>
                
                <button
                    onClick={handleRiepilogoAi}
                    disabled={isThinkingLocal || !matrixData}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-mono transition-colors disabled:opacity-50"
                >
                    {isThinkingLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Riepilogo AI
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <HoshinMatrixLayout 
                    matrixData={matrixData}
                    onAddItem={handleAddItem}
                    onDeleteItem={handleDeleteItem}
                    onCorrelationChange={handleCorrelationChange}
                    onAccountabilityChange={handleAccountabilityChange}
                />
            </div>
        </div>
    );
};
