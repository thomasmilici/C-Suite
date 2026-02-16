import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import ReactMarkdown from 'react-markdown';

export const NeuralInterface = ({ onClose }) => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'ai', text: '**Shadow CoS Online.**  \nSystem operational. Awaiting strategic query.' }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsThinking(true);

        try {
            // Real Cloud Function Call
            const askShadow = httpsCallable(functions, 'askShadowCoS');
            const result = await askShadow({ query: input });
            const aiResponse = result.data.data; // adjust based on function return structure

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'ai',
                text: aiResponse || "Analysis incomplete. Try clarifying intent."
            }]);
        } catch (error) {
            console.error("AI Error:", error);
            // Simulated Fallback for demo/dev
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: 'ai',
                    text: "Connection to Neural Core unstable (Simulated).  \n*Recommendation*: Review OKR alignment regarding recent market shifts."
                }]);
            }, 1500);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-8 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-full sm:w-[500px] h-[80vh] sm:h-[600px] bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto relative"
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white font-mono tracking-wide">SHADOW CoS</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">NEURAL UPLINK ACTIVE</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-grow bg-black/50 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800" ref={scrollRef}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed ${msg.type === 'user'
                                    ? "bg-zinc-800/80 text-white rounded-tr-sm"
                                    : "bg-indigo-900/10 border border-indigo-500/10 text-zinc-300 rounded-tl-sm"
                                }`}>
                                {msg.type === 'ai' ? (
                                    <ReactMarkdown className="prose prose-invert prose-sm">
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-indigo-900/10 border border-indigo-500/10 p-4 rounded-xl rounded-tl-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                                <span className="text-xs text-indigo-300 font-mono animate-pulse">Computing Strategy...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask for strategic analysis..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono placeholder:text-zinc-600"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
