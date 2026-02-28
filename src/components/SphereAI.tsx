export type SphereState = "idle" | "thinking" | "speaking";

export default function SphereAI({ 
  state = "idle",
  size = 130
}: { 
  state?: SphereState;
  size?: number;
}) {
  const wrapSize = size + 30;

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      width: wrapSize, 
      height: wrapSize,
      flexShrink: 0
    }}>
      <div 
        style={{ position: "relative", width: size, height: size, borderRadius: "50%" }}
        className={`sphere-root sphere-${state}`}
      >
        <div className="sphere-inner" />
        <div className="sphere-glow" />
        <div className="sphere-ring" />
      </div>

      <style>{`
        .sphere-inner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          transition: background 0.8s ease, box-shadow 0.8s ease;
        }
        .sphere-glow {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          filter: blur(10px);
          transition: background 0.8s ease, opacity 0.8s ease;
          pointer-events: none;
        }
        .sphere-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          pointer-events: none;
        }

        /* IDLE */
        .sphere-idle .sphere-inner {
          background: radial-gradient(circle at 35% 30%,
            #c4b5fd, #7c3aed, #4c1d95, #1e1b4b);
          box-shadow:
            inset -8px -8px 20px rgba(0,0,0,0.5),
            inset 4px 4px 12px rgba(196,181,253,0.2);
          animation: breathe 4s ease-in-out infinite;
        }
        .sphere-idle .sphere-glow {
          background: radial-gradient(circle,
            rgba(124,58,237,0.4) 0%, rgba(99,38,221,0.15) 40%, transparent 70%);
          animation: glow-breathe 4s ease-in-out infinite;
        }
        .sphere-idle .sphere-ring {
          border: 1px solid rgba(167,139,250,0.2);
          animation: orbit 8s linear infinite;
        }

        /* THINKING */
        .sphere-thinking .sphere-inner {
          background: radial-gradient(circle at 35% 30%,
            #fed7aa, #f97316, #7c2d12, #1e1b4b);
          box-shadow:
            inset -8px -8px 20px rgba(0,0,0,0.5),
            inset 4px 4px 12px rgba(254,215,170,0.3),
            0 0 40px rgba(249,115,22,0.4);
          animation: thinking 0.9s ease-in-out infinite;
        }
        .sphere-thinking .sphere-glow {
          background: radial-gradient(circle,
            rgba(249,115,22,0.5) 0%, rgba(234,88,12,0.2) 40%, transparent 70%);
          animation: glow-thinking 0.9s ease-in-out infinite;
        }
        .sphere-thinking .sphere-ring {
          border: 1px solid rgba(251,146,60,0.3);
          animation: orbit-fast 1.5s linear infinite;
        }

        /* SPEAKING */
        .sphere-speaking .sphere-inner {
          background: radial-gradient(circle at 35% 30%,
            #a7f3d0, #10b981, #065f46, #1e1b4b);
          box-shadow:
            inset -8px -8px 20px rgba(0,0,0,0.5),
            0 0 50px rgba(16,185,129,0.45);
          animation: speaking 1.2s ease-in-out infinite;
        }
        .sphere-speaking .sphere-glow {
          background: radial-gradient(circle,
            rgba(16,185,129,0.45) 0%, rgba(5,150,105,0.2) 40%, transparent 70%);
          animation: glow-breathe 1.2s ease-in-out infinite;
        }
        .sphere-speaking .sphere-ring {
          border: 1px solid rgba(52,211,153,0.25);
          animation: orbit 3s linear infinite;
        }

        @keyframes breathe {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes glow-breathe {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) scaleX(1.5); }
          to   { transform: rotate(360deg) scaleX(1.5); }
        }
        @keyframes orbit-fast {
          from { transform: rotate(0deg) scaleX(1.5); }
          to   { transform: rotate(360deg) scaleX(1.5); }
        }
        @keyframes thinking {
          0%   { transform: scale(0.96); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(0.96); }
        }
        @keyframes glow-thinking {
          0%,100% { opacity: 0.7; transform: scale(1.1); }
          50%      { opacity: 1;   transform: scale(1.35); }
        }
        @keyframes speaking {
          0%,100% { transform: scale(1)    translateY(0); }
          25%      { transform: scale(1.04) translateY(-4px); }
          75%      { transform: scale(0.97) translateY(4px); }
        }
      `}</style>
    </div>
  );
}
