import { useCallback, useRef } from "react";

// Sound plays via the Web Audio API on web browsers.
// On native devices, expo-haptics in treatment.tsx provides the primary tactile feedback.
// Native audio can be added with a development build + expo-audio.

function scheduleCrackSound(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const noise = (Math.random() * 2 - 1);
    const decay = Math.exp(-t * 28);
    data[i] = noise * decay * 0.7;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function schedulePopSound(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const osc = Math.sin(2 * Math.PI * 280 * t * Math.exp(-t * 18));
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40);
    data[i] = (osc * 0.5 + noise * 0.3) * Math.exp(-t * 22);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.9, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function useCrackSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof AudioContext === "undefined") return null;
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playCrack = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx) scheduleCrackSound(ctx);
    } catch {
      // silent
    }
  }, [getCtx]);

  const playPop = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx) schedulePopSound(ctx);
    } catch {
      // silent
    }
  }, [getCtx]);

  return { playCrack, playPop };
}
