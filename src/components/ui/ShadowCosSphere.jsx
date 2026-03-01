import React from 'react';
import { CommandNeuralCore } from '../CommandNeuralCore/CommandNeuralCore';

/**
 * ShadowCosSphere — Sfera animata del Shadow CoS
 * Wraps the CommandNeuralCore component to maintain existing proxy API.
 * Props:
 *   isSpeaking  — bool: AI parla (voce live o risposta streaming)
 *   isThinking  — bool: AI sta elaborando (query testo)
 *   volume      — number: Intensità del volume (0.0 - 1.0)
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
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <CommandNeuralCore
        size={240}
        primaryColor="#4FD1FF"
        state={state}
        autoDetectVoice={false}
        volume={volume}
      />
    </div>
  );
}
