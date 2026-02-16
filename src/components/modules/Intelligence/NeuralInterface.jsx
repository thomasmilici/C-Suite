import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, Bot } from 'lucide-react';
import { cn } from '../../../utils/cn';

export const NeuralInterface = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'ai', text: 'Shadow CoS Online. Strategic alignment at 78%. Awaiting query.' }
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

        // Simulation of Cloud Function call
        // const response = await httpsCallable(functions, 'askShadowCoS')({ query: input });

        setTimeout(() => {
            setIsThinking(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'ai',
                text: "Evaluating strategic impact... [Simulated Response: This action aligns with OKR #2 but carries risk in resource allocation.]"
            }]);
        }, 1500);
    };

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-8 right-8 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform z-50 group",
                    isOpen && "hidden"
                )}
            >
                <div className="absolute inset-0 bg-purple-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                <BrainCircuit className="w-6 h-6 z-10" />
            </button>

            {/* Interface Modal */}
            {isOpen && (
                <div className="fixed bottom-8 right-8 w-80 md:w-96 h-[500px] bg-black border border-zinc-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                <Bot className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 font-mono">SHADOW CoS</h3>
                                <p className="text-[10px] text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    NEURAL LINK ACTIVE
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-grow bg-black p-4 overflow-y-auto space-y-4 font-mono text-sm" ref={scrollRef}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex", msg.type === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] p-3 rounded-lg border",
                                    msg.type === 'user'
                                        ? "bg-zinc-900 border-zinc-800 text-gray-200 rounded-tr-none"
                                        : "bg-purple-900/10 border-purple-500/20 text-purple-200 rounded-tl-none"
                                )}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-purple-900/10 border border-purple-500/20 text-purple-200 p-3 rounded-lg rounded-tl-none flex items-center gap-1">
                                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-zinc-950 border-t border-zinc-800 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Interrogate System..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-10 text-sm text-white focus:outline-none focus:border-zinc-700 font-mono"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
