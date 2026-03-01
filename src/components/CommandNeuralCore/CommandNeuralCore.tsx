import React, { useEffect, useRef } from 'react';
import { useVoiceAmplitude } from './useVoiceAmplitude';

export interface CommandNeuralCoreProps {
    size?: number; // default 280
    primaryColor?: string; // default #4FD1FF
    state?: "idle" | "listening" | "thinking" | "speaking";
    autoDetectVoice?: boolean;
    volume?: number; // Allows external volume input natively if not using the mic
}

export const CommandNeuralCore: React.FC<CommandNeuralCoreProps> = ({
    size = 280,
    primaryColor = '#4FD1FF',
    state = 'idle',
    autoDetectVoice = false,
    volume
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Real or simulated amplitude
    const realAmplitude = useVoiceAmplitude(autoDetectVoice);

    // Animation references
    const animRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);

    // Simulated amplitude if autoDetectVoice is false but state is speaking
    const simulatedAmpRef = useRef<number>(0);

    // Particle structure
    interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        angle: number;
        radius: number;
        baseOpacity: number;
        orbitSpeed: number;
    }

    // Init particles
    useEffect(() => {
        const numParticles = 30; // 24-36
        const p: Particle[] = [];
        const maxDist = (size / 2) * 0.85; // Constrained inside ring radius

        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * maxDist;
            p.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                angle: angle,
                radius: 1 + Math.random(), // Size: 1-2px
                baseOpacity: 0.2 + Math.random() * 0.4, // Opacity range: 0.2-0.6
                orbitSpeed: (Math.random() - 0.5) * 0.005,
            });
        }
        particlesRef.current = p;
    }, [size]);

    // Utility to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
        let r = 0, g = 0, b = 0;
        // 3 digits
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        }
        // 6 digits
        else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    // Set internal canvas resolution
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    // Set display size
    canvas.style.width = \`\${size}px\`;
    canvas.style.height = \`\${size}px\`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const ringRadius = size * 0.4;
    
    // Attempt parsing primary color to RGB for the gradient
    let rgbaBase = '';
    try {
      rgbaBase = hexToRgba(primaryColor, 1);
    } catch {
      rgbaBase = 'rgba(79, 209, 255, 1)'; // Fallback cyan
    }

    const renderLoop = (timestamp: number) => {
      // time in ms
      if (!timeRef.current) timeRef.current = timestamp;
      
      // Update simulated amplitude
      if (state === 'speaking') {
        if (!autoDetectVoice) {
           if (volume !== undefined) {
             simulatedAmpRef.current = volume;
           } else {
             // Simulate voice if not provided
             const targetSim = 0.2 + 0.3 * Math.sin(timestamp * 0.005) + 0.2 * Math.sin(timestamp * 0.012);
             simulatedAmpRef.current += (Math.max(0, targetSim) - simulatedAmpRef.current) * 0.1;
           }
        }
      } else {
        simulatedAmpRef.current += (0 - simulatedAmpRef.current) * 0.1;
      }

      const activeAmp = autoDetectVoice ? realAmplitude : simulatedAmpRef.current;

      ctx.clearRect(0, 0, size, size);

      // --- STATE VARIABLES ---
      let ringScale = 1;
      let rotAngle = 0;
      let glowIntensity = 1; // Base glow 1
      let radialOpacity = 0.05; // IDLE -> 5%
      
      if (state === 'listening') {
        ringScale = 1 + Math.sin(timestamp * 0.002) * 0.02; // Slow breathing 1 -> 1.02
        radialOpacity = 0.10;
        glowIntensity = 3 + Math.sin(timestamp * 0.002) * 2;
      } else if (state === 'thinking') {
        rotAngle = (timestamp * 0.0003) % (Math.PI * 2); // 8-12 seconds full rotation approx
        ringScale = 1 - Math.abs(Math.sin(timestamp * 0.001)) * 0.02; // 0.98-1
        radialOpacity = 0.15;
        glowIntensity = 2; // Stable glow
      } else if (state === 'speaking') {
        ringScale = 1 + activeAmp * 0.06; // max 1.06
        radialOpacity = 0.10 + activeAmp * 0.20; // 10-30%
        glowIntensity = 3 + activeAmp * 10;
      }

      ctx.save();
      ctx.translate(center, center);

      // 3. RADIAL ENERGY FIELD (BACKGROUND)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ringRadius * 1.5 * ringScale);
      
      const rgbValues = rgbaBase.substring(rgbaBase.indexOf('(') + 1, rgbaBase.lastIndexOf(','));
      grad.addColorStop(0, \`rgba(\${rgbValues}, \${radialOpacity})\`); 
      grad.addColorStop(1, \`rgba(\${rgbValues}, 0)\`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 1.5 * ringScale, 0, Math.PI * 2);
      ctx.fill();

      // Apply rotation if thinking
      if (state === 'thinking') {
        ctx.rotate(rotAngle);
      }

      // 1. TACTICAL NEURAL RING
      // Micro distortion for speaking
      let distortion = 0;
      if (state === 'speaking') {
        distortion = activeAmp * 2;
      }

      ctx.beginPath();
      for (let i = 0; i <= Math.PI * 2 + 0.1; i += 0.1) {
        let r = ringRadius * ringScale;
        if (state === 'speaking') {
          // Subtle radial micro-distortion
          r += Math.sin(i * 10 + timestamp * 0.01) * distortion;
        }
        const x = Math.cos(i) * r;
        const y = Math.sin(i) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Ring Stroke
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = primaryColor;
      
      // Very subtle shadow blur
      if (glowIntensity > 0) {
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = glowIntensity;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Thinking: Segmented highlights
      if (state === 'thinking') {
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * ringScale, 0, Math.PI * 0.25);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * ringScale, Math.PI, Math.PI * 1.25);
        ctx.stroke();
      }

      // Undo rotation for particles to control them globally relative to true center
      if (state === 'thinking') {
        ctx.rotate(-rotAngle);
      }

      // 2. INTERNAL PARTICLE FIELD
      const maxParticleDist = ringRadius * ringScale * 0.95;
      
      // Update particles
      particlesRef.current.forEach((p, index) => {
        // Base behavior
        let velMult = 1;
        if (state === 'listening') velMult = 1.5;
        if (state === 'speaking') velMult = 1 + activeAmp * 4;

        if (state === 'thinking') {
          // Particles form a subtle rotating spiral structure
          const targetAngle = p.angle + timestamp * 0.0002 + (Math.sqrt(p.x * p.x + p.y * p.y) * 0.015);
          const currentR = Math.sqrt(p.x * p.x + p.y * p.y);
          // Lerp gently to spiral position
          const targetX = Math.cos(targetAngle) * currentR;
          const targetY = Math.sin(targetAngle) * currentR;
          p.x += (targetX - p.x) * 0.05;
          p.y += (targetY - p.y) * 0.05;
        } else {
          // Normal slow drift
          p.x += p.vx * velMult;
          p.y += p.vy * velMult;
          
          // Radial push on speaking
          if (state === 'speaking' && activeAmp > 0.05) {
            const mag = Math.sqrt(p.x * p.x + p.y * p.y);
            if (mag > 0) {
              p.x += (p.x / mag) * activeAmp * 1.5;
              p.y += (p.y / mag) * activeAmp * 1.5;
            }
          }

          // Constrain inside ring
          const currentDist = Math.sqrt(p.x * p.x + p.y * p.y);
          if (currentDist > maxParticleDist) {
            p.vx = -p.vx;
            p.vy = -p.vy;
            const overlap = currentDist - maxParticleDist;
            if (currentDist > 0) {
              p.x -= (p.x / currentDist) * overlap;
              p.y -= (p.y / currentDist) * overlap;
            }
          }
        }
      });

      // Render connection lines (Thinking & Speaking)
      if (state === 'thinking' || state === 'speaking') {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particlesRef.current.length; i++) {
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            const p1 = particlesRef.current[i];
            const p2 = particlesRef.current[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const connectDist = state === 'thinking' ? 40 : 50 + activeAmp * 20;

            if (dist < connectDist) {
              let lineOpacity = (1 - dist / connectDist) * 0.3;
              if (state === 'thinking') lineOpacity *= 0.5; // Faint lines

              // Fallback directly to rgb for lines, ensuring valid color
              const lineRgb = rgbValues || '100, 200, 255'; 
              ctx.strokeStyle = \`rgba(\${lineRgb}, \${lineOpacity})\`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      // Render points
      ctx.fillStyle = primaryColor;
      particlesRef.current.forEach(p => {
        let popacity = p.baseOpacity;
        if (state === 'listening') popacity = Math.min(1, popacity + 0.1);
        if (state === 'speaking') popacity = Math.min(1, popacity + activeAmp * 0.4);

        ctx.globalAlpha = popacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animRef.current = requestAnimationFrame(renderLoop);
    };

    timeRef.current = performance.now();
    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [size, primaryColor, state, autoDetectVoice, realAmplitude, volume]);

  return (
    <div style={{ width: size, height: size, margin: 'auto' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', outline: 'none' }} />
    </div>
  );
};
