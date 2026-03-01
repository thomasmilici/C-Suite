import React from 'react';

/**
 * ShadowCosSphere — Sfera animata del Shadow CoS (Plasma Lamp Design)
 * Props:
 *   isSpeaking  — bool: AI parla (voce live o risposta streaming)
 *   isThinking  — bool: AI sta elaborando (query testo)
 */
export function ShadowCosSphere({ isSpeaking = false, isThinking = false, volume = 0 }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Animazioni custom */}
      <style>{`
        @keyframes plasma-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes plasma-pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes core-throb {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); filter: brightness(1.3); }
        }
        .animate-plasma-slow { animation: plasma-rotate 20s linear infinite; }
        .animate-plasma-med  { animation: plasma-rotate 8s linear infinite; }
        .animate-plasma-fast { animation: plasma-rotate 3s linear infinite; }
        .animate-plasma-pulse { animation: plasma-pulse 1s ease-in-out infinite; }
        .animate-core-throb  { animation: core-throb 1.2s ease-in-out infinite; }
        .animate-core-think  { animation: core-throb 2s ease-in-out infinite; }
      `}</style>

      {/* Vetro Esterno Sfera */}
      <div
        className={`relative w-[240px] h-[240px] rounded-full border border-white/[0.15] overflow-hidden ${isSpeaking
            ? 'shadow-[0_0_80px_20px_rgba(99,102,241,0.4)]'
            : isThinking
              ? 'shadow-[0_0_50px_10px_rgba(245,158,11,0.3)]'
              : 'shadow-[0_0_30px_5px_rgba(167,139,250,0.1)]'
          }`}
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), inset 10px 10px 20px rgba(255,255,255,0.1), inset -10px -10px 20px rgba(0,0,0,0.5)',
          transform: isSpeaking ? `scale(${1 + volume * 0.1})` : 'scale(1)',
          transition: 'transform 0.05s ease-out, box-shadow 0.7s ease'
        }}
      >
        {/* Sfondo Vuoto/Profondo */}
        <div className="absolute inset-0 rounded-full bg-[#050510] mix-blend-multiply opacity-80" />

        {/* --- FILAMENTI AL PLASMA --- */}
        {/* Livello 1: Raggi Sottili */}
        <div
          className={`absolute [-inset-50%] rounded-full opacity-60 mix-blend-screen transition-all duration-700 ${isSpeaking ? 'animate-plasma-fast' : isThinking ? 'animate-plasma-med' : 'animate-plasma-slow'
            }`}
          style={{
            background: isThinking && !isSpeaking
              ? 'repeating-conic-gradient(from 0deg, transparent 0deg, rgba(245,158,11,0.05) 10deg, rgba(234,88,12,0.4) 12deg, transparent 15deg)'
              : 'repeating-conic-gradient(from 0deg, transparent 0deg, rgba(99,102,241,0.05) 10deg, rgba(167,139,250,0.4) 12deg, transparent 15deg)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 20%, black 70%, transparent 95%)',
            maskImage: 'radial-gradient(circle, transparent 20%, black 70%, transparent 95%)',
            filter: 'blur(1px)'
          }}
        />

        {/* Livello 2: Raggi Spessi (gira in senso antiorario) */}
        <div
          className={`absolute [-inset-50%] rounded-full opacity-50 mix-blend-screen transition-all duration-700 ${isSpeaking ? 'animate-plasma-med' : isThinking ? 'animate-plasma-slow' : 'animate-plasma-slow'
            }`}
          style={{
            animationDirection: 'reverse',
            background: isThinking && !isSpeaking
              ? 'repeating-conic-gradient(from 45deg, transparent 0deg, rgba(251,191,36,0) 20deg, rgba(217,119,6,0.5) 25deg, transparent 35deg)'
              : 'repeating-conic-gradient(from 45deg, transparent 0deg, rgba(56,189,248,0) 20deg, rgba(139,92,246,0.6) 25deg, transparent 35deg)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 15%, black 60%, transparent 85%)',
            maskImage: 'radial-gradient(circle, transparent 15%, black 60%, transparent 85%)',
            filter: 'blur(3px)'
          }}
        />

        {/* Livello 3: Nube Luminosa Elettrica */}
        <div
          className={`absolute inset-0 rounded-full mix-blend-screen transition-opacity duration-500 ${isSpeaking ? 'opacity-70 animate-plasma-pulse' : 'opacity-30'}`}
          style={{
            background: isThinking && !isSpeaking
              ? 'radial-gradient(circle at center, rgba(245,158,11,0.6) 0%, rgba(217,119,6,0.2) 40%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(139,92,246,0.6) 0%, rgba(99,102,241,0.2) 40%, transparent 70%)',
            filter: 'blur(10px)',
            transform: isSpeaking ? `scale(${1 + volume * 0.3})` : 'scale(1)',
            transition: 'transform 0.05s ease-out'
          }}
        />

        {/* --- NUCLEO CENTRALE (Elettrodo) --- */}
        <div
          className={`absolute top-1/2 left-1/2 w-12 h-12 bg-white rounded-full mix-blend-screen shadow-[0_0_30px_10px_white] transition-transform duration-300 z-10 ${isSpeaking ? 'animate-core-throb' : isThinking ? 'animate-core-think opacity-80' : 'opacity-40'
            }`}
          style={{
            boxShadow: isThinking && !isSpeaking
              ? '0 0 40px 15px rgba(251,191,36,0.8), inset 0 0 10px rgba(255,255,255,1)'
              : '0 0 40px 15px rgba(167,139,250,0.8), inset 0 0 10px rgba(255,255,255,1)'
          }}
        />

        {/* Onde di picco del Nucleo (Reattive al volume) */}
        {isSpeaking && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-indigo-300 rounded-full mix-blend-screen blur-[8px] z-0"
            style={{
              transform: `translate(-50%, -50%) scale(${1 + volume * 0.8})`,
              opacity: 0.5 + volume * 0.5,
              transition: 'transform 0.05s ease-out, opacity 0.05s ease-out'
            }}
          />
        )}

        {/* Riflesso di Vetro Curvo Superiore */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-[30%] bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[2px] pointer-events-none" />
      </div>
    </div>
  );
}
