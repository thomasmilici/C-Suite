import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const Login = () => {
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // SUPER-ADMIN CHECK
            const adminEmails = ['thomasmilici@gmail.com', 'andreaperugini1967@gmail.com'];
            const role = adminEmails.includes(user.email) ? 'ADMIN' : 'member';

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: role,
                    rank_score: 0,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
            } else {
                // Force update role if it's an admin email, to retroactively fix accounts
                if (role === 'ADMIN') {
                    await setDoc(userRef, { lastLogin: serverTimestamp(), role: 'ADMIN' }, { merge: true });
                } else {
                    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
                }
            }

            navigate('/dashboard');
        } catch (error) {
            console.error("Login Failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-zinc-800 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-12 rounded-2xl shadow-2xl relative overflow-hidden"
            >
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>

                {/* Logo / Icon */}
                <div className="flex justify-center mb-10 relative z-10">
                    <div className="w-20 h-20 bg-black border border-zinc-800 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <Terminal className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-12 relative z-10">
                    <h1 className="text-5xl font-mono font-bold text-white tracking-[0.2em] mb-3">
                        QUINTA
                    </h1>
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em]">
                        C-Suite Operating System
                    </p>
                </div>

                {/* Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    className="relative z-10 group w-full bg-white hover:bg-zinc-200 text-black font-mono text-sm font-bold py-5 px-8 rounded-lg transition-all duration-300 flex items-center justify-between"
                >
                    <span>ENTER WITH GOOGLE</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Footer Security Badge */}
                <div className="mt-12 flex flex-col items-center gap-3 opacity-40 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                            System Secure
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
