/**
 * AudioWaveform — Animated SVG waveform that reacts to microphone volume.
 *
 * Props:
 *   volume    — number 0–1 (mic input level)
 *   isSpeaking — bool (true = Gemini is speaking audio, false = user is speaking)
 *
 * 5 bars animate in response to volume. Color:
 *   - indigo when Gemini is speaking (isSpeaking = true)
 *   - red when user is speaking (isSpeaking = false, during live session)
 */

import React from 'react';
import { motion } from 'framer-motion';

// Multipliers give each bar a slightly different height profile
const BAR_MULTIPLIERS = [0.6, 1.0, 1.4, 1.0, 0.6];

export const AudioWaveform = ({ volume = 0, isSpeaking = false }) => {
    const baseColor = isSpeaking ? '#818cf8' : '#f87171'; // indigo-400 : red-400

    return (
        <div className="flex items-center gap-[3px]" aria-hidden="true">
            {BAR_MULTIPLIERS.map((mult, i) => {
                const scaleY = Math.max(0.15, volume * mult * 3);
                return (
                    <motion.span
                        key={i}
                        className="block w-[2px] rounded-full origin-center"
                        style={{ height: 14, backgroundColor: baseColor }}
                        animate={{ scaleY }}
                        transition={{
                            duration: 0.1,
                            ease: 'easeOut',
                            // Slight stagger per bar for organic feel
                            delay: i * 0.01,
                        }}
                    />
                );
            })}
        </div>
    );
};
