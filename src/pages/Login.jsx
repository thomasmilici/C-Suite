import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';

export const Login = () => {
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            await AuthService.loginWithGoogle();
            navigate('/dashboard');
        } catch (error) {
            console.error("Login Failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-zinc-800">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-sm text-center"
            >
                {/* Logo / Icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <Terminal className="w-8 h-8 text-zinc-400" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-mono font-bold text-white tracking-[0.2em] mb-2">
                    QUINTA<span className="text-zinc-600">OS</span>
                </h1>

                {/* Subtitle */}
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-12">
                    C-Suite Operating System
                </p>

                {/* Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    className="group w-full bg-white hover:bg-zinc-200 text-black font-mono text-sm font-bold py-4 px-6 rounded transition-all duration-300 flex items-center justify-between"
                >
                    <span>ENTER WITH GOOGLE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Footer Security Badge */}
                <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                        Secure Connection • v4.0.0
                    </span>
                </div>
            </motion.div>
        </div>
    );
};
