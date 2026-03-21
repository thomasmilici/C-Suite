import React from 'react';
import { CommandNeuralCore } from '../CommandNeuralCore/CommandNeuralCore';

/**
 * ShadowCosSphere — Sfera animata del Shadow CoS (PromptPal Aesthetic)
 * Wraps the CommandNeuralCore component to maintain existing proxy API
 * while injecting massive ambient neon glows that bleed into the surrounding layout.
 */
export function ShadowCosSphere({ isSpeaking = false, isThinking = false, volume = 0 }) {
  let state = "idle";

  if (isSpeaking) {
    state = "speaking";
  } else if (isThinking) {
    state = "thinking";
  } else {
    state = "listening";
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none rounded-full overflow-visible">
      
      {/* Intense PromptPal Aura (bleeds under the nearby tiles to fill gaps) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(109,40,217,0.35)_0%,rgba(249,115,22,0.12)_40%,transparent_70%)] animate-pulse-slow pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(79,70,229,0.4)_0%,rgba(236,72,153,0.15)_50%,transparent_80%)] pointer-events-none -z-10 mix-blend-screen mix-blend-plus-lighter" />
      
      <CommandNeuralCore
        size={280} 
        primaryColor="#7c3aed" // vibrant deep purple #7c3aed
        state={state}
        autoDetectVoice={false}
        volume={volume}
      />
    </div>
  );
}
