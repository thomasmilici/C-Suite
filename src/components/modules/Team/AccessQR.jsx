import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Lock, RefreshCw } from 'lucide-react';

export const AccessQR = () => {
    const [token, setToken] = useState("");
    const [timeLeft, setTimeLeft] = useState(300); // 5 mins in seconds

    const generateToken = () => {
        const newToken = `csuite-os-v1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToken(newToken);
        setTimeLeft(300);
    };

    useEffect(() => {
        generateToken();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generateToken();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const progress = (timeLeft / 300) * 100;

    return (
        <div className="bg-black border border-zinc-800 p-6 rounded-xl flex flex-col items-center justify-center h-full relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
                <div
                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-4 relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-25"></div>
                <div className="relative bg-white p-2 rounded-lg">
                    <QRCodeSVG value={token} size={150} level="H" />
                </div>
            </div>

            <div className="text-center">
                <h3 className="text-gray-200 text-sm font-bold font-mono tracking-wider flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3 text-blue-400" /> SECURE ACCESS
                </h3>
                <p className="mt-2 text-xs font-mono text-gray-500">
                    Token refresh in <span className="text-blue-400">{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
                </p>
            </div>

            <button
                onClick={generateToken}
                className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                title="Force Refresh"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
    );
};
