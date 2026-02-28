import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Lock } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const FocusLock = () => {
    const [focusItems, setFocusItems] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(true);

    // Get today's date string for document ID (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const pulseRef = doc(db, "daily_pulse", today);

    useEffect(() => {
        const unsubscribe = onSnapshot(pulseRef, (docSnap) => {
            if (docSnap.exists()) {
                setFocusItems(docSnap.data().focus_items || []);
            } else {
                setFocusItems([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [today]);

    const addItem = async () => {
        if (inputValue.trim() === "") return;
        if (focusItems.length >= 3) return; // UI Guard

        const newItem = { id: Date.now(), text: inputValue, completed: false };

        // Optimistic Update
        const newItems = [...focusItems, newItem];
        setFocusItems(newItems);
        setInputValue("");

        try {
            const docSnap = await getDoc(pulseRef);
            if (!docSnap.exists()) {
                await setDoc(pulseRef, { date: today, focus_items: [newItem] });
            } else {
                await updateDoc(pulseRef, { focus_items: arrayUnion(newItem) });
            }
            toast.success('✓ Focus salvato');
        } catch (e) {
            console.error("Error adding pulse item:", e);
            // Revert on fail
            setFocusItems(focusItems);
        }
    };

    const toggleItem = async (itemId) => {
        const updatedItems = focusItems.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        // Optimistic
        setFocusItems(updatedItems);

        await setDoc(pulseRef, { focus_items: updatedItems }, { merge: true });
    };

    const deleteItem = async (itemToDelete) => {
        const updatedItems = focusItems.filter(item => item.id !== itemToDelete.id);
        setFocusItems(updatedItems);
        await setDoc(pulseRef, { focus_items: updatedItems }, { merge: true });
    };

    const isLocked = focusItems.length >= 3 && !focusItems.some(item => item.completed);

    return (
        <div className="bg-black border border-gray-800 p-6 rounded-xl font-mono h-full flex flex-col">
            <h2 className="text-gray-400 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" /> Daily Focus Lock
            </h2>

            <div className="space-y-3 mb-4 flex-grow overflow-y-auto">
                {focusItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded border border-zinc-800">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleItem(item.id)}
                                className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    item.completed ? "bg-green-500 border-green-500 text-black" : "border-gray-600 hover:border-gray-400"
                                )}
                            >
                                {item.completed && <Check className="w-3 h-3" />}
                            </button>
                            <span className={cn("text-gray-200 text-sm truncate max-w-[180px]", item.completed && "line-through text-gray-500")}>
                                {item.text}
                            </span>
                        </div>
                        {!item.completed && (
                            <button onClick={() => deleteItem(item)} className="text-gray-600 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                {focusItems.length === 0 && !loading && (
                    <div className="text-gray-600 text-xs text-center py-4 italic">No focus targets for today.</div>
                )}
            </div>

            <div className="relative mt-auto">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    placeholder={focusItems.length >= 3 ? "SYSTEM LOCKED: MAX FOCUS REACHED" : "Add strategic focus..."}
                    disabled={isLocked || focusItems.length >= 3}
                    className={cn(
                        "w-full bg-zinc-950 border border-zinc-800 text-gray-200 text-sm p-3 rounded focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-gray-600",
                        (isLocked || focusItems.length >= 3) && "opacity-50 cursor-not-allowed border-red-900/50 text-red-900 placeholder:text-red-900"
                    )}
                />
                <button
                    onClick={addItem}
                    disabled={isLocked || focusItems.length >= 3}
                    className={cn("absolute right-2 top-2 p-1 rounded hover:bg-zinc-800 transition-colors text-gray-400", (isLocked || focusItems.length >= 3) && "opacity-0")}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {isLocked && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1 animate-pulse">
                    <Lock className="w-3 h-3" /> Focus Locked. Execute pending items.
                </p>
            )}
        </div>
    );
};
