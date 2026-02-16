import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { Lock, Terminal } from 'lucide-react';

export const Login = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await AuthService.loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError("Authentication Failed. Access Denied.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
            <div className="max-w-md w-full border border-zinc-800 bg-zinc-950/50 p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                        <Terminal className="w-8 h-8 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-widest">QUINTA OS</h1>
                    <p className="text-xs text-green-500 mt-2 animate-pulse">● SYSTEM READY</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-gray-200 transition-colors py-3 px-4 rounded font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <span className="animate-spin">⟳</span>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 group-hover:text-black transition-colors" /> Authenticate via Google
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded text-center">
                            {error}
                        </div>
                    )}

                    <div className="text-center mt-6">
                        <p className="text-[10px] text-zinc-600 uppercase">
                            Authorized Personnel Only <br />
                            Access Attempt Logged
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
