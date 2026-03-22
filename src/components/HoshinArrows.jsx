import React from 'react';

export function HoshinArrows({
  nordActive, nordUrgent,
  estActive, estUrgent,
  ovestActive, ovestUrgent,
  sudActive, sudUrgent
}) {
  const getStyle = (active, urgent, color, glowColor, pos) => ({
    position: 'absolute',
    width: '44px',
    height: '44px',
    cursor: 'default',
    opacity: active ? 1.0 : 0.15,
    filter: active 
      ? `drop-shadow(0 0 ${urgent ? '16px' : '10px'} ${glowColor})`
      : 'none',
    transition: 'opacity 0.5s ease, filter 0.5s ease',
    ...pos
  });

  const getClassName = (active, urgent) => {
    if (urgent) return 'arrow-flash';
    if (active) return 'arrow-pulse';
    return '';
  };

  return (
    <>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '20px', height: '20px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)'
      }} />

      {/* Nord */}
      <svg viewBox="0 0 32 32" className={getClassName(nordActive, nordUrgent)} style={getStyle(nordActive, nordUrgent, '#818cf8', 'rgba(129,140,248,0.8)', { top: '20px', left: '50%', transform: 'translateX(-50%)' })}>
        <polygon points="16,2 30,28 2,28" fill="#818cf8" strokeWidth="0" />
      </svg>

      {/* Est */}
      <svg viewBox="0 0 32 32" className={getClassName(estActive, estUrgent)} style={getStyle(estActive, estUrgent, '#fb923c', 'rgba(251,146,60,0.8)', { top: '50%', right: '20px', transform: 'translateY(-50%)' })}>
        <polygon points="30,16 4,2 4,30" fill="#fb923c" strokeWidth="0" />
      </svg>

      {/* Sud */}
      <svg viewBox="0 0 32 32" className={getClassName(sudActive, sudUrgent)} style={getStyle(sudActive, sudUrgent, '#4ade80', 'rgba(74,222,128,0.8)', { bottom: '20px', left: '50%', transform: 'translateX(-50%)' })}>
        <polygon points="16,30 30,4 2,4" fill="#4ade80" strokeWidth="0" />
      </svg>

      {/* Ovest */}
      <svg viewBox="0 0 32 32" className={getClassName(ovestActive, ovestUrgent)} style={getStyle(ovestActive, ovestUrgent, '#fbbf24', 'rgba(251,191,36,0.8)', { top: '50%', left: '20px', transform: 'translateY(-50%)' })}>
        <polygon points="2,16 28,2 28,30" fill="#fbbf24" strokeWidth="0" />
      </svg>
    </>
  );
}
