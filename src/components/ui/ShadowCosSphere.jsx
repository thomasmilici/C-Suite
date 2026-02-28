import React from 'react';

/**
 * ShadowCosSphere — Sfera animata del Shadow CoS.
 *
 * Stati visivi:
 *   idle     → rotazione lenta, viola, glow tenue
 *   thinking → rotazione media, ambra/arancio, pulse sottile
 *   speaking → rotazione veloce, viola brillante, ping rings
 *
 * Props:
 *   isSpeaking  — bool (AI sta emettendo audio o risposta in streaming)
 *   isThinking  — bool (AI sta elaborando la richiesta)
 */
export function ShadowCosSphere({ isSpeaking = false, isThinking = false }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin-medium {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1);    opacity: 0.6; filter: brightness(1); }
          50%       { transform: scale(1.1);  opacity: 1;   filter: brightness(1.5); }
        }
        @keyframes pulse-think {
          0%, 100% { transform: scale(1);    opacity: 0.5; filter: brightness(1); }
          50%       { transform: scale(1.08); opacity: 0.9; filter: brightness(1.3); }
        }
        .animate-spin-slow   { animation: spin-slow   25s linear infinite; }
        .animate-spin-medium { animation: spin-medium  8s linear infinite; }
        .animate-spin-fast   { animation: spin-fast    5s linear infinite; }
        .animate-pulse-glow  { animation: pulse-glow   1.5s ease-in-out infinite; }
        .animate-pulse-think { animation: pulse-think  1.8s ease-in-out infinite; }
      `}</style>

      {/* Contenitore principale — glow e scala cambiano per stato */}
      <div
        className={`relative w-[240px] h-[240px] rounded-full transition-all duration-700 ${
          isSpeaking
            ? 'border border-purple-400/20 shadow-[0_0_80px_20px_rgba(151,71,255,0.6)] scale-105'
            : isThinking
            ? 'border border-amber-400/20 shadow-[0_0_60px_15px_rgba(251,146,60,0.35)] scale-100'
            : 'border border-white/10 shadow-[0_0_40px_10px_rgba(151,71,255,0.2)] scale-100'
        }`}
      >
        {/* Sfondo Base Oscuro */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#130b29] to-[#05050a] overflow-hidden" />

        {/* Plasma Rotante 1 — colore e velocità cambiano per stato */}
        <div
          className={`absolute inset-0 rounded-full mix-blend-screen opacity-70 blur-[8px] ${
            isSpeaking ? 'animate-spin-fast' : isThinking ? 'animate-spin-medium' : 'animate-spin-slow'
          }`}
          style={{
            background: isThinking && !isSpeaking
              ? 'conic-gradient(from 90deg, transparent, rgba(251,146,60,0.85), rgba(245,158,11,0.85), transparent 50%)'
              : 'conic-gradient(from 90deg, transparent, rgba(151,71,255,0.8), rgba(0,123,229,0.8), transparent 50%)',
          }}
        />

        {/* Plasma Rotante 2 — gira al contrario */}
        <div
          className={`absolute inset-0 rounded-full mix-blend-screen opacity-50 blur-[12px] ${
            isSpeaking ? 'animate-spin-fast' : isThinking ? 'animate-spin-medium' : 'animate-spin-slow'
          }`}
          style={{
            animationDirection: 'reverse',
            background: isThinking && !isSpeaking
              ? 'conic-gradient(from 270deg, transparent, rgba(234,88,12,0.8), rgba(251,191,36,0.65), transparent 50%)'
              : 'conic-gradient(from 270deg, transparent, rgba(255,92,22,0.8), rgba(255,0,128,0.8), transparent 50%)',
          }}
        />

        {/* Nucleo Esterno */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-1/2 h-1/2 bg-white/20 blur-[20px] mix-blend-screen transition-all duration-300 ${
            isSpeaking ? 'animate-pulse-glow' : isThinking ? 'animate-pulse-think' : ''
          }`}
        />

        {/* Nucleo Centrale — colore ambra per thinking */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-1/4 h-1/4 blur-[10px] mix-blend-screen transition-all duration-500 ${
            isThinking && !isSpeaking ? 'bg-amber-200' : 'bg-blue-100'
          } ${
            isSpeaking ? 'animate-pulse-glow' : isThinking ? 'animate-pulse-think' : ''
          }`}
        />

        {/* Ombra Interna 3D */}
        <div className="absolute inset-0 rounded-full shadow-[inset_-30px_-30px_60px_rgba(0,0,0,0.9),inset_10px_10px_30px_rgba(255,255,255,0.15)] pointer-events-none z-10" />

        {/* Onde Sonore — solo in speaking */}
        {isSpeaking && (
          <>
            <div
              className="absolute inset-0 rounded-full border-2 border-purple-400/40 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <div
              className="absolute inset-[-15px] rounded-full border border-blue-400/20 animate-ping"
              style={{ animationDuration: '2s', animationDelay: '0.6s' }}
            />
          </>
        )}

        {/* Onda Pensiero — solo in thinking */}
        {isThinking && !isSpeaking && (
          <div
            className="absolute inset-[-8px] rounded-full border border-amber-400/25 animate-ping"
            style={{ animationDuration: '2.5s' }}
          />
        )}
      </div>
    </div>
  );
}
