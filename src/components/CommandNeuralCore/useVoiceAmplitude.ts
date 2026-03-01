import { useState, useEffect, useRef } from 'react';

export function useVoiceAmplitude(autoDetectVoice: boolean): number {
    const [amplitude, setAmplitude] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        if (!autoDetectVoice) {
            setAmplitude(0);
            return;
        }

        let isActive = true;

        async function setupAudio() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                if (!isActive) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                // @ts-ignore - Support Safari
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContextClass();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;

                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                sourceRef.current = source;
                streamRef.current = stream;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                let smoothAmplitude = 0;

                const update = () => {
                    if (!isActive || !analyserRef.current) return;

                    analyserRef.current.getByteTimeDomainData(dataArray);

                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const val = (dataArray[i] - 128) / 128; // value between -1 and 1
                        sum += val * val;
                    }
                    const rms = Math.sqrt(sum / dataArray.length);

                    // Map rms (usually 0 to 0.5) to a 0-1 scale safely
                    const rawAmplitude = Math.min(1, rms * 3);

                    // Linear interpolation for smoothing (lerp factor 0.1)
                    smoothAmplitude = smoothAmplitude + (rawAmplitude - smoothAmplitude) * 0.1;

                    setAmplitude(smoothAmplitude);
                    requestRef.current = requestAnimationFrame(update);
                };

                requestAnimationFrame(update);
            } catch (err) {
                console.error("Error accessing microphone for voice detection", err);
            }
        }

        setupAudio();

        return () => {
            isActive = false;
            cancelAnimationFrame(requestRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [autoDetectVoice]);

    return amplitude;
}
