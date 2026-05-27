import { useCallback, useRef } from "react";
import Sound from "react-native-sound";

// Enable playback in silence mode (iOS)
Sound.setCategory("Playback");

const CRACK_FILES = [
  "bone_break_large_1.mp3",
  "bone_break_large_2.mp3",
  "bone_break_small.mp3",
];

export function useCrackSound() {
  const lastCrackIdx = useRef<number>(-1);

  const playCrack = useCallback(() => {
    try {
      // Pick a random file that differs from the last one
      let idx: number;
      do {
        idx = Math.floor(Math.random() * CRACK_FILES.length);
      } while (idx === lastCrackIdx.current && CRACK_FILES.length > 1);
      lastCrackIdx.current = idx;

      const sound = new Sound(CRACK_FILES[idx], Sound.MAIN_BUNDLE, (err) => {
        if (err) return;
        sound.play(() => sound.release());
      });
    } catch {
      // silent
    }
  }, []);

  const playPop = useCallback(() => {
    // Re-use a crack sound for pop as well (can be swapped for a dedicated pop file later)
    playCrack();
  }, [playCrack]);

  const playTap = useCallback(() => {
    try {
      const sound = new Sound("tap.mp3", Sound.MAIN_BUNDLE, (err) => {
        if (err) return;
        sound.play(() => sound.release());
      });
    } catch {
      // silent
    }
  }, []);

  return { playCrack, playPop, playTap };
}
