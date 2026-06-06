import React, { useCallback, useEffect, useRef } from "react";
import { Animated, PanResponder, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { AilmentType, PatientType } from "../constants/patients";

const SVG_W = 200;
const SVG_H = 320;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export type Mood = "pain" | "angry" | "happy";

interface Props {
  patientType: PatientType;
  bodyColor: string;
  glowColor: string;
  accentColor: string;
  activeAilmentType: AilmentType | null;
  onAilmentComplete: () => void;
  onProgressChange?: (p: number) => void;
  width: number;
  height: number;
  tapCount?: number;
  mood?: Mood;
}

/* ── Mood-driven facial overlays ────────────────────────────────── */

/** Eyebrows / tears overlay — rendered AFTER normal eyes */
const renderMoodEyes = (
  mood: Mood,
  lx: number, rx: number, ey: number, er: number,
  faceColor: string, browColor: string,
) => {
  if (mood === "pain") {
    return (
      <G>
        <Path d={`M ${lx - er} ${ey - er - 4} Q ${lx} ${ey - er - 11} ${lx + er} ${ey - er - 6}`} stroke={browColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Path d={`M ${rx - er} ${ey - er - 6} Q ${rx} ${ey - er - 11} ${rx + er} ${ey - er - 4}`} stroke={browColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Ellipse cx={lx + er * 0.5} cy={ey + er + 6} rx={2} ry={4} fill="#88CCFF" opacity="0.75" />
      </G>
    );
  }
  if (mood === "angry") {
    return (
      <G>
        <Path d={`M ${lx - er - 2} ${ey - er - 8} L ${lx + er - 2} ${ey - er - 1}`} stroke={browColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <Path d={`M ${rx + er + 2} ${ey - er - 8} L ${rx - er + 2} ${ey - er - 1}`} stroke={browColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  // happy → ^ ^ closed eyes
  return (
    <G>
      <Circle cx={lx} cy={ey} r={er + 5} fill={faceColor} />
      <Circle cx={rx} cy={ey} r={er + 5} fill={faceColor} />
      <Path d={`M ${lx - er + 1} ${ey + 3} Q ${lx} ${ey - er} ${lx + er - 1} ${ey + 3}`} stroke={browColor} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d={`M ${rx - er + 1} ${ey + 3} Q ${rx} ${ey - er} ${rx + er - 1} ${ey + 3}`} stroke={browColor} strokeWidth="3" fill="none" strokeLinecap="round" />
    </G>
  );
};

/** Mood-driven mouth */
const renderMoodMouth = (
  mood: Mood,
  cx: number, y: number, hw: number, color: string,
) => {
  if (mood === "pain") {
    return <Path d={`M ${cx - hw} ${y + 4} Q ${cx} ${y - 8} ${cx + hw} ${y + 4}`} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  if (mood === "angry") {
    return (
      <G>
        <Path d={`M ${cx - hw} ${y} Q ${cx} ${y + 10} ${cx + hw} ${y}`} stroke={color} strokeWidth="3" fill={color} strokeLinecap="round" opacity="0.85" />
        <Path d={`M ${cx - hw + 3} ${y + 2} L ${cx - hw + 6} ${y + 5}`} stroke="white" strokeWidth="1.5" fill="none" opacity="0.7" />
        <Path d={`M ${cx + hw - 3} ${y + 2} L ${cx + hw - 6} ${y + 5}`} stroke="white" strokeWidth="1.5" fill="none" opacity="0.7" />
      </G>
    );
  }
  // happy
  return <Path d={`M ${cx - hw} ${y - 2} Q ${cx} ${y + 14} ${cx + hw} ${y - 2}`} stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
};

export default function PatientSVGModel({
  patientType,
  bodyColor,
  glowColor,
  accentColor,
  activeAilmentType,
  onAilmentComplete,
  onProgressChange,
  width,
  height,
  tapCount = 5,
  mood = "pain",
}: Props) {
  const neckStretch = useRef(new Animated.Value(0)).current;
  const backAngle = useRef(new Animated.Value(0)).current;
  const kneeAngle = useRef(new Animated.Value(0)).current;
  const handWiggle = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  const activeRef = useRef<AilmentType | null>(null);
  const successRef = useRef(false);
  const tapsRef = useRef(0);
  const onCompleteRef = useRef(onAilmentComplete);
  const onProgressRef = useRef(onProgressChange);
  const tapCountRef = useRef(tapCount);
  const patientTypeRef = useRef(patientType);

  useEffect(() => { activeRef.current = activeAilmentType; }, [activeAilmentType]);
  useEffect(() => { onCompleteRef.current = onAilmentComplete; }, [onAilmentComplete]);
  useEffect(() => { onProgressRef.current = onProgressChange; }, [onProgressChange]);
  useEffect(() => { tapCountRef.current = tapCount; }, [tapCount]);
  useEffect(() => { patientTypeRef.current = patientType; }, [patientType]);

  useEffect(() => {
    successRef.current = false;
    tapsRef.current = 0;
    Animated.spring(neckStretch, { toValue: 0, useNativeDriver: false }).start();
    Animated.spring(backAngle, { toValue: 0, useNativeDriver: false }).start();
    Animated.spring(kneeAngle, { toValue: 0, useNativeDriver: false }).start();
    Animated.spring(handWiggle, { toValue: 0, useNativeDriver: false }).start();
  }, [activeAilmentType]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(breathe, { toValue: 0, duration: 2200, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleSuccess = useCallback(() => {
    if (successRef.current) return;
    successRef.current = true;
    onProgressRef.current?.(1);
    setTimeout(() => onCompleteRef.current(), 50);
  }, []);

  const makeNeckPR = () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current === "NECK",
      onMoveShouldSetPanResponder: () => activeRef.current === "NECK",
      onPanResponderMove: (_, gs) => {
        if (activeRef.current !== "NECK" || successRef.current) return;
        const pt = patientTypeRef.current;
        let delta = 0;
        if (pt === "HARPY" || pt === "CRYSTAL_DEER") {
          delta = Math.min(1, Math.abs(gs.dx) / 90);
        } else if (pt === "ICE_YETI") {
          delta = Math.min(1, Math.max(0, -gs.dy) / 90);
        } else {
          delta = Math.min(1, Math.max(0, gs.dy) / 100);
        }
        neckStretch.setValue(delta);
        onProgressRef.current?.(delta);
        if (delta >= 0.88) handleSuccess();
      },
      onPanResponderRelease: () => {
        if (!successRef.current) {
          Animated.spring(neckStretch, { toValue: 0, useNativeDriver: false }).start();
          onProgressRef.current?.(0);
        }
      },
    });

  const makeBackPR = () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current === "BACK",
      onMoveShouldSetPanResponder: () => activeRef.current === "BACK",
      onPanResponderMove: (_, gs) => {
        if (activeRef.current !== "BACK" || successRef.current) return;
        const delta = Math.min(1, Math.max(0, -gs.dy) / 105);
        backAngle.setValue(delta);
        onProgressRef.current?.(delta);
        if (delta >= 0.88) handleSuccess();
      },
      onPanResponderRelease: () => {
        if (!successRef.current) {
          Animated.spring(backAngle, { toValue: 0, useNativeDriver: false }).start();
          onProgressRef.current?.(0);
        }
      },
    });

  const makeKneePR = () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current === "KNEE",
      onMoveShouldSetPanResponder: () => activeRef.current === "KNEE",
      onPanResponderMove: (_, gs) => {
        if (activeRef.current !== "KNEE" || successRef.current) return;
        const delta = Math.min(1, Math.max(0, gs.dy) / 90);
        kneeAngle.setValue(delta);
        onProgressRef.current?.(delta);
        if (delta >= 0.88) handleSuccess();
      },
      onPanResponderRelease: () => {
        if (!successRef.current) {
          Animated.spring(kneeAngle, { toValue: 0, useNativeDriver: false }).start();
          onProgressRef.current?.(0);
        }
      },
    });

  const makeHandPR = () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current === "HAND",
      onMoveShouldSetPanResponder: () => activeRef.current === "HAND",
      onPanResponderGrant: () => {
        if (activeRef.current !== "HAND" || successRef.current) return;
        tapsRef.current += 1;
        const progress = Math.min(1, tapsRef.current / tapCountRef.current);
        handWiggle.setValue(1);
        Animated.spring(handWiggle, { toValue: 0, tension: 400, friction: 4, useNativeDriver: false }).start();
        onProgressRef.current?.(progress);
        if (tapsRef.current >= tapCountRef.current) handleSuccess();
      },
    });

  const neckPR = useRef(makeNeckPR()).current;
  const backPR = useRef(makeBackPR()).current;
  const kneePR = useRef(makeKneePR()).current;
  const handPR = useRef(makeHandPR()).current;

  const sx = width / SVG_W;
  const sy = height / SVG_H;

  const neckScaleY   = neckStretch.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const neckHeadTY   = neckStretch.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const neckTiltDeg  = neckStretch.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "28deg"] });
  const backRotate   = backAngle.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-24deg"] });
  const backScaleY   = backAngle.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const kneeTY       = kneeAngle.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });
  const handTX       = handWiggle.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const breathScale  = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });

  const isNeck = activeAilmentType === "NECK" || activeAilmentType === "TEETH" || activeAilmentType === "EYE" || activeAilmentType === "HEAD";
  const isBack = activeAilmentType === "BACK" || activeAilmentType === "CHEST" || activeAilmentType === "STOMACH";
  const isKnee = activeAilmentType === "LEG";
  const isHand = activeAilmentType === "HAND";

  const zones: Record<string, { x: number; y: number; w: number; h: number }> = {
    GOLEM_NECK:           { x: 82*sx,  y: 118*sy, w: 36*sx,  h: 52*sy  },
    GOLEM_BACK:           { x: 32*sx,  y: 148*sy, w: 136*sx, h: 130*sy },
    HARPY_NECK:           { x: 78*sx,  y: 88*sy,  w: 44*sx,  h: 60*sy  },
    HARPY_BACK:           { x: 44*sx,  y: 120*sy, w: 112*sx, h: 100*sy },
    EMBER_KITTEN_KNEE:    { x: 58*sx,  y: 258*sy, w: 42*sx,  h: 60*sy  },
    EMBER_KITTEN_BACK:    { x: 36*sx,  y: 140*sy, w: 128*sx, h: 128*sy },
    ICE_YETI_NECK:        { x: 42*sx,  y: 118*sy, w: 116*sx, h: 50*sy  },
    MUSHROOM_SPRITE_BACK: { x: 68*sx,  y: 124*sy, w: 64*sx,  h: 95*sy  },
    MUSHROOM_SPRITE_KNEE: { x: 58*sx,  y: 275*sy, w: 50*sx,  h: 38*sy  },
    MINI_DRAGON_NECK:     { x: 78*sx,  y: 122*sy, w: 44*sx,  h: 56*sy  },
    MINI_DRAGON_BACK:     { x: 34*sx,  y: 128*sy, w: 132*sx, h: 148*sy },
    CRYSTAL_DEER_NECK:    { x: 84*sx,  y: 143*sy, w: 32*sx,  h: 88*sy  },
    CRYSTAL_DEER_KNEE:    { x: 60*sx,  y: 248*sy, w: 34*sx,  h: 32*sy  },
    LAVA_BLOB_BACK:       { x: 24*sx,  y: 102*sy, w: 152*sx, h: 185*sy },
    MOON_BUNNY_NECK:      { x: 60*sx,  y: 16*sy,  w: 80*sx,  h: 108*sy },
    MOON_BUNNY_KNEE:      { x: 104*sx, y: 252*sy, w: 52*sx,  h: 68*sy  },
  };

  const getZone = () => {
    const t = patientType;
    if (isNeck) return { zone: zones[`${t}_NECK`]  ?? zones.GOLEM_NECK, pr: neckPR };
    if (isBack) return { zone: zones[`${t}_BACK`]  ?? zones.GOLEM_BACK, pr: backPR };
    if (isKnee) return { zone: zones[`${t}_KNEE`]  ?? zones.EMBER_KITTEN_KNEE, pr: kneePR };
    if (isHand) return { zone: zones[`${t}_HAND`]  ?? zones.HARPY_HAND, pr: handPR };
    return null;
  };

  const zoneInfo = getZone();

  // ─── GOLEM ────────────────────────────────────────────────────────────────
  const renderGolem = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="gHead" cx="38%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#C4B48A" /><Stop offset="100%" stopColor={accentColor} />
        </RadialGradient>
        <RadialGradient id="gBody" cx="42%" cy="25%" r="70%">
          <Stop offset="0%" stopColor={glowColor} /><Stop offset="100%" stopColor={accentColor} />
        </RadialGradient>
        <RadialGradient id="gLimb" cx="45%" cy="30%" r="65%">
          <Stop offset="0%" stopColor={bodyColor} /><Stop offset="100%" stopColor={accentColor} />
        </RadialGradient>
      </Defs>
      <AnimatedG style={{ transform: [{ scale: breathScale }] }}>
        <Rect x="18" y="148" width="28" height="88" rx="14" fill="url(#gLimb)" />
        <Rect x="14" y="225" width="36" height="24" rx="12" fill="url(#gLimb)" />
      </AnimatedG>
      <Rect x="154" y="148" width="28" height="88" rx="14" fill="url(#gLimb)" />
      <Rect x="150" y="225" width="36" height="24" rx="12" fill="url(#gLimb)" />
      <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
        <Ellipse cx="100" cy="222" rx="68" ry="76" fill="url(#gBody)" />
        <Ellipse cx="95" cy="210" rx="28" ry="22" fill="rgba(255,255,255,0.08)" />
        <Path d="M 82 195 Q 88 205 82 216" stroke={accentColor} strokeWidth="2" fill="none" opacity="0.5" />
        <Path d="M 110 208 Q 118 218 114 232" stroke={accentColor} strokeWidth="2" fill="none" opacity="0.5" />
        {isBack && <Ellipse cx="100" cy="222" rx="70" ry="78" fill="rgba(255,215,0,0.18)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <Rect x="63" y="285" width="30" height="32" rx="6" fill="url(#gLimb)" />
      <Rect x="107" y="285" width="30" height="32" rx="6" fill="url(#gLimb)" />
      <AnimatedG style={{ transform: [{ scaleY: neckScaleY }] }}>
        <Rect x="87" y="128" width="26" height="36" rx="12" fill="url(#gLimb)" />
        {isNeck && <Rect x="85" y="126" width="30" height="40" rx="14" fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2" />}
      </AnimatedG>
      <AnimatedG style={{ transform: [{ translateY: neckHeadTY }] }}>
        <Circle cx="100" cy="78" r="54" fill="url(#gHead)" />
        <Ellipse cx="88" cy="64" rx="16" ry="13" fill="white" />
        <Ellipse cx="112" cy="64" rx="16" ry="13" fill="white" />
        <Circle cx="90" cy="66" r="9" fill="#2C1A0E" />
        <Circle cx="114" cy="66" r="9" fill="#2C1A0E" />
        <Circle cx="92" cy="63" r="4" fill="white" />
        <Circle cx="116" cy="63" r="4" fill="white" />
        <Ellipse cx="74" cy="82" rx="11" ry="7" fill="#FFB8A0" opacity="0.55" />
        <Ellipse cx="126" cy="82" rx="11" ry="7" fill="#FFB8A0" opacity="0.55" />
        {renderMoodMouth(mood, 100, 92, 13, "#6B4A2E")}
        {renderMoodEyes(mood, 90, 114, 66, 9, "#C4B48A", "#6B4A2E")}
        <Path d="M 68 60 Q 76 54 72 68" stroke={accentColor} strokeWidth="2" fill="none" opacity="0.4" />
        <Path d="M 122 54 Q 130 62 126 72" stroke={accentColor} strokeWidth="2" fill="none" opacity="0.4" />
      </AnimatedG>
    </Svg>
  );

  // ─── HARPY ────────────────────────────────────────────────────────────────
  const renderHarpy = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="hHead" cx="38%" cy="28%" r="66%">
          <Stop offset="0%" stopColor="#FAFAFF" /><Stop offset="100%" stopColor={bodyColor} />
        </RadialGradient>
        <RadialGradient id="hBody" cx="40%" cy="26%" r="68%">
          <Stop offset="0%" stopColor={glowColor} /><Stop offset="100%" stopColor={bodyColor} />
        </RadialGradient>
        <RadialGradient id="hWing" cx="60%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={glowColor} /><Stop offset="100%" stopColor={accentColor} />
        </RadialGradient>
      </Defs>
      <AnimatedG style={{ transform: [{ translateX: isHand ? handTX : new Animated.Value(0) }] }}>
        <Ellipse cx="38" cy="168" rx="34" ry="56" fill="url(#hWing)" />
        <Ellipse cx="30" cy="172" rx="20" ry="38" fill="rgba(255,255,255,0.22)" />
        <Path d="M 12 148 Q 32 136 40 158" fill={accentColor} opacity="0.45" />
        <Path d="M 8 168 Q 28 157 37 178" fill={accentColor} opacity="0.45" />
        <Path d="M 10 188 Q 30 182 36 202" fill={accentColor} opacity="0.45" />
        {isHand && <Ellipse cx="38" cy="168" rx="37" ry="60" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <Ellipse cx="162" cy="168" rx="34" ry="56" fill="url(#hWing)" />
      <Ellipse cx="170" cy="172" rx="20" ry="38" fill="rgba(255,255,255,0.22)" />
      <Path d="M 188 148 Q 168 136 160 158" fill={accentColor} opacity="0.45" />
      <Path d="M 192 168 Q 172 157 163 178" fill={accentColor} opacity="0.45" />
      <AnimatedG style={{ transform: [{ scale: breathScale }] }}>
        <Ellipse cx="100" cy="212" rx="46" ry="58" fill="url(#hBody)" />
        <Ellipse cx="95" cy="202" rx="20" ry="18" fill="rgba(255,255,255,0.15)" />
      </AnimatedG>
      <Path d="M 82 268 Q 76 296 70 312" stroke={accentColor} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.8" />
      <Path d="M 100 272 Q 100 300 100 316" stroke={accentColor} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.8" />
      <Path d="M 118 268 Q 124 296 130 312" stroke={accentColor} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.8" />
      <AnimatedG style={{ transform: [{ rotate: neckTiltDeg }] }}>
        <Ellipse cx="100" cy="140" rx="18" ry="28" fill="url(#hBody)" />
        <Ellipse cx="96" cy="135" rx="10" ry="16" fill="rgba(255,255,255,0.18)" />
        <Circle cx="100" cy="100" r="44" fill="url(#hHead)" />
        <Ellipse cx="78" cy="70" rx="14" ry="10" fill="rgba(255,255,255,0.4)" />
        <Ellipse cx="100" cy="63" rx="12" ry="9" fill="rgba(255,255,255,0.4)" />
        <Ellipse cx="122" cy="70" rx="14" ry="10" fill="rgba(255,255,255,0.4)" />
        <Path d="M 93 108 L 100 120 L 107 108 Z" fill="#FFD166" />
        <Ellipse cx="84" cy="96" rx="13" ry="14" fill="white" />
        <Ellipse cx="116" cy="96" rx="13" ry="14" fill="white" />
        <Circle cx="85" cy="98" r="8" fill="#1A1A2E" />
        <Circle cx="117" cy="98" r="8" fill="#1A1A2E" />
        <Circle cx="83" cy="96" r="3.5" fill="white" />
        <Circle cx="115" cy="96" r="3.5" fill="white" />
        <Ellipse cx="72" cy="108" rx="9" ry="6" fill="#FFB8EA" opacity="0.5" />
        <Ellipse cx="128" cy="108" rx="9" ry="6" fill="#FFB8EA" opacity="0.5" />
        {renderMoodEyes(mood, 85, 117, 98, 8, "#FAFAFF", "#3A3A5E")}
        {isNeck && <Circle cx="100" cy="100" r="47" fill="rgba(255,215,0,0.18)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
    </Svg>
  );

  // ─── EMBER KITTEN ─────────────────────────────────────────────────────────
  const renderKitten = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="kHead" cx="36%" cy="26%" r="66%">
          <Stop offset="0%" stopColor="#FFCC80" /><Stop offset="100%" stopColor={accentColor} />
        </RadialGradient>
        <RadialGradient id="kBody" cx="38%" cy="24%" r="70%">
          <Stop offset="0%" stopColor={glowColor} /><Stop offset="100%" stopColor={bodyColor} />
        </RadialGradient>
        <RadialGradient id="kGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFE066" stopOpacity="0.8" /><Stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d="M 150 252 Q 178 228 180 198 Q 185 168 172 158" stroke={bodyColor} strokeWidth="18" fill="none" strokeLinecap="round" />
      <Path d="M 150 252 Q 178 228 180 198 Q 185 168 172 158" stroke={glowColor} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
      <Ellipse cx="100" cy="218" rx="62" ry="72" fill="url(#kGlow)" />
      <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
        <Ellipse cx="100" cy="218" rx="55" ry="66" fill="url(#kBody)" />
        <Ellipse cx="95" cy="206" rx="24" ry="20" fill="rgba(255,255,255,0.14)" />
        {isBack && <Ellipse cx="100" cy="218" rx="58" ry="69" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <AnimatedG style={{ transform: [{ translateY: kneeTY }] }}>
        <Rect x="66" y="272" width="26" height="46" rx="13" fill="url(#kBody)" />
        <Circle cx="79" cy="318" r="12" fill="url(#kBody)" />
        {isKnee && <Rect x="62" y="265" width="34" height="58" rx="16" fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <Rect x="108" y="272" width="26" height="46" rx="13" fill="url(#kBody)" />
      <Circle cx="121" cy="318" r="12" fill="url(#kBody)" />
      <Rect x="87" y="138" width="26" height="40" rx="12" fill="url(#kBody)" />
      <Circle cx="100" cy="104" r="50" fill="url(#kHead)" />
      <Ellipse cx="95" cy="92" rx="22" ry="18" fill="rgba(255,255,255,0.14)" />
      <Path d="M 64 72 L 55 40 L 84 62 Z" fill={bodyColor} />
      <Path d="M 136 72 L 145 40 L 116 62 Z" fill={bodyColor} />
      <Path d="M 66 70 L 59 46 L 82 63 Z" fill={accentColor} opacity="0.5" />
      <Path d="M 134 70 L 141 46 L 118 63 Z" fill={accentColor} opacity="0.5" />
      <Ellipse cx="84" cy="100" rx="14" ry="15" fill="white" />
      <Ellipse cx="116" cy="100" rx="14" ry="15" fill="white" />
      <Circle cx="85" cy="102" r="9" fill="#2C1A0E" />
      <Circle cx="117" cy="102" r="9" fill="#2C1A0E" />
      <Circle cx="83" cy="99" r="4" fill="white" />
      <Circle cx="115" cy="99" r="4" fill="white" />
      <Path d="M 96 112 L 100 117 L 104 112 Z" fill={accentColor} />
      {renderMoodMouth(mood, 100, 122, 12, "#6B4A2E")}
      {renderMoodEyes(mood, 85, 117, 102, 9, "#FFCC80", "#6B4A2E")}
      <Ellipse cx="72" cy="112" rx="10" ry="6" fill="#FF8C00" opacity="0.4" />
      <Ellipse cx="128" cy="112" rx="10" ry="6" fill="#FF8C00" opacity="0.4" />
      <Circle cx="58" cy="195" r="4.5" fill="#FFD166" opacity="0.65" />
      <Circle cx="142" cy="218" r="3.5" fill="#FFD166" opacity="0.5" />
    </Svg>
  );

  // ─── ICE YETI ─────────────────────────────────────────────────────────────
  const renderYeti = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="yBody" cx="36%" cy="26%" r="70%">
          <Stop offset="0%" stopColor="#FCFEFF" /><Stop offset="100%" stopColor={bodyColor} />
        </RadialGradient>
        <RadialGradient id="yLimb" cx="42%" cy="30%" r="65%">
          <Stop offset="0%" stopColor={glowColor} /><Stop offset="100%" stopColor={bodyColor} />
        </RadialGradient>
      </Defs>
      <AnimatedG style={{ transform: [{ scale: breathScale }] }}>
        <Ellipse cx="100" cy="200" rx="85" ry="97" fill="url(#yBody)" />
        <Ellipse cx="100" cy="200" rx="75" ry="87" fill="none" stroke={glowColor} strokeWidth="6" opacity="0.45" />
        <Ellipse cx="100" cy="200" rx="62" ry="74" fill="none" stroke={glowColor} strokeWidth="4" opacity="0.25" />
        <Ellipse cx="88" cy="182" rx="26" ry="20" fill="rgba(255,255,255,0.25)" />
      </AnimatedG>
      <AnimatedG style={{ transform: [{ translateX: handTX }] }}>
        <Ellipse cx="22" cy="186" rx="21" ry="42" fill="url(#yLimb)" />
        <Ellipse cx="20" cy="218" rx="16" ry="18" fill="url(#yLimb)" />
        <Ellipse cx="11" cy="232" rx="8" ry="13" fill="url(#yLimb)" />
        <Ellipse cx="20" cy="236" rx="8" ry="13" fill="url(#yLimb)" />
        <Ellipse cx="29" cy="232" rx="8" ry="13" fill="url(#yLimb)" />
        {isHand && <Ellipse cx="22" cy="200" rx="26" ry="56" fill="rgba(255,215,0,0.22)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <Ellipse cx="178" cy="186" rx="21" ry="42" fill="url(#yLimb)" />
      <Ellipse cx="180" cy="218" rx="16" ry="18" fill="url(#yLimb)" />
      <Ellipse cx="189" cy="232" rx="8" ry="13" fill="url(#yLimb)" />
      <Ellipse cx="180" cy="236" rx="8" ry="13" fill="url(#yLimb)" />
      <Ellipse cx="72" cy="292" rx="32" ry="17" fill="url(#yLimb)" />
      <Ellipse cx="128" cy="292" rx="32" ry="17" fill="url(#yLimb)" />
      <AnimatedG style={{ transform: [{ translateY: neckHeadTY.interpolate({ inputRange: [0, 50], outputRange: [0, -22] }) }] }}>
        <Ellipse cx="82" cy="162" rx="18" ry="19" fill="white" />
        <Ellipse cx="118" cy="162" rx="18" ry="19" fill="white" />
        <Circle cx="84" cy="164" r="10" fill="#2C3E50" />
        <Circle cx="120" cy="164" r="10" fill="#2C3E50" />
        <Circle cx="81" cy="162" r="4.5" fill="white" />
        <Circle cx="117" cy="162" r="4.5" fill="white" />
        <Ellipse cx="100" cy="180" rx="9" ry="7" fill={accentColor} />
        {renderMoodMouth(mood, 100, 194, 15, "#4A6572")}
        {renderMoodEyes(mood, 84, 120, 164, 10, "#FCFEFF", "#4A6572")}
        <Ellipse cx="68" cy="175" rx="13" ry="8" fill="#B8D8F0" opacity="0.55" />
        <Ellipse cx="132" cy="175" rx="13" ry="8" fill="#B8D8F0" opacity="0.55" />
        {isNeck && <Ellipse cx="100" cy="152" rx="60" ry="44" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      <Circle cx="52" cy="136" r="3.5" fill="white" opacity="0.85" />
      <Circle cx="150" cy="120" r="3" fill="white" opacity="0.75" />
      <Circle cx="38" cy="162" r="2.5" fill="white" opacity="0.7" />
      <Circle cx="162" cy="150" r="3.5" fill="white" opacity="0.7" />
    </Svg>
  );

  // ─── MUSHROOM SPRITE ──────────────────────────────────────────────────────
  const renderMushroom = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="mCap" cx="35%" cy="28%" r="70%">
          <Stop offset="0%" stopColor="#EAC8DE" /><Stop offset="100%" stopColor="#A870A8" />
        </RadialGradient>
        <RadialGradient id="mStem" cx="40%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#F0DEC0" /><Stop offset="100%" stopColor="#D0A880" />
        </RadialGradient>
        <RadialGradient id="mFace" cx="38%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#EDD8C8" /><Stop offset="100%" stopColor="#C8A880" />
        </RadialGradient>
      </Defs>
      {/* Arms */}
      <Ellipse cx="50" cy="168" rx="17" ry="24" fill="url(#mStem)" />
      <Circle cx="42" cy="190" r="13" fill="url(#mStem)" />
      <Ellipse cx="150" cy="168" rx="17" ry="24" fill="url(#mStem)" />
      <Circle cx="158" cy="190" r="13" fill="url(#mStem)" />
      {/* Stem body */}
      <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
        <Rect x="72" y="128" width="56" height="88" rx="28" fill="url(#mStem)" />
        <Ellipse cx="100" cy="172" rx="20" ry="15" fill="rgba(255,255,255,0.18)" />
        {isBack && <Rect x="70" y="126" width="60" height="92" rx="30" fill="rgba(255,215,0,0.22)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Legs */}
      <Rect x="72" y="215" width="22" height="68" rx="11" fill="url(#mStem)" />
      <Rect x="106" y="215" width="22" height="68" rx="11" fill="url(#mStem)" />
      {/* Feet - animated for KNEE */}
      <AnimatedG style={{ transform: [{ translateY: kneeTY }] }}>
        <Ellipse cx="83" cy="296" rx="22" ry="14" fill="url(#mStem)" />
        {isKnee && <Ellipse cx="83" cy="296" rx="26" ry="18" fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2" />}
      </AnimatedG>
      <Ellipse cx="117" cy="296" rx="22" ry="14" fill="url(#mStem)" />
      {/* Face under cap */}
      <AnimatedG style={{ transform: [{ translateY: neckHeadTY }] }}>
        <Circle cx="100" cy="112" r="34" fill="url(#mFace)" />
        <Ellipse cx="100" cy="110" rx="22" ry="18" fill="rgba(255,255,255,0.2)" />
        <Circle cx="88" cy="108" r="12" fill="white" />
        <Circle cx="112" cy="108" r="12" fill="white" />
        <Circle cx="89" cy="110" r="7" fill="#2C1A0E" />
        <Circle cx="113" cy="110" r="7" fill="#2C1A0E" />
        <Circle cx="87" cy="107" r="3" fill="white" />
        <Circle cx="111" cy="107" r="3" fill="white" />
        <Ellipse cx="74" cy="116" rx="9" ry="5" fill="#FFB8A0" opacity="0.55" />
        <Ellipse cx="126" cy="116" rx="9" ry="5" fill="#FFB8A0" opacity="0.55" />
        {renderMoodMouth(mood, 100, 122, 12, "#6B4A2E")}
        {renderMoodEyes(mood, 89, 113, 110, 7, "#EDD8C8", "#6B4A2E")}
      </AnimatedG>
      {/* Mushroom cap - floats with head */}
      <AnimatedG style={{ transform: [{ translateY: neckHeadTY }] }}>
        <Ellipse cx="100" cy="72" rx="82" ry="52" fill="url(#mCap)" />
        <Ellipse cx="80" cy="55" rx="28" ry="18" fill="rgba(255,255,255,0.22)" />
        <Circle cx="70" cy="68" r="9" fill="rgba(255,255,255,0.38)" />
        <Circle cx="100" cy="57" r="7" fill="rgba(255,255,255,0.38)" />
        <Circle cx="130" cy="65" r="10" fill="rgba(255,255,255,0.38)" />
        <Circle cx="116" cy="52" r="5" fill="rgba(255,255,255,0.38)" />
      </AnimatedG>
    </Svg>
  );

  // ─── MINI DRAGON ──────────────────────────────────────────────────────────
  const renderDragon = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="dBody" cx="35%" cy="25%" r="70%">
          <Stop offset="0%" stopColor="#A88AD4" /><Stop offset="100%" stopColor="#523A7A" />
        </RadialGradient>
        <RadialGradient id="dHead" cx="38%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#BBA8E4" /><Stop offset="100%" stopColor="#7B5EA7" />
        </RadialGradient>
        <RadialGradient id="dWing" cx="40%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#8870B8" /><Stop offset="100%" stopColor="#4A3070" />
        </RadialGradient>
      </Defs>
      {/* Tail */}
      <Path d="M 148 248 Q 175 228 180 195 Q 183 165 165 148" stroke="#7B5EA7" strokeWidth="18" fill="none" strokeLinecap="round" />
      <Path d="M 148 248 Q 175 228 180 195 Q 183 165 165 148" stroke="#A88AD4" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Wings + body */}
      <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
        <Path d="M 38 152 Q 18 118 42 92 Q 62 70 78 120" fill="url(#dWing)" />
        <Path d="M 40 134 Q 26 116 44 102 Q 58 90 70 116" fill="rgba(255,255,255,0.12)" />
        <Path d="M 162 152 Q 182 118 158 92 Q 138 70 122 120" fill="url(#dWing)" />
        <Ellipse cx="100" cy="200" rx="62" ry="72" fill="url(#dBody)" />
        <Ellipse cx="92" cy="185" rx="24" ry="18" fill="rgba(255,255,255,0.14)" />
        <Ellipse cx="100" cy="210" rx="30" ry="38" fill="rgba(255,255,255,0.08)" stroke="#A88AD4" strokeWidth="1" opacity="0.5" />
        {isBack && <Ellipse cx="100" cy="200" rx="65" ry="75" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Legs + claws */}
      <Rect x="68" y="265" width="24" height="50" rx="12" fill="url(#dBody)" />
      <Rect x="108" y="265" width="24" height="50" rx="12" fill="url(#dBody)" />
      <Path d="M 68 310 L 62 318 M 76 312 L 72 320 M 84 310 L 82 318" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
      <Path d="M 108 310 L 102 318 M 116 312 L 112 320 M 124 310 L 122 318" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
      {/* Lightning sparks */}
      <Path d="M 32 162 L 45 150 L 38 162 L 52 148" stroke="#FFD700" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      <Path d="M 25 182 L 36 172 L 30 182 L 42 170" stroke="#FFD700" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Neck */}
      <AnimatedG style={{ transform: [{ scaleY: neckScaleY }] }}>
        <Rect x="82" y="126" width="36" height="48" rx="17" fill="url(#dBody)" />
        {isNeck && <Rect x="80" y="124" width="40" height="52" rx="19" fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Head */}
      <AnimatedG style={{ transform: [{ translateY: neckHeadTY }] }}>
        <Ellipse cx="100" cy="96" rx="50" ry="44" fill="url(#dHead)" />
        <Ellipse cx="92" cy="84" rx="22" ry="17" fill="rgba(255,255,255,0.15)" />
        <Path d="M 80 62 L 68 32 L 88 55 Z" fill="#FFD700" />
        <Path d="M 120 62 L 132 32 L 112 55 Z" fill="#FFD700" />
        <Path d="M 62 74 L 54 54 L 70 70 Z" fill="#523A7A" />
        <Path d="M 138 74 L 146 54 L 130 70 Z" fill="#523A7A" />
        <Ellipse cx="100" cy="110" rx="22" ry="14" fill="#523A7A" />
        <Ellipse cx="100" cy="108" rx="16" ry="10" fill="#7B5EA7" />
        <Circle cx="94" cy="112" r="3" fill="#3A2260" />
        <Circle cx="106" cy="112" r="3" fill="#3A2260" />
        <Ellipse cx="83" cy="90" rx="13" ry="14" fill="#FFD700" />
        <Ellipse cx="117" cy="90" rx="13" ry="14" fill="#FFD700" />
        <Circle cx="84" cy="92" r="8" fill="#1A0A2E" />
        <Circle cx="118" cy="92" r="8" fill="#1A0A2E" />
        <Circle cx="82" cy="90" r="3.5" fill="white" />
        <Circle cx="116" cy="90" r="3.5" fill="white" />
        <Ellipse cx="68" cy="100" rx="10" ry="6" fill="#FFB8EA" opacity="0.4" />
        <Ellipse cx="132" cy="100" rx="10" ry="6" fill="#FFB8EA" opacity="0.4" />
        {renderMoodEyes(mood, 84, 118, 92, 8, "#BBA8E4", "#3A2260")}
      </AnimatedG>
    </Svg>
  );

  // ─── CRYSTAL DEER ─────────────────────────────────────────────────────────
  const renderDeer = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="cBody" cx="36%" cy="26%" r="68%">
          <Stop offset="0%" stopColor="#D8ECFA" /><Stop offset="100%" stopColor="#7AB8DC" />
        </RadialGradient>
        <RadialGradient id="cHead" cx="38%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#E8F4FF" /><Stop offset="100%" stopColor="#9CC8E8" />
        </RadialGradient>
      </Defs>
      {/* Four elegant legs */}
      <Rect x="68" y="258" width="16" height="68" rx="8" fill="url(#cBody)" />
      <Rect x="88" y="262" width="14" height="62" rx="7" fill="url(#cBody)" />
      <Rect x="105" y="262" width="14" height="62" rx="7" fill="url(#cBody)" />
      <Rect x="122" y="258" width="16" height="68" rx="8" fill="url(#cBody)" />
      {/* Knee crystal joint */}
      <AnimatedG style={{ transform: [{ translateY: kneeTY }] }}>
        <Circle cx="76" cy="262" r="10" fill="url(#cHead)" />
        <Circle cx="76" cy="262" r="6" fill="rgba(100,180,255,0.6)" />
        {isKnee && <Circle cx="76" cy="262" r="14" fill="rgba(255,215,0,0.3)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Body */}
      <AnimatedG style={{ transform: [{ scale: breathScale }] }}>
        <Ellipse cx="100" cy="218" rx="45" ry="52" fill="url(#cBody)" />
        <Ellipse cx="92" cy="205" rx="20" ry="16" fill="rgba(255,255,255,0.22)" />
      </AnimatedG>
      {/* Neck + head tilts together for NECK ailment */}
      <AnimatedG style={{ transform: [{ rotate: neckTiltDeg }] }}>
        <Rect x="88" y="148" width="24" height="78" rx="12" fill="url(#cBody)" />
        <Rect x="93" y="155" width="14" height="58" rx="7" fill="rgba(255,255,255,0.22)" />
        {isNeck && <Rect x="85" y="145" width="30" height="84" rx="15" fill="rgba(255,215,0,0.25)" stroke="#FFD700" strokeWidth="2.5" />}
        {/* Head */}
        <Ellipse cx="100" cy="130" rx="36" ry="30" fill="url(#cHead)" />
        <Ellipse cx="93" cy="120" rx="18" ry="13" fill="rgba(255,255,255,0.22)" />
        {/* Crystal antlers */}
        <Path d="M 82 108 L 68 72 L 60 52" stroke="#60A0C8" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Path d="M 68 72 L 58 60" stroke="#60A0C8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <Path d="M 68 72 L 74 58" stroke="#60A0C8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <Path d="M 118 108 L 132 72 L 140 52" stroke="#60A0C8" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Path d="M 132 72 L 142 60" stroke="#60A0C8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <Path d="M 132 72 L 126 58" stroke="#60A0C8" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Crystal tips */}
        <Circle cx="60" cy="52" r="6" fill="#A8D8F8" />
        <Circle cx="58" cy="60" r="5" fill="#A8D8F8" />
        <Circle cx="74" cy="58" r="5" fill="#A8D8F8" />
        <Circle cx="140" cy="52" r="6" fill="#A8D8F8" />
        <Circle cx="142" cy="60" r="5" fill="#A8D8F8" />
        <Circle cx="126" cy="58" r="5" fill="#A8D8F8" />
        {/* Eyes */}
        <Ellipse cx="88" cy="128" rx="12" ry="13" fill="white" />
        <Ellipse cx="112" cy="128" rx="12" ry="13" fill="white" />
        <Circle cx="89" cy="130" r="7" fill="#1A3A5C" />
        <Circle cx="113" cy="130" r="7" fill="#1A3A5C" />
        <Circle cx="87" cy="128" r="3" fill="white" />
        <Circle cx="111" cy="128" r="3" fill="white" />
        <Ellipse cx="100" cy="140" rx="12" ry="8" fill="#9CC8E8" />
        <Circle cx="100" cy="140" r="4" fill="#60A0C8" />
        {renderMoodMouth(mood, 100, 148, 11, "#4A7A9C")}
        {renderMoodEyes(mood, 89, 113, 130, 7, "#E8F4FF", "#1A3A5C")}
        <Ellipse cx="74" cy="133" rx="9" ry="5" fill="#FFB8EA" opacity="0.45" />
        <Ellipse cx="126" cy="133" rx="9" ry="5" fill="#FFB8EA" opacity="0.45" />
      </AnimatedG>
      {/* Crystal sparkles */}
      <Path d="M 42 220 L 48 214 L 42 220 L 36 214 L 42 208" stroke="#C8E8F8" strokeWidth="2" fill="none" />
      <Path d="M 158 195 L 162 190 L 158 195 L 154 190 L 158 185" stroke="#C8E8F8" strokeWidth="2" fill="none" />
    </Svg>
  );

  // ─── LAVA BLOB ────────────────────────────────────────────────────────────
  const renderLava = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="lOuter" cx="36%" cy="26%" r="68%">
          <Stop offset="0%" stopColor="#4A1E00" /><Stop offset="100%" stopColor="#2A0E00" />
        </RadialGradient>
        <RadialGradient id="lGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.85" /><Stop offset="100%" stopColor="#CC3300" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="lCore" cx="40%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FF9055" /><Stop offset="100%" stopColor="#CC3300" />
        </RadialGradient>
      </Defs>
      {/* Inner glow */}
      <Ellipse cx="100" cy="195" rx="80" ry="92" fill="url(#lGlow)" />
      {/* Main blob body */}
      <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
        <Ellipse cx="100" cy="195" rx="75" ry="88" fill="url(#lOuter)" />
        <Path d="M 72 155 Q 80 170 72 185 Q 68 198 75 212" stroke="#FF6B35" strokeWidth="3" fill="none" opacity="0.9" />
        <Path d="M 120 160 Q 128 175 122 190" stroke="#FF6B35" strokeWidth="2.5" fill="none" opacity="0.9" />
        <Path d="M 88 230 Q 95 240 90 255" stroke="#FF6B35" strokeWidth="2" fill="none" opacity="0.8" />
        <Path d="M 115 220 Q 122 232 118 248" stroke="#FF8833" strokeWidth="2" fill="none" opacity="0.7" />
        <Ellipse cx="100" cy="195" rx="35" ry="42" fill="url(#lCore)" opacity="0.38" />
        {isBack && <Ellipse cx="100" cy="195" rx="78" ry="91" fill="rgba(255,215,0,0.18)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Left arm */}
      <Ellipse cx="22" cy="185" rx="22" ry="38" fill="url(#lOuter)" />
      <Path d="M 10 165 Q 16 178 10 192" stroke="#FF6B35" strokeWidth="2.5" fill="none" opacity="0.8" />
      {/* Right arm - interactive for HAND */}
      <AnimatedG style={{ transform: [{ translateX: handTX }] }}>
        <Ellipse cx="178" cy="185" rx="22" ry="38" fill="url(#lOuter)" />
        <Ellipse cx="178" cy="218" rx="16" ry="18" fill="url(#lOuter)" />
        <Circle cx="172" cy="205" r="5" fill="#FF6B35" opacity="0.85" />
        <Circle cx="184" cy="212" r="4" fill="#FF8833" opacity="0.75" />
        <Circle cx="176" cy="222" r="6" fill="#FF6B35" opacity="0.9" />
        {isHand && <Ellipse cx="178" cy="200" rx="28" ry="44" fill="rgba(255,215,0,0.25)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Face */}
      <Ellipse cx="82" cy="172" rx="16" ry="14" fill="#FF6B35" />
      <Ellipse cx="118" cy="172" rx="16" ry="14" fill="#FF6B35" />
      <Circle cx="83" cy="173" r="8" fill="#FF2200" />
      <Circle cx="119" cy="173" r="8" fill="#FF2200" />
      <Circle cx="80" cy="171" r="4" fill="#FFAA44" />
      <Circle cx="116" cy="171" r="4" fill="#FFAA44" />
      {renderMoodMouth(mood, 100, 190, 18, "#FF6B35")}
      {renderMoodEyes(mood, 83, 119, 173, 8, "#4A1E00", "#FF2200")}
      {/* Lava drips + feet */}
      <Ellipse cx="75" cy="278" rx="26" ry="18" fill="url(#lOuter)" />
      <Ellipse cx="125" cy="278" rx="26" ry="18" fill="url(#lOuter)" />
      <Path d="M 78 280 Q 76 292 78 300" stroke="#FF6B35" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
      <Path d="M 115 282 Q 113 295 115 305" stroke="#FF8833" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
    </Svg>
  );

  // ─── MOON BUNNY ───────────────────────────────────────────────────────────
  const renderBunny = () => (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <RadialGradient id="bBody" cx="36%" cy="26%" r="68%">
          <Stop offset="0%" stopColor="#E8E0F8" /><Stop offset="100%" stopColor="#A090C8" />
        </RadialGradient>
        <RadialGradient id="bHead" cx="38%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#F0EBFF" /><Stop offset="100%" stopColor="#C8C0E8" />
        </RadialGradient>
      </Defs>
      {/* Fluffy tail */}
      <Circle cx="155" cy="248" r="22" fill="url(#bHead)" />
      <Circle cx="153" cy="246" r="16" fill="rgba(255,255,255,0.4)" />
      {/* Body */}
      <AnimatedG style={{ transform: [{ scale: breathScale }] }}>
        <Ellipse cx="100" cy="230" rx="62" ry="68" fill="url(#bBody)" />
        <Ellipse cx="90" cy="215" rx="25" ry="20" fill="rgba(255,255,255,0.2)" />
        <Path d="M 82 238 Q 96 230 110 238 Q 104 252 88 252 Z" fill="rgba(255,255,255,0.25)" />
      </AnimatedG>
      {/* Back legs */}
      <Ellipse cx="72" cy="285" rx="24" ry="32" fill="url(#bBody)" />
      <Ellipse cx="72" cy="312" rx="20" ry="10" fill="url(#bBody)" />
      {/* Right back leg - animated for KNEE */}
      <AnimatedG style={{ transform: [{ translateY: kneeTY }] }}>
        <Ellipse cx="130" cy="285" rx="24" ry="32" fill="url(#bBody)" />
        <Ellipse cx="130" cy="312" rx="20" ry="10" fill="url(#bBody)" />
        {isKnee && <Ellipse cx="130" cy="285" rx="28" ry="36" fill="rgba(255,215,0,0.25)" stroke="#FFD700" strokeWidth="2.5" />}
      </AnimatedG>
      {/* Head */}
      <Circle cx="100" cy="140" r="52" fill="url(#bHead)" />
      <Ellipse cx="88" cy="126" rx="24" ry="18" fill="rgba(255,255,255,0.2)" />
      <Path d="M 88 120 Q 100 114 112 120 Q 106 132 94 132 Z" fill="rgba(200,190,230,0.55)" />
      {/* Big tall ears - animated for NECK */}
      <AnimatedG style={{ transform: [{ scaleY: neckScaleY }] }}>
        <Rect x="68" y="24" width="28" height="104" rx="14" fill="url(#bBody)" />
        <Rect x="73" y="30" width="18" height="88" rx="9" fill="#D4B8E0" />
        <Rect x="104" y="28" width="28" height="98" rx="14" fill="url(#bBody)" />
        <Rect x="109" y="34" width="18" height="82" rx="9" fill="#D4B8E0" />
        {/* Star on ear */}
        <Path d="M 82 52 L 84 46 L 86 52 L 92 52 L 87 56 L 89 62 L 84 58 L 79 62 L 81 56 L 76 52 Z" fill="rgba(255,255,255,0.52)" />
        {isNeck && (
          <G>
            <Rect x="65" y="21" width="34" height="110" rx="17" fill="rgba(255,215,0,0.22)" stroke="#FFD700" strokeWidth="2" />
            <Rect x="101" y="25" width="34" height="104" rx="17" fill="rgba(255,215,0,0.22)" stroke="#FFD700" strokeWidth="2" />
          </G>
        )}
      </AnimatedG>
      {/* Eyes */}
      <Circle cx="86" cy="142" r="15" fill="white" />
      <Circle cx="114" cy="142" r="15" fill="white" />
      <Circle cx="87" cy="144" r="9" fill="#1A0A2E" />
      <Circle cx="115" cy="144" r="9" fill="#1A0A2E" />
      <Circle cx="84" cy="141" r="4" fill="white" />
      <Circle cx="112" cy="141" r="4" fill="white" />
      <Ellipse cx="100" cy="156" rx="6" ry="4" fill="#D4B8E0" />
      {renderMoodMouth(mood, 100, 162, 8, "#A090C8")}
      {renderMoodEyes(mood, 87, 115, 144, 9, "#F0EBFF", "#5A4A7E")}
      <Ellipse cx="72" cy="150" rx="11" ry="7" fill="#FFB8EA" opacity="0.5" />
      <Ellipse cx="128" cy="150" rx="11" ry="7" fill="#FFB8EA" opacity="0.5" />
      {/* Star markings */}
      <Path d="M 55 228 L 57 222 L 59 228 L 65 228 L 60 232 L 62 238 L 57 234 L 52 238 L 54 232 L 49 228 Z" fill="rgba(200,190,230,0.5)" />
      <Circle cx="148" cy="222" r="4" fill="rgba(200,190,230,0.5)" />
    </Svg>
  );

  const renderers: Partial<Record<PatientType, () => JSX.Element>> = {
    GOLEM: renderGolem,
    HARPY: renderHarpy,
    EMBER_KITTEN: renderKitten,
    ICE_YETI: renderYeti,
    MUSHROOM_SPRITE: renderMushroom,
    MINI_DRAGON: renderDragon,
    CRYSTAL_DEER: renderDeer,
    LAVA_BLOB: renderLava,
    MOON_BUNNY: renderBunny,
  };

  const renderFn = renderers[patientType] ?? renderGolem;

  return (
    <View style={{ width, height, position: "relative" }}>
      {renderFn()}
      {zoneInfo && (
        <View
          {...zoneInfo.pr.panHandlers}
          style={{
            position: "absolute",
            left: zoneInfo.zone.x,
            top: zoneInfo.zone.y,
            width: zoneInfo.zone.w,
            height: zoneInfo.zone.h,
          }}
        />
      )}
    </View>
  );
}
