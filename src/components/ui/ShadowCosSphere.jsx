import React, { useEffect, useState } from 'react';

/**
 * ShadowCosSphere — Sfera animata del Shadow CoS (True Plasma Lamp)
 * Props:
 *   isSpeaking  — bool: AI parla (voce live o risposta streaming)
 *   isThinking  — bool: AI sta elaborando (query testo)
 *   volume      — number: Intensità del volume (0.0 - 1.0)
 */
export function ShadowCosSphere({ isSpeaking = false, isThinking = false, volume = 0 }) {
  const [plasmaRays, setPlasmaRays] = useState([]);

  // Genera raggi di plasma casuali che cambiano nel tempo
  useEffect(() => {
    // Numero di raggi in base allo stato
    const numRays = isSpeaking ? 16 : isThinking ? 12 : 8;

    const generateRays = () => {
      const rays = [];
      for (let i = 0; i < numRays; i++) {
        rays.push({
          id: i,
          angle: Math.random() * 360,     // Angolazione del raggio
          length: 40 + Math.random() * 50, // Lunghezza % dal centro al bordo
          width: 1 + Math.random() * 3,    // Spessore del fulmine
          speed: 0.5 + Math.random() * 2,  // Velocità di oscillazione
          opacity: 0.3 + Math.random() * 0.7, // Opacità casuale
          curve: -20 + Math.random() * 40 // Curvatura CSS
        });
      }
      setPlasmaRays(rays);
    };

    generateRays();
    // Rigenera i pattern ogni pochi secondi per un look caotico/elettrico
    const interval = setInterval(generateRays, isSpeaking ? 800 : 2500);
    return () => clearInterval(interval);
  }, [isSpeaking, isThinking]);

  // Colori base della lampada
  const coreColor = isThinking && !isSpeaking ? 'rgba(251, 146, 60, 1)' : 'rgba(167, 139, 250, 1)';
  const glowColor = isThinking && !isSpeaking ? 'rgba(234, 88, 12, 0.6)' : 'rgba(99, 102, 241, 0.6)';
  const plasmaColor = isThinking && !isSpeaking ? 'rgba(253, 186, 116, 0.8)' : 'rgba(199, 210, 254, 0.8)';

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <style>{`
        @keyframes rotate-globe {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jitter {
          0%, 100% { transform: scale(1) translate(0, 0); }
          25% { transform: scale(1.02) translate(1px, -1px); }
          50% { transform: scale(0.98) translate(-1px, 2px); }
          75% { transform: scale(1.01) translate(-2px, -1px); }
        }
        .plasma-ray {
          transform-origin: bottom center;
          animation: wiggle var(--speed) ease-in-out infinite alternate;
        }
        @keyframes wiggle {
          from { transform: rotate(var(--angle)) skewX(var(--curve)); opacity: var(--op); filter: brightness(1) drop-shadow(0 0 4px var(--color)); }
          to { transform: rotate(calc(var(--angle) + 15deg)) skewX(calc(var(--curve) * -1)); opacity: calc(var(--op) * 1.5); filter: brightness(1.5) drop-shadow(0 0 8px var(--color)); }
        }
        .globe-glass {
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.9),           /* Ombra profonda bordi */
            inset 15px 15px 30px rgba(255, 255, 255, 0.15), /* Riflesso luce alto sinistra */
            inset -15px -15px 30px rgba(0, 0, 0, 0.6),   /* Ombra basso destra */
            0 0 20px rgba(0, 0, 0, 0.5);                 /* Ombra esterna d'appoggio */
        }
      `}</style>

      {/* Vetro Esterno della Lampada */}
      <div
        className="relative rounded-full aspect-square w-full max-w-[240px] max-h-[240px] flex items-center justify-center overflow-hidden globe-glass"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(20, 20, 40, 0.9) 0%, rgba(5, 5, 10, 1) 100%)',
          boxShadow: isSpeaking
            ? `0 0 ${40 + volume * 60}px ${10 + volume * 20}px ${glowColor}, inset 0 0 60px rgba(0,0,0,0.9), inset 15px 15px 30px rgba(255,255,255,0.15)`
            : isThinking
              ? `0 0 30px 5px ${glowColor}, inset 0 0 60px rgba(0,0,0,0.9), inset 15px 15px 30px rgba(255,255,255,0.15)`
              : 'inset 0 0 60px rgba(0,0,0,0.9), inset 15px 15px 30px rgba(255,255,255,0.15)',
          transition: 'box-shadow 0.1s ease-out'
        }}
      >

        {/* --- GAS NOBILE (SFONDO LUMINOSO) --- */}
        <div
          className="absolute inset-0 rounded-full mix-blend-screen opacity-50"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 70%)`,
            transform: isSpeaking ? `scale(${1 + volume * 0.3})` : isThinking ? 'scale(1.1)' : 'scale(0.8)',
            transition: 'transform 0.1s ease-out'
          }}
        />

        {/* --- FILAMENTI ELETTRICI (I RAGGI DEL PLASMA) --- */}
        <div
          className="absolute inset-0 flex items-center justify-center mix-blend-screen"
          style={{
            animation: isSpeaking ? 'rotate-globe 6s linear infinite, jitter 0.1s infinite' : isThinking ? 'rotate-globe 15s linear infinite' : 'rotate-globe 30s linear infinite'
          }}
        >
          {plasmaRays.map(ray => (
            <div
              key={ray.id}
              className="absolute bottom-1/2 left-1/2 plasma-ray origin-bottom"
              style={{
                '--angle': `${ray.angle}deg`,
                '--curve': `${ray.curve}deg`,
                '--speed': `${ray.speed}s`,
                '--op': ray.opacity,
                '--color': plasmaColor,
                width: `${ray.width}px`,
                height: `${ray.length}%`,
                background: `linear-gradient(to top, white 0%, ${plasmaColor} 20%, transparent 100%)`,
                marginLeft: `${-(ray.width / 2)}px`,
                borderRadius: '50% 50% 0 0',
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>

        {/* --- ELETTRODO CENTRALE (IL CORE) --- */}
        <div
          className="absolute z-10 rounded-full bg-white shadow-[0_0_15px_5px_white] mix-blend-screen"
          style={{
            width: isSpeaking ? `${30 + (volume * 15)}px` : '24px',
            height: isSpeaking ? `${30 + (volume * 15)}px` : '24px',
            boxShadow: `0 0 ${40 + (isSpeaking ? volume * 40 : isThinking ? 10 : 0)}px ${15 + (isSpeaking ? volume * 20 : 0)}px ${coreColor}, inset 0 0 10px white`,
            transition: 'width 0.05s, height 0.05s, box-shadow 0.05s'
          }}
        />

        {/* Onde di Tesla extra centrali quando parla */}
        {isSpeaking && (
          <div
            className="absolute z-0 rounded-full border border-white/40 blur-[1px] mix-blend-screen"
            style={{
              width: `${40 + (volume * 40)}px`,
              height: `${40 + (volume * 40)}px`,
              boxShadow: `0 0 10px ${plasmaColor}, inset 0 0 10px ${plasmaColor}`,
              transform: `rotate(${Math.random() * 360}deg) scaleY(${0.8 + Math.random() * 0.4})`,
              transition: 'all 0.05s ease'
            }}
          />
        )}

        {/* Riflesso di Vetro Superiore (Glass Highlight) */}
        <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[70%] h-[30%] bg-gradient-to-b from-white/30 to-transparent rounded-full blur-[2px] pointer-events-none z-20" />

        {/* Riflesso di Vetro Inferiore (Bounce Light) */}
        <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[50%] h-[15%] bg-gradient-to-t from-[#a78bfa]/10 to-transparent rounded-full blur-[4px] pointer-events-none z-20" />

      </div>
    </div>
  );
}
