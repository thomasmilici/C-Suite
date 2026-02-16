import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InviteService } from '../services/inviteService';
import { AuthService } from '../services/authService';
import { Loader2, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Join = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('validating'); // validating, valid, invalid, success
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const validation = await InviteService.validateInvite(token);
                if (validation.valid) {
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                    setError(validation.reason);
                }
            } catch (err) {
                setStatus('invalid');
                setError("System Error");
            }
        };
        checkToken();
    }, [token]);

    const handleJoin = async () => {
        try {
            // Login logic
            const result = await AuthService.loginWithGoogle();
            const user = result.user;

            // Consume Invite
            await InviteService.consumeInvite(token, user.uid);

            setStatus('success');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            console.error("Join Failed:", err);
            setError("Authentication Failed or Token Expired during process.");
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-zinc-800 font-mono text-white">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-2xl relative overflow-hidden"
            >
                {/* Status: Validating */}
                {status === 'validating' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-zinc-500 text-sm tracking-widest animate-pulse">VERIFYING SECURE TOKEN...</span>
                    </div>
                )}

                {/* Status: Invalid */}
                {status === 'invalid' && (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-red-500">ACCESS DENIED</h2>
                        <p className="text-zinc-400 text-sm">{error || "This invite link is invalid or has expired."}</p>
                        <button onClick={() => navigate('/login')} className="mt-6 text-zinc-500 hover:text-white underline">
                            Return to Login
                        </button>
                    </div>
                )}

                {/* Status: Valid */}
                {status === 'valid' && (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">TOKEN VERIFIED</h2>
                        <p className="text-zinc-400 text-sm mb-6">
                            You have been invited to join the <strong>Quinta OS</strong> executive channel.
                        </p>

                        <button
                            onClick={handleJoin}
                            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>ACCEPT & LOGIN</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Status: Success */}
                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                        <span className="text-green-500 text-sm tracking-widest">INITIALIZING DASHBOARD...</span>
                    </div>
                )}

            </motion.div>
        </div>
    );
};
