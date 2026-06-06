/**
 * Treatment mini-games — one per ailment type.
 *
 * BONE_CRACK   – Pressure combo: Simon Says with glowing pressure points on bone
 * JOINT_POP    – Drag-and-align: drag bone segment into the correct slot
 * MUSCLE_KNOT  – Rapid tap: tap fast, progress decays when you stop
 * NERVE_PINCH  – Wire connect: draw paths to match coloured nerves left→right
 * SWELLING     – Squeeze & hold: press and hold swollen bumps to drain them
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, Ellipse as SvgEllipse, Line, LinearGradient, Path, RadialGradient as SvgRadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");

/* ====================================================================
 *  Shared props
 * ==================================================================== */
export interface MiniGameProps {
  /** Called when the player wins the mini-game. */
  onComplete: () => void;
  /** Called each frame with progress 0‒1 (for external progress bar). */
  onProgress?: (p: number) => void;
  /** Accent colour from the patient. */
  accentColor?: string;
  /** Area width available. */
  width?: number;
  /** Area height available. */
  height?: number;
}

export type MiniGameType =
  | "BONE_CRACK"
  | "JOINT_POP"
  | "MUSCLE_KNOT"
  | "NERVE_PINCH"
  | "SWELLING"
  | "FIND_PATH";

/* ====================================================================
 *  1.  BONE_CRACK  –  Dental Check (Simon Says — tap teeth in order)
 *      Open mouth SVG with teeth as tap targets.
 * ==================================================================== */
const DENTAL_SIZE = W * 0.90;
const DENTAL_VB = 200;

// 5 tappable teeth — positions in viewBox coords
// Defined as: { cx, cy, path (tooth shape), label }
const TEETH = [
  {
    // Upper-left molar
    cx: 52, cy: 52,
    path: "M44 44 L60 44 Q62 44, 62 48 L62 58 Q62 62, 58 62 L46 62 Q42 62, 42 58 L42 48 Q42 44, 44 44 Z",
    root: "M48 62 L47 72 M54 62 L55 72",
  },
  {
    // Upper-right canine
    cx: 142, cy: 56,
    path: "M134 48 L150 48 Q152 48, 152 52 L150 62 Q148 66, 142 66 Q136 66, 134 62 L132 52 Q132 48, 134 48 Z",
    root: "M142 66 L142 78",
  },
  {
    // Upper-center incisor
    cx: 100, cy: 42,
    path: "M93 34 L107 34 Q109 34, 109 38 L108 48 Q106 52, 100 52 Q94 52, 92 48 L91 38 Q91 34, 93 34 Z",
    root: "M100 52 L100 62",
  },
  {
    // Lower-left premolar
    cx: 62, cy: 148,
    path: "M54 140 L70 140 Q72 140, 72 144 L72 154 Q72 158, 68 158 L56 158 Q52 158, 52 154 L52 144 Q52 140, 54 140 Z",
    root: "M58 140 L57 130 M66 140 L67 130",
  },
  {
    // Lower-right molar
    cx: 148, cy: 150,
    path: "M140 142 L156 142 Q158 142, 158 146 L158 156 Q158 160, 154 160 L142 160 Q138 160, 138 156 L138 146 Q138 142, 140 142 Z",
    root: "M144 142 L143 132 M152 142 L153 132",
  },
];

const TOOTH_HIT_R = 16; // hit target radius in viewBox

const ROUNDS_TO_WIN = 3;
const BASE_SHOW_MS = 1000;
const SPEED_FACTOR = 0.85;

export function PressureComboGame({
  onComplete,
  onProgress,
  accentColor = "#00EEFF",
}: MiniGameProps) {
  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [phase, setPhase] = useState<"SHOWING" | "INPUT" | "WRONG" | "ROUND_WIN" | "DONE">("SHOWING");
  const phaseRef = useRef(phase);
  const sequenceRef = useRef<number[]>([]);
  const playerIdxRef = useRef(0);
  const roundRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);
  useEffect(() => { playerIdxRef.current = playerIdx; }, [playerIdx]);
  useEffect(() => { roundRef.current = round; }, [round]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const showSequence = useCallback((seq: number[], r: number) => {
    clearAllTimers();
    setPlayerIdx(0);
    setPhase("SHOWING");
    setActivePoint(null);

    const showMs = BASE_SHOW_MS * Math.pow(SPEED_FACTOR, r);
    const gap = 300;
    seq.forEach((ptIdx, i) => {
      timersRef.current.push(setTimeout(() => setActivePoint(ptIdx), i * (showMs + gap)));
      timersRef.current.push(setTimeout(() => setActivePoint(null), i * (showMs + gap) + showMs));
    });
    timersRef.current.push(setTimeout(() => {
      if (phaseRef.current === "SHOWING") setPhase("INPUT");
    }, seq.length * (showMs + gap) + 100));
  }, [clearAllTimers]);

  const startRound = useCallback((r: number) => {
    const len = r + 2;
    const seq: number[] = [];
    for (let i = 0; i < len; i++) seq.push(Math.floor(Math.random() * TEETH.length));
    setSequence(seq);
    showSequence(seq, r);
  }, [showSequence]);

  const handleReplay = useCallback(() => {
    if (phase !== "INPUT") return;
    showSequence(sequence, round);
  }, [phase, sequence, round, showSequence]);

  useEffect(() => { startRound(0); return () => clearAllTimers(); }, []);

  const handlePointTap = useCallback((ptIdx: number) => {
    if (phaseRef.current !== "INPUT") return;
    const seq = sequenceRef.current;
    const pIdx = playerIdxRef.current;
    const r = roundRef.current;

    if (ptIdx === seq[pIdx]) {
      const nextIdx = pIdx + 1;
      setActivePoint(ptIdx);
      setTimeout(() => setActivePoint(null), 150);

      if (nextIdx >= seq.length) {
        const nextRound = r + 1;
        onProgress?.(nextRound / ROUNDS_TO_WIN);
        if (nextRound >= ROUNDS_TO_WIN) {
          setPhase("DONE");
          setTimeout(() => onComplete(), 400);
        } else {
          setPhase("ROUND_WIN");
          setRound(nextRound);
          roundRef.current = nextRound;
          setTimeout(() => startRound(nextRound), 800);
        }
      } else {
        setPlayerIdx(nextIdx);
        playerIdxRef.current = nextIdx;
      }
    } else {
      setPhase("WRONG");
      setActivePoint(null);
      setTimeout(() => startRound(r), 900);
    }
  }, [onComplete, onProgress, startRound]);

  const scale = DENTAL_SIZE / DENTAL_VB;

  return (
    <View style={gStyles.center}>
      <View style={dentalStyles.headerRow}>
        <Text style={gStyles.instruction}>
          {phase === "SHOWING"
            ? `Watch the cavities... (${round + 1}/${ROUNDS_TO_WIN})`
            : phase === "INPUT"
              ? `Tap teeth in order! (${playerIdx}/${sequence.length})`
              : phase === "WRONG"
                ? "Wrong tooth! Watch again..."
                : phase === "ROUND_WIN"
                  ? "Good! Next check-up..."
                  : "All cavities found!"}
        </Text>
      </View>

      <View style={dentalStyles.frame}>
        <Svg width={DENTAL_SIZE} height={DENTAL_SIZE} viewBox={`0 0 ${DENTAL_VB} ${DENTAL_VB}`}>
          <Defs>
            <SvgRadialGradient id="mouthBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#3A0A15" stopOpacity="1" />
              <Stop offset="100%" stopColor="#1A0508" stopOpacity="1" />
            </SvgRadialGradient>
            <SvgRadialGradient id="tongueGrad" cx="50%" cy="60%" r="50%">
              <Stop offset="0%" stopColor="#D84060" stopOpacity="1" />
              <Stop offset="100%" stopColor="#A82840" stopOpacity="1" />
            </SvgRadialGradient>
            <LinearGradient id="gumUpper" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E86080" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C84060" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="gumLower" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor="#E86080" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C84060" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background */}
          <Rect x="0" y="0" width={DENTAL_VB} height={DENTAL_VB} fill="#1A0508" rx="12" />

          {/* Lips — outer */}
          <Path
            d="M20 100 Q20 20, 100 14 Q180 20, 180 100 Q180 180, 100 186 Q20 180, 20 100 Z"
            fill="url(#mouthBg)"
            stroke="#C84060"
            strokeWidth="4"
          />

          {/* Lip highlights */}
          <Path
            d="M40 30 Q70 18, 100 16 Q130 18, 160 30"
            fill="none" stroke="rgba(255,150,160,0.3)" strokeWidth="3" strokeLinecap="round"
          />
          <Path
            d="M40 170 Q70 182, 100 184 Q130 182, 160 170"
            fill="none" stroke="rgba(255,150,160,0.2)" strokeWidth="3" strokeLinecap="round"
          />

          {/* Upper gum arch */}
          <Path
            d="M30 70 Q30 24, 100 20 Q170 24, 170 70 L170 78 Q170 82, 166 82 L34 82 Q30 82, 30 78 Z"
            fill="url(#gumUpper)"
            opacity={0.85}
          />

          {/* Lower gum arch */}
          <Path
            d="M30 130 Q30 176, 100 180 Q170 176, 170 130 L170 122 Q170 118, 166 118 L34 118 Q30 118, 30 122 Z"
            fill="url(#gumLower)"
            opacity={0.85}
          />

          {/* Tongue */}
          <SvgEllipse cx="100" cy="108" rx="35" ry="14" fill="url(#tongueGrad)" opacity={0.7} />
          <Path d="M80 105 Q100 100, 120 105" fill="none" stroke="rgba(180,50,60,0.4)" strokeWidth="0.8" />

          {/* Uvula hint */}
          <SvgEllipse cx="100" cy="95" rx="6" ry="10" fill="rgba(200,80,100,0.4)" />

          {/* === UPPER TEETH (non-tappable background teeth) === */}
          {/* Upper left canine */}
          <Path d="M68 44 L78 44 Q80 44, 80 48 L79 58 Q77 62, 73 62 Q69 62, 67 58 L66 48 Q66 44, 68 44 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Upper left premolar */}
          <Path d="M80 46 L92 46 Q94 46, 94 50 L93 58 Q91 62, 86 62 Q81 62, 79 58 L78 50 Q78 46, 80 46 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Upper right incisor */}
          <Path d="M108 36 L118 36 Q120 36, 120 40 L119 50 Q117 54, 113 54 Q109 54, 107 50 L106 40 Q106 36, 108 36 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Upper right premolar */}
          <Path d="M120 48 L132 48 Q134 48, 134 52 L133 60 Q131 64, 126 64 Q121 64, 119 60 L118 52 Q118 48, 120 48 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Upper right molar */}
          <Path d="M152 48 L166 48 Q168 48, 168 52 L168 60 Q168 64, 164 64 L154 64 Q150 64, 150 60 L150 52 Q150 48, 152 48 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />

          {/* === LOWER TEETH (non-tappable background teeth) === */}
          {/* Lower center */}
          <Path d="M90 142 L98 142 Q100 142, 100 146 L100 154 Q100 158, 96 158 L92 158 Q88 158, 88 154 L88 146 Q88 142, 90 142 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          <Path d="M102 142 L110 142 Q112 142, 112 146 L112 154 Q112 158, 108 158 L104 158 Q100 158, 100 154 L100 146 Q100 142, 102 142 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Lower left canine */}
          <Path d="M74 140 L84 140 Q86 140, 86 144 L85 152 Q83 156, 79 156 Q75 156, 73 152 L72 144 Q72 140, 74 140 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Lower right canine */}
          <Path d="M118 140 L128 140 Q130 140, 130 144 L129 152 Q127 156, 123 156 Q119 156, 117 152 L116 144 Q116 140, 118 140 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />
          {/* Lower left molar */}
          <Path d="M36 138 L50 138 Q52 138, 52 142 L52 152 Q52 156, 48 156 L38 156 Q34 156, 34 152 L34 142 Q34 138, 36 138 Z" fill="rgba(240,235,220,0.85)" stroke="rgba(200,190,170,0.5)" strokeWidth="0.8" />

          {/* === TAPPABLE TEETH === */}
          {TEETH.map((tooth, i) => {
            const isActive = activePoint === i;
            const isInput = phase === "INPUT";
            const isWrong = phase === "WRONG";
            return (
              <React.Fragment key={`tooth-${i}`}>
                {/* Root lines (visible under gum) */}
                <Path
                  d={tooth.root}
                  fill="none"
                  stroke="rgba(200,190,170,0.25)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                {/* Tooth body */}
                <Path
                  d={tooth.path}
                  fill={
                    isActive ? "#FFE066"
                    : isWrong ? "rgba(248,113,113,0.7)"
                    : "rgba(245,240,225,0.9)"
                  }
                  stroke={
                    isActive ? "#FF8800"
                    : isInput ? "rgba(255,200,100,0.6)"
                    : "rgba(200,190,170,0.5)"
                  }
                  strokeWidth={isActive ? "2" : "1"}
                />
                {/* Cavity dot on active */}
                {isActive && (
                  <>
                    <Circle cx={tooth.cx} cy={tooth.cy} r="4" fill="#4A3020" opacity={0.7} />
                    <Circle cx={tooth.cx} cy={tooth.cy} r={TOOTH_HIT_R + 3} fill="none" stroke="rgba(255,220,100,0.4)" strokeWidth="2" />
                  </>
                )}
                {/* Subtle number label */}
                {isInput && (
                  <SvgText
                    x={tooth.cx} y={tooth.cy + 3}
                    textAnchor="middle"
                    fill="rgba(100,80,60,0.4)"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {i + 1}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {/* Dental mirror decorative element */}
          <Circle cx="172" cy="98" r="10" fill="none" stroke="rgba(180,200,220,0.2)" strokeWidth="1.5" />
          <Line x1="182" y1="98" x2="195" y2="92" stroke="rgba(180,200,220,0.15)" strokeWidth="2" />
        </Svg>

        {/* Touch targets over each tooth */}
        {TEETH.map((tooth, i) => {
          const hitPx = TOOTH_HIT_R * scale + 6;
          return (
            <TouchableOpacity
              key={`hit-${i}`}
              activeOpacity={0.7}
              onPress={() => handlePointTap(i)}
              disabled={phase !== "INPUT"}
              style={[
                dentalStyles.toothHit,
                {
                  left: tooth.cx * scale - hitPx,
                  top: tooth.cy * scale - hitPx,
                  width: hitPx * 2,
                  height: hitPx * 2,
                  borderRadius: hitPx,
                },
              ]}
            />
          );
        })}
      </View>

      {phase === "INPUT" && (
        <TouchableOpacity onPress={handleReplay} style={dentalStyles.replayBtn}>
          <Text style={dentalStyles.replayText}>↻ Replay</Text>
        </TouchableOpacity>
      )}

      {phase === "DONE" && <Text style={gStyles.successBurst}>CHECKED!</Text>}
    </View>
  );
}

const dentalStyles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  replayBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#1A0508",
  },
  replayText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFF8EE",
  },
  frame: {
    width: DENTAL_SIZE,
    height: DENTAL_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginTop: 4,
  },
  toothHit: {
    position: "absolute",
    zIndex: 10,
  },
});

/* ====================================================================
 *  2.  JOINT_POP  –  X-ray Skeleton Puzzle (drag bone pieces into place)
 * ==================================================================== */
const XRAY_SIZE = W * 0.90;
const XRAY_VB = 200; // SVG viewBox size
const PIECE_TRAY_H = 80; // height of the tray below the x-ray

// Three missing bone pieces with their target positions in viewBox coords
const SKELETON_PIECES = [
  {
    id: 0,
    label: "Ribs",
    // Left rib group
    path: "M56 62 Q48 58, 42 64 Q38 70, 44 74 L56 72 Z M56 76 Q46 73, 40 78 Q36 84, 42 88 L56 86 Z M56 90 Q48 87, 44 92 Q40 97, 46 100 L56 98 Z",
    // Target center in viewBox
    tx: 52,
    ty: 80,
    // Bounding box for hit-test (viewBox coords)
    bx: 36, by: 58, bw: 24, bh: 44,
  },
  {
    id: 1,
    label: "Spine",
    // Middle vertebrae section
    path: "M94 100 L106 100 L108 108 Q106 110, 104 110 L96 110 Q94 110, 92 108 Z M93 112 L107 112 L109 120 Q107 122, 105 122 L95 122 Q93 122, 91 120 Z M94 124 L106 124 L108 132 Q106 134, 104 134 L96 134 Q94 134, 92 132 Z",
    tx: 100,
    ty: 117,
    bx: 89, by: 98, bw: 22, bh: 40,
  },
  {
    id: 2,
    label: "Pelvis",
    // Right pelvis wing
    path: "M106 140 Q116 136, 128 140 Q140 146, 142 158 Q140 166, 132 168 L120 164 Q112 158, 108 150 Z",
    tx: 124,
    ty: 154,
    bx: 104, by: 136, bw: 42, bh: 36,
  },
];

// Full skeleton paths (everything except the missing pieces)
const SKELETON_BASE_PATHS = [
  // Skull
  "M86 16 Q78 16, 74 24 Q70 32, 74 38 Q78 42, 86 44 L114 44 Q122 42, 126 38 Q130 32, 126 24 Q122 16, 114 16 Z",
  // Eye sockets
  "M88 28 Q86 26, 88 24 Q90 22, 92 24 Q94 26, 92 28 Q90 30, 88 28 Z",
  "M108 28 Q106 26, 108 24 Q110 22, 112 24 Q114 26, 112 28 Q110 30, 108 28 Z",
  // Jaw
  "M90 36 L110 36 L108 40 L92 40 Z",
  // Neck vertebrae
  "M96 46 L104 46 L105 52 L95 52 Z",
  // Clavicles
  "M70 56 L96 54 L96 58 L70 60 Z",
  "M104 54 L130 56 L130 60 L104 58 Z",
  // Sternum
  "M97 56 L103 56 L103 98 L97 98 Z",
  // Right ribs (present)
  "M144 62 Q152 58, 158 64 Q162 70, 156 74 L144 72 Z",
  "M144 76 Q154 73, 160 78 Q164 84, 158 88 L144 86 Z",
  "M144 90 Q152 87, 156 92 Q160 97, 154 100 L144 98 Z",
  // Spine below sternum
  "M94 56 L106 56 L108 64 Q106 66, 104 66 L96 66 Q94 66, 92 64 Z",
  "M93 68 L107 68 L109 76 Q107 78, 105 78 L95 78 Q93 78, 91 76 Z",
  "M94 80 L106 80 L108 88 Q106 90, 104 90 L96 90 Q94 90, 92 88 Z",
  "M93 92 L107 92 L109 100 Q107 102, 105 102 L95 102 Q93 102, 91 100 Z",
  // Left pelvis wing (present)
  "M94 140 Q84 136, 72 140 Q60 146, 58 158 Q60 166, 68 168 L80 164 Q88 158, 92 150 Z",
  // Sacrum
  "M92 136 L108 136 L106 150 Q104 154, 100 156 Q96 154, 94 150 Z",
  // Upper arm bones (humerus)
  "M66 62 L70 62 L68 108 L64 108 Z",
  "M130 62 L134 62 L136 108 L132 108 Z",
  // Forearm bones
  "M62 112 L66 112 L64 150 L60 150 Z",
  "M134 112 L138 112 L140 150 L136 150 Z",
  // Femurs
  "M82 168 L86 168 L84 200 L80 200 Z",
  "M114 168 L118 168 L120 200 L116 200 Z",
];

// Tray positions for the 3 pieces (pixel coords below the x-ray)
function getPieceTrayX(idx: number): number {
  const spacing = XRAY_SIZE / 3;
  return spacing * idx + spacing / 2;
}

export function DragAlignGame({
  onComplete,
  onProgress,
  accentColor = "#A78BFA",
}: MiniGameProps) {
  const SNAP_DIST = XRAY_SIZE * 0.1; // snap threshold in pixels

  const [snapped, setSnapped] = useState([false, false, false]);
  const snappedRef = useRef([false, false, false]);
  const doneCountRef = useRef(0);

  // Each piece's animated position (offset from its tray start position)
  const drags = useRef(
    SKELETON_PIECES.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  // Scale factor from viewBox to pixels
  const scale = XRAY_SIZE / XRAY_VB;

  const makePanResponder = useCallback((idx: number) => {
    const piece = SKELETON_PIECES[idx];
    // Target position in pixels (relative to the x-ray top-left)
    const targetPx = piece.tx * scale;
    const targetPy = piece.ty * scale;
    // Tray start position in pixels (relative to x-ray top-left)
    const trayPx = getPieceTrayX(idx);
    const trayPy = XRAY_SIZE + 18 + PIECE_TRAY_H / 2;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !snappedRef.current[idx],
      onMoveShouldSetPanResponder: () => !snappedRef.current[idx],
      onPanResponderGrant: () => {
        drags[idx].x.setOffset((drags[idx].x as any)._value);
        drags[idx].x.setValue(0);
        drags[idx].y.setOffset((drags[idx].y as any)._value);
        drags[idx].y.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (snappedRef.current[idx]) return;
        drags[idx].x.setValue(gs.dx);
        drags[idx].y.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (snappedRef.current[idx]) return;
        drags[idx].x.flattenOffset();
        drags[idx].y.flattenOffset();
        // Current position of piece center in the container
        const curX = trayPx + (drags[idx].x as any)._value;
        const curY = trayPy + (drags[idx].y as any)._value;
        const dist = Math.sqrt(
          (curX - targetPx) * (curX - targetPx) +
          (curY - targetPy) * (curY - targetPy)
        );
        if (dist < SNAP_DIST) {
          snappedRef.current[idx] = true;
          doneCountRef.current += 1;
          setSnapped([...snappedRef.current]);
          // Animate to exact target
          const snapToX = targetPx - trayPx;
          const snapToY = targetPy - trayPy;
          Animated.parallel([
            Animated.spring(drags[idx].x, { toValue: snapToX, useNativeDriver: true, friction: 6 }),
            Animated.spring(drags[idx].y, { toValue: snapToY, useNativeDriver: true, friction: 6 }),
          ]).start();
          onProgress?.(doneCountRef.current / 3);
          if (doneCountRef.current >= 3) {
            setTimeout(() => onComplete(), 500);
          }
        }
      },
    });
  }, [onComplete, onProgress, scale]);

  const panResponders = useRef(SKELETON_PIECES.map((_, i) => makePanResponder(i))).current;

  const allDone = snapped.every(Boolean);

  return (
    <View style={gStyles.center}>
      <Text style={gStyles.instruction}>
        {allDone ? "Skeleton complete!" : "Drag the missing bones into place"}
      </Text>

      <View style={{ width: XRAY_SIZE, height: XRAY_SIZE + PIECE_TRAY_H + 22, position: "relative" }}>
        {/* X-ray background */}
        <View style={xrayStyles.xrayFrame}>
          <Svg width={XRAY_SIZE} height={XRAY_SIZE} viewBox={`0 0 ${XRAY_VB} ${XRAY_VB}`}>
            {/* Dark x-ray background */}
            <Rect x="0" y="0" width={XRAY_VB} height={XRAY_VB} fill="#0A1628" rx="8" />

            {/* Vignette overlay */}
            <Defs>
              <SvgRadialGradient id="xrayVig" cx="50%" cy="45%" r="55%">
                <Stop offset="0%" stopColor="#1A3050" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#000" stopOpacity="0.6" />
              </SvgRadialGradient>
            </Defs>
            <Rect x="0" y="0" width={XRAY_VB} height={XRAY_VB} fill="url(#xrayVig)" />

            {/* Base skeleton (always visible) */}
            {SKELETON_BASE_PATHS.map((d, i) => (
              <Path key={`skel-${i}`} d={d} fill="none" stroke="rgba(180,210,240,0.7)" strokeWidth="1.2" />
            ))}

            {/* Missing piece outlines (dashed) */}
            {SKELETON_PIECES.map((piece) => (
              <Path
                key={`slot-${piece.id}`}
                d={piece.path}
                fill={snapped[piece.id] ? "rgba(120,200,255,0.25)" : "none"}
                stroke={snapped[piece.id] ? "rgba(120,220,160,0.8)" : "rgba(255,200,100,0.5)"}
                strokeWidth="1.5"
                strokeDasharray={snapped[piece.id] ? "0" : "4,3"}
              />
            ))}
          </Svg>

          {/* Frame border */}
          <View style={xrayStyles.frameBorder} />
        </View>

        {/* Piece tray */}
        <View style={[xrayStyles.tray, { top: XRAY_SIZE + 18 }]}>
          {SKELETON_PIECES.map((piece, idx) => {
            if (snapped[idx]) return null;
            const trayX = getPieceTrayX(idx);
            const trayY = PIECE_TRAY_H / 2;
            // Piece SVG bounding
            const pw = piece.bw * scale + 16;
            const ph = piece.bh * scale + 16;
            return (
              <Animated.View
                key={`piece-${piece.id}`}
                {...panResponders[idx].panHandlers}
                style={[
                  xrayStyles.piece,
                  {
                    left: trayX - pw / 2,
                    top: trayY - ph / 2,
                    width: pw,
                    height: ph,
                    borderColor: accentColor,
                    transform: [
                      { translateX: drags[idx].x },
                      { translateY: drags[idx].y },
                    ],
                  },
                ]}
              >
                <Svg
                  width={piece.bw * scale}
                  height={piece.bh * scale}
                  viewBox={`${piece.bx} ${piece.by} ${piece.bw} ${piece.bh}`}
                >
                  <Path
                    d={piece.path}
                    fill="rgba(140,200,255,0.35)"
                    stroke="rgba(180,220,255,0.9)"
                    strokeWidth="1.5"
                  />
                </Svg>
                <Text style={xrayStyles.pieceLabel}>{piece.label}</Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const xrayStyles = StyleSheet.create({
  xrayFrame: {
    width: XRAY_SIZE,
    height: XRAY_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0A1628",
  },
  frameBorder: {
    position: "absolute",
    left: 0, top: 0, right: 0, bottom: 0,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "rgba(100,160,220,0.3)",
  },
  tray: {
    position: "absolute",
    left: 0,
    width: XRAY_SIZE,
    height: PIECE_TRAY_H,
  },
  piece: {
    position: "absolute",
    borderWidth: 1.5,
    borderRadius: 10,
    borderStyle: "dashed",
    backgroundColor: "rgba(10,22,40,0.85)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    zIndex: 10,
  },
  pieceLabel: {
    fontSize: 9,
    color: "rgba(180,210,240,0.6)",
    marginTop: 2,
    fontWeight: "600",
  },
});

/* ====================================================================
 *  3.  MUSCLE_KNOT  –  CPR Heart Pump (tap rapidly on heart)
 * ==================================================================== */
const CPR_SIZE = W * 0.90;
const CPR_VB = 200; // SVG viewBox

export function RapidTapGame({
  onComplete,
  onProgress,
  accentColor = "#F59E0B",
}: MiniGameProps) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const doneRef = useRef(false);
  const decayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heartGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    decayTimer.current = setInterval(() => {
      if (doneRef.current) return;
      progressRef.current = Math.max(0, progressRef.current - 0.016);
      setProgress(progressRef.current);
      onProgress?.(progressRef.current);
    }, 50);
    return () => {
      if (decayTimer.current) clearInterval(decayTimer.current);
    };
  }, []);

  const handleTap = useCallback(() => {
    if (doneRef.current) return;
    progressRef.current = Math.min(1, progressRef.current + 0.09);
    setProgress(progressRef.current);
    onProgress?.(progressRef.current);

    // Heart compression pulse
    pulseAnim.setValue(0.82);
    Animated.spring(pulseAnim, {
      toValue: 1,
      tension: 500,
      friction: 4,
      useNativeDriver: true,
    }).start();

    // Glow flash
    heartGlow.setValue(1);
    Animated.timing(heartGlow, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (progressRef.current >= 1) {
      doneRef.current = true;
      if (decayTimer.current) clearInterval(decayTimer.current);
      setTimeout(() => onComplete(), 400);
    }
  }, [onComplete, onProgress]);

  const ringR = 88; // progress ring radius in viewBox
  const ringCircumference = 2 * Math.PI * ringR;
  const done = doneRef.current;

  return (
    <View style={gStyles.center}>
      <Text style={gStyles.instruction}>
        {done ? "Heartbeat restored!" : "Tap the heart — keep pumping!"}
      </Text>

      <View style={cprStyles.frame}>
        <TouchableOpacity activeOpacity={1} onPress={handleTap} style={cprStyles.touchArea}>
          <Svg width={CPR_SIZE} height={CPR_SIZE} viewBox={`0 0 ${CPR_VB} ${CPR_VB}`}>
            {/* Dark body cavity background */}
            <Defs>
              <SvgRadialGradient id="cavityBg" cx="50%" cy="48%" r="50%">
                <Stop offset="0%" stopColor="#2A1520" stopOpacity="1" />
                <Stop offset="100%" stopColor="#120A10" stopOpacity="1" />
              </SvgRadialGradient>
              <SvgRadialGradient id="heartGrad" cx="48%" cy="42%" r="50%">
                <Stop offset="0%" stopColor="#E84060" stopOpacity="1" />
                <Stop offset="60%" stopColor="#C02848" stopOpacity="1" />
                <Stop offset="100%" stopColor="#8A1830" stopOpacity="1" />
              </SvgRadialGradient>
              <LinearGradient id="lungL" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#D04060" stopOpacity="0.85" />
                <Stop offset="100%" stopColor="#A02840" stopOpacity="0.7" />
              </LinearGradient>
              <LinearGradient id="lungR" x1="1" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#D04060" stopOpacity="0.85" />
                <Stop offset="100%" stopColor="#A02840" stopOpacity="0.7" />
              </LinearGradient>
            </Defs>

            {/* Background */}
            <Rect x="0" y="0" width={CPR_VB} height={CPR_VB} fill="url(#cavityBg)" rx="12" />

            {/* === LEFT LUNG === */}
            <Path
              d="M30 50 Q22 55, 18 72 Q14 95, 16 120 Q18 148, 28 160 Q38 170, 55 168 Q68 165, 75 155 Q80 145, 80 125 L80 80 Q78 60, 65 50 Q50 42, 30 50 Z"
              fill="url(#lungL)"
              stroke="rgba(180,60,80,0.6)"
              strokeWidth="1"
            />
            {/* Left lung lobes */}
            <Path d="M24 90 Q40 85, 72 88" fill="none" stroke="rgba(140,30,50,0.5)" strokeWidth="1.2" />
            <Path d="M22 115 Q42 108, 76 112" fill="none" stroke="rgba(140,30,50,0.5)" strokeWidth="1.2" />
            {/* Left bronchi branches */}
            <Path d="M80 78 Q65 72, 50 80 Q38 88, 30 100" fill="none" stroke="rgba(200,100,120,0.4)" strokeWidth="0.8" />
            <Path d="M78 85 Q60 82, 45 92 Q35 100, 28 112" fill="none" stroke="rgba(200,100,120,0.3)" strokeWidth="0.7" />
            <Path d="M76 95 Q58 93, 42 105" fill="none" stroke="rgba(200,100,120,0.25)" strokeWidth="0.6" />

            {/* === RIGHT LUNG === */}
            <Path
              d="M170 50 Q178 55, 182 72 Q186 95, 184 120 Q182 148, 172 160 Q162 170, 145 168 Q132 165, 125 155 Q120 145, 120 125 L120 80 Q122 60, 135 50 Q150 42, 170 50 Z"
              fill="url(#lungR)"
              stroke="rgba(180,60,80,0.6)"
              strokeWidth="1"
            />
            {/* Right lung lobes */}
            <Path d="M176 85 Q160 80, 128 84" fill="none" stroke="rgba(140,30,50,0.5)" strokeWidth="1.2" />
            <Path d="M178 110 Q158 103, 126 108" fill="none" stroke="rgba(140,30,50,0.5)" strokeWidth="1.2" />
            <Path d="M176 135 Q156 128, 124 133" fill="none" stroke="rgba(140,30,50,0.5)" strokeWidth="1" />
            {/* Right bronchi branches */}
            <Path d="M120 78 Q135 72, 150 80 Q162 88, 170 100" fill="none" stroke="rgba(200,100,120,0.4)" strokeWidth="0.8" />
            <Path d="M122 85 Q140 82, 155 92 Q165 100, 172 112" fill="none" stroke="rgba(200,100,120,0.3)" strokeWidth="0.7" />
            <Path d="M124 95 Q142 93, 158 105" fill="none" stroke="rgba(200,100,120,0.25)" strokeWidth="0.6" />

            {/* === TRACHEA & MAIN BRONCHI === */}
            <Path
              d="M95 20 L105 20 L106 42 Q108 50, 115 55 L120 58"
              fill="none" stroke="rgba(100,140,180,0.5)" strokeWidth="2.5"
            />
            <Path
              d="M95 20 L105 20 L94 42 Q92 50, 85 55 L80 58"
              fill="none" stroke="rgba(100,140,180,0.5)" strokeWidth="2.5"
            />
            {/* Trachea rings */}
            <Line x1="96" y1="25" x2="104" y2="25" stroke="rgba(100,140,180,0.3)" strokeWidth="1" />
            <Line x1="96" y1="30" x2="104" y2="30" stroke="rgba(100,140,180,0.3)" strokeWidth="1" />
            <Line x1="95" y1="35" x2="105" y2="35" stroke="rgba(100,140,180,0.3)" strokeWidth="1" />

            {/* === AORTA === */}
            <Path
              d="M100 60 Q100 40, 110 35 Q125 30, 135 40 Q142 50, 138 65"
              fill="none" stroke="rgba(60,100,200,0.6)" strokeWidth="4"
            />
            <Path
              d="M100 60 Q100 40, 110 35 Q125 30, 135 40 Q142 50, 138 65"
              fill="none" stroke="rgba(80,130,220,0.3)" strokeWidth="6"
            />

            {/* === PULMONARY ARTERIES === */}
            <Path d="M95 68 Q80 60, 70 65" fill="none" stroke="rgba(60,100,200,0.4)" strokeWidth="2" />
            <Path d="M108 65 Q120 58, 132 62" fill="none" stroke="rgba(60,100,200,0.4)" strokeWidth="2" />

            {/* === HEART === */}
            <Path
              d="M82 70 Q82 58, 92 55 Q100 53, 100 65 Q100 53, 108 55 Q118 58, 118 70 Q118 90, 100 110 Q82 90, 82 70 Z"
              fill="url(#heartGrad)"
              stroke="rgba(220,60,80,0.7)"
              strokeWidth="1.5"
            />
            {/* Heart chambers line */}
            <Path d="M100 65 L100 105" fill="none" stroke="rgba(180,40,60,0.5)" strokeWidth="0.8" />
            <Path d="M86 78 L114 78" fill="none" stroke="rgba(180,40,60,0.4)" strokeWidth="0.8" />
            {/* Heart highlight */}
            <Path
              d="M88 68 Q90 62, 96 62"
              fill="none" stroke="rgba(255,180,190,0.4)" strokeWidth="1.5" strokeLinecap="round"
            />

            {/* === PROGRESS RING around heart === */}
            <Circle
              cx="100" cy="82"
              r="32"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            <Circle
              cx="100" cy="82"
              r="32"
              fill="none"
              stroke={progress >= 1 ? "#4ADE80" : "#FF6B8A"}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress)}`}
              strokeLinecap="round"
              rotation="-90"
              origin="100,82"
              opacity={0.9}
            />

            {/* === VEINS (decorative) === */}
            <Path d="M60 160 Q70 155, 82 158 Q90 160, 95 170" fill="none" stroke="rgba(60,80,160,0.3)" strokeWidth="1" />
            <Path d="M140 160 Q130 155, 118 158 Q110 160, 105 170" fill="none" stroke="rgba(60,80,160,0.3)" strokeWidth="1" />

            {/* Tap prompt */}
            {!done && (
              <SvgText x="100" y="190" textAnchor="middle" fill="rgba(255,200,200,0.5)" fontSize="10" fontWeight="bold">
                TAP TAP TAP
              </SvgText>
            )}
          </Svg>

          {/* Animated heart glow overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              cprStyles.heartGlow,
              {
                opacity: heartGlow,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Animated heart pulse overlay (centered on heart) */}
          <Animated.View
            pointerEvents="none"
            style={[
              cprStyles.heartPulse,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Path
                d="M22 30 Q22 18, 32 15 Q40 13, 40 25 Q40 13, 48 15 Q58 18, 58 30 Q58 50, 40 65 Q22 50, 22 30 Z"
                fill="none"
                stroke={progress >= 1 ? "rgba(74,222,128,0.6)" : "rgba(255,107,138,0.4)"}
                strokeWidth="2"
              />
            </Svg>
          </Animated.View>
        </TouchableOpacity>

        {/* Progress percentage */}
        <View style={cprStyles.progressRow}>
          <View style={[cprStyles.progressBar, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: progress >= 1 ? "#4ADE80" : "#FF6B8A" }]} />
        </View>
      </View>
    </View>
  );
}

const cprStyles = StyleSheet.create({
  frame: {
    width: CPR_SIZE,
    alignItems: "center",
  },
  touchArea: {
    width: CPR_SIZE,
    height: CPR_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  heartGlow: {
    position: "absolute",
    left: CPR_SIZE * 0.35,
    top: CPR_SIZE * 0.28,
    width: CPR_SIZE * 0.3,
    height: CPR_SIZE * 0.3,
    borderRadius: CPR_SIZE * 0.15,
    backgroundColor: "rgba(255,80,100,0.3)",
  },
  heartPulse: {
    position: "absolute",
    left: CPR_SIZE * 0.5 - 40,
    top: CPR_SIZE * 0.41 - 40,
    width: 80,
    height: 80,
  },
  progressRow: {
    width: CPR_SIZE - 20,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

/* ====================================================================
 *  4.  NERVE_PINCH  –  Wire Connect: match coloured nerves left→right
 *      Brain-themed border with solid centre for line visibility.
 * ==================================================================== */
const NERVE_COLORS = [
  { id: 0, color: "#EF4444", label: "1" }, // red
  { id: 1, color: "#22C55E", label: "2" }, // green
  { id: 2, color: "#3B82F6", label: "3" }, // blue
];
const BRAIN_BORDER = 38; // thickness of the organic border
const WIRE_AREA_SIZE = W * 0.90;
const WIRE_AREA_W = WIRE_AREA_SIZE;
const WIRE_AREA_H = WIRE_AREA_SIZE;
const INNER_X = BRAIN_BORDER;
const INNER_Y = BRAIN_BORDER;
const INNER_W = WIRE_AREA_W - BRAIN_BORDER * 2;
const INNER_H = WIRE_AREA_H - BRAIN_BORDER * 2;
const NODE_R = 22;
const SNAP_DIST = 32;

// Left & right node X positions (inside the solid centre area)
const NODE_LEFT_X = INNER_X + 24;
const NODE_RIGHT_X = INNER_X + INNER_W - 24;

// Y positions spaced evenly within the inner area
const NODE_YS = [
  INNER_Y + INNER_H * 0.2,
  INNER_Y + INNER_H * 0.5,
  INNER_Y + INNER_H * 0.8,
];

// ── Brain-border SVG decorative paths ──
function brainFolds(w: number, h: number, border: number): string[] {
  const paths: string[] = [];
  // Top edge folds
  for (let x = border; x < w - border; x += 28 + Math.random() * 18) {
    const dy = 6 + Math.random() * 14;
    const cx1 = x + 8 + Math.random() * 10;
    const cx2 = x + 18 + Math.random() * 10;
    paths.push(`M${x},${border - 4} Q${cx1},${border - dy} ${cx2},${border - 2}`);
  }
  // Bottom edge folds
  for (let x = border; x < w - border; x += 24 + Math.random() * 20) {
    const dy = 6 + Math.random() * 14;
    const cx1 = x + 8 + Math.random() * 10;
    const cx2 = x + 18 + Math.random() * 10;
    paths.push(`M${x},${h - border + 4} Q${cx1},${h - border + dy} ${cx2},${h - border + 2}`);
  }
  // Left edge folds
  for (let y = border; y < h - border; y += 22 + Math.random() * 18) {
    const dx = 6 + Math.random() * 14;
    const cy1 = y + 6 + Math.random() * 8;
    const cy2 = y + 14 + Math.random() * 8;
    paths.push(`M${border - 4},${y} Q${border - dx},${cy1} ${border - 2},${cy2}`);
  }
  // Right edge folds
  for (let y = border; y < h - border; y += 22 + Math.random() * 18) {
    const dx = 6 + Math.random() * 14;
    const cy1 = y + 6 + Math.random() * 8;
    const cy2 = y + 14 + Math.random() * 8;
    paths.push(`M${w - border + 4},${y} Q${w - border + dx},${cy1} ${w - border + 2},${cy2}`);
  }
  return paths;
}

// Veins that spread across the border area
function brainVeins(w: number, h: number, border: number): string[] {
  const veins: string[] = [];
  // Top-left veins
  veins.push(`M${border * 0.3},${border * 0.5} Q${border * 0.8},${border * 0.3} ${border + 10},${border * 0.6}`);
  veins.push(`M${border * 0.5},${border * 0.2} Q${border},${border * 0.5} ${border + 20},${border * 0.4}`);
  // Top-right veins
  veins.push(`M${w - border * 0.3},${border * 0.5} Q${w - border * 0.8},${border * 0.3} ${w - border - 10},${border * 0.6}`);
  // Bottom veins
  veins.push(`M${border * 0.4},${h - border * 0.4} Q${border},${h - border * 0.6} ${border + 15},${h - border * 0.3}`);
  veins.push(`M${w - border * 0.5},${h - border * 0.3} Q${w - border},${h - border * 0.5} ${w - border - 12},${h - border * 0.8}`);
  // Side veins
  veins.push(`M${border * 0.3},${h * 0.4} Q${border * 0.6},${h * 0.35} ${border * 0.3},${h * 0.3}`);
  veins.push(`M${w - border * 0.3},${h * 0.55} Q${w - border * 0.5},${h * 0.6} ${w - border * 0.4},${h * 0.65}`);
  return veins;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TracePathGame({
  onComplete,
  onProgress,
  accentColor = "#10B981",
}: MiniGameProps) {
  // Shuffle right side once
  const rightOrderRef = useRef(shuffleArray([0, 1, 2]));
  const rightOrder = rightOrderRef.current;

  // Pre-generate brain decorations once
  const foldsRef = useRef(brainFolds(WIRE_AREA_W, WIRE_AREA_H, BRAIN_BORDER));
  const veinsRef = useRef(brainVeins(WIRE_AREA_W, WIRE_AREA_H, BRAIN_BORDER));

  const [connected, setConnected] = useState<boolean[]>([false, false, false]);
  const connectedRef = useRef([false, false, false]);
  const [activeNerve, setActiveNerve] = useState<number | null>(null);
  const [drawPath, setDrawPath] = useState<{ x: number; y: number }[]>([]);
  const activeNerveRef = useRef<number | null>(null);
  const pathRef = useRef<{ x: number; y: number }[]>([]);
  const doneRef = useRef(false);
  const doneCountRef = useRef(0);

  // Find right-side Y for a given nerve id
  const getRightY = useCallback((nerveId: number) => {
    const idx = rightOrder.indexOf(nerveId);
    return NODE_YS[idx];
  }, [rightOrder]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,
      onPanResponderGrant: (evt) => {
        if (doneRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        for (let i = 0; i < 3; i++) {
          if (connectedRef.current[i]) continue;
          const ny = NODE_YS[i];
          const dist = Math.sqrt((locationX - NODE_LEFT_X) ** 2 + (locationY - ny) ** 2);
          if (dist < SNAP_DIST * 1.5) {
            activeNerveRef.current = i;
            setActiveNerve(i);
            pathRef.current = [{ x: NODE_LEFT_X, y: ny }];
            setDrawPath([{ x: NODE_LEFT_X, y: ny }]);
            return;
          }
        }
      },
      onPanResponderMove: (evt) => {
        if (doneRef.current || activeNerveRef.current === null) return;
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = [...pathRef.current, { x: locationX, y: locationY }];
        pathRef.current = newPath;
        setDrawPath([...newPath]);
      },
      onPanResponderRelease: (evt) => {
        if (doneRef.current || activeNerveRef.current === null) {
          activeNerveRef.current = null;
          setActiveNerve(null);
          pathRef.current = [];
          setDrawPath([]);
          return;
        }
        const nerveId = activeNerveRef.current;
        const { locationX, locationY } = evt.nativeEvent;
        const targetY = getRightY(nerveId);
        const dist = Math.sqrt((locationX - NODE_RIGHT_X) ** 2 + (locationY - targetY) ** 2);

        if (dist < SNAP_DIST * 1.5) {
          connectedRef.current[nerveId] = true;
          doneCountRef.current += 1;
          setConnected([...connectedRef.current]);
          onProgress?.(doneCountRef.current / 3);

          if (doneCountRef.current >= 3) {
            doneRef.current = true;
            setTimeout(() => onComplete(), 500);
          }
        }

        activeNerveRef.current = null;
        setActiveNerve(null);
        pathRef.current = [];
        setDrawPath([]);
      },
    })
  ).current;

  const allDone = connected.every(Boolean);

  return (
    <View style={gStyles.center}>
      <Text style={gStyles.instruction}>
        {allDone ? "Nerves reconnected!" : "Connect matching nerve colours!"}
      </Text>

      <View
        style={[wireStyles.area, { width: WIRE_AREA_W, height: WIRE_AREA_H }]}
        {...panResponder.panHandlers}
      >
        <Svg width={WIRE_AREA_W} height={WIRE_AREA_H} viewBox={`0 0 ${WIRE_AREA_W} ${WIRE_AREA_H}`}>
          <Defs>
            <SvgRadialGradient id="brainBg" cx="50%" cy="50%" r="58%">
              <Stop offset="0%" stopColor="#E8B0B8" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C88898" stopOpacity="1" />
            </SvgRadialGradient>
            <SvgRadialGradient id="nodeGlowR" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient id="nodeGlowG" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient id="nodeGlowB" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>

          {/* Brain tissue border fill */}
          <Rect x="0" y="0" width={WIRE_AREA_W} height={WIRE_AREA_H} rx="18" fill="url(#brainBg)" />

          {/* Brain fold details in border area */}
          {foldsRef.current.map((d, i) => (
            <Path key={`fold-${i}`} d={d} stroke="#C08090" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.7} />
          ))}

          {/* Organic bumps along the border */}
          {[
            // Top bumps
            ...Array.from({ length: 5 }, (_, i) => ({ cx: BRAIN_BORDER + 20 + i * ((INNER_W - 20) / 5), cy: BRAIN_BORDER * 0.5, rx: 14 + (i % 3) * 4, ry: 10 + (i % 2) * 4 })),
            // Bottom bumps
            ...Array.from({ length: 5 }, (_, i) => ({ cx: BRAIN_BORDER + 20 + i * ((INNER_W - 20) / 5), cy: WIRE_AREA_H - BRAIN_BORDER * 0.5, rx: 12 + (i % 3) * 5, ry: 9 + (i % 2) * 4 })),
            // Left bumps
            ...Array.from({ length: 4 }, (_, i) => ({ cx: BRAIN_BORDER * 0.45, cy: BRAIN_BORDER + 15 + i * ((INNER_H - 15) / 4), rx: 10 + (i % 2) * 5, ry: 12 + (i % 3) * 4 })),
            // Right bumps
            ...Array.from({ length: 4 }, (_, i) => ({ cx: WIRE_AREA_W - BRAIN_BORDER * 0.45, cy: BRAIN_BORDER + 15 + i * ((INNER_H - 15) / 4), rx: 10 + (i % 2) * 5, ry: 12 + (i % 3) * 4 })),
          ].map((b, i) => (
            <SvgEllipse key={`bump-${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill="#D4A0A8" opacity={0.55} />
          ))}

          {/* Veins in border */}
          {veinsRef.current.map((d, i) => (
            <Path key={`vein-${i}`} d={d} stroke="#A06070" strokeWidth={1.5} fill="none" opacity={0.6} />
          ))}

          {/* Corner blobs (like brain lobes) */}
          <SvgEllipse cx={BRAIN_BORDER * 0.5} cy={BRAIN_BORDER * 0.5} rx={BRAIN_BORDER * 0.6} ry={BRAIN_BORDER * 0.55} fill="#D8A8B0" opacity={0.8} />
          <SvgEllipse cx={WIRE_AREA_W - BRAIN_BORDER * 0.5} cy={BRAIN_BORDER * 0.5} rx={BRAIN_BORDER * 0.6} ry={BRAIN_BORDER * 0.55} fill="#D8A8B0" opacity={0.8} />
          <SvgEllipse cx={BRAIN_BORDER * 0.5} cy={WIRE_AREA_H - BRAIN_BORDER * 0.5} rx={BRAIN_BORDER * 0.6} ry={BRAIN_BORDER * 0.55} fill="#D8A8B0" opacity={0.8} />
          <SvgEllipse cx={WIRE_AREA_W - BRAIN_BORDER * 0.5} cy={WIRE_AREA_H - BRAIN_BORDER * 0.5} rx={BRAIN_BORDER * 0.6} ry={BRAIN_BORDER * 0.55} fill="#D8A8B0" opacity={0.8} />

          {/* Solid centre area — warm brain-themed tone so coloured lines stand out */}
          <Rect x={INNER_X} y={INNER_Y} width={INNER_W} height={INNER_H} rx="10" fill="#E8C8C0" />
          <Rect x={INNER_X} y={INNER_Y} width={INNER_W} height={INNER_H} rx="10" fill="rgba(200,160,150,0.35)" />

          {/* Inner border line */}
          <Rect x={INNER_X} y={INNER_Y} width={INNER_W} height={INNER_H} rx="10" stroke="#A06878" strokeWidth="2" fill="none" />

          {/* Connected wires (permanent) */}
          {NERVE_COLORS.map((nerve, i) => {
            if (!connected[i]) return null;
            const ly = NODE_YS[i];
            const ry = getRightY(i);
            const midX = WIRE_AREA_W / 2;
            return (
              <Path
                key={`wire-${i}`}
                d={`M${NODE_LEFT_X},${ly} C${midX},${ly} ${midX},${ry} ${NODE_RIGHT_X},${ry}`}
                fill="none"
                stroke={nerve.color}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}

          {/* Active drawing path */}
          {activeNerve !== null && drawPath.length > 1 && (
            <Path
              d={drawPath.reduce((acc, p, i) => {
                return i === 0 ? `M${p.x},${p.y}` : acc + ` L${p.x},${p.y}`;
              }, "")}
              fill="none"
              stroke={NERVE_COLORS[activeNerve].color}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
            />
          )}

          {/* Left nodes — numbered */}
          {NERVE_COLORS.map((nerve, i) => {
            const glowId = i === 0 ? "nodeGlowR" : i === 1 ? "nodeGlowG" : "nodeGlowB";
            return (
              <React.Fragment key={`left-${i}`}>
                {/* Outer glow */}
                <Circle cx={NODE_LEFT_X} cy={NODE_YS[i]} r={NODE_R + 10} fill={`url(#${glowId})`} />
                {/* Main node */}
                <Circle
                  cx={NODE_LEFT_X}
                  cy={NODE_YS[i]}
                  r={NODE_R}
                  fill={connected[i] ? nerve.color : "#1A0A10"}
                  stroke={nerve.color}
                  strokeWidth={3}
                />
                {/* Highlight */}
                <Circle
                  cx={NODE_LEFT_X - 4}
                  cy={NODE_YS[i] - 5}
                  r={6}
                  fill="rgba(255,255,255,0.25)"
                />
                {/* Number label — always visible */}
                <SvgText
                  x={NODE_LEFT_X}
                  y={NODE_YS[i] + 6}
                  fill="#FFF"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {nerve.label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Right nodes (shuffled order) — coloured spheres */}
          {rightOrder.map((nerveId, i) => {
            const nerve = NERVE_COLORS[nerveId];
            const glowId = nerveId === 0 ? "nodeGlowR" : nerveId === 1 ? "nodeGlowG" : "nodeGlowB";
            return (
              <React.Fragment key={`right-${i}`}>
                {/* Outer glow */}
                <Circle cx={NODE_RIGHT_X} cy={NODE_YS[i]} r={NODE_R + 10} fill={`url(#${glowId})`} />
                {/* Main node */}
                <Circle
                  cx={NODE_RIGHT_X}
                  cy={NODE_YS[i]}
                  r={NODE_R}
                  fill={connected[nerveId] ? nerve.color : nerve.color}
                  stroke={connected[nerveId] ? "#FFF" : nerve.color}
                  strokeWidth={3}
                  opacity={connected[nerveId] ? 1 : 0.85}
                />
                {/* Highlight shine */}
                <Circle
                  cx={NODE_RIGHT_X - 4}
                  cy={NODE_YS[i] - 5}
                  r={6}
                  fill="rgba(255,255,255,0.35)"
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {allDone && <Text style={gStyles.successBurst}>CONNECTED!</Text>}
    </View>
  );
}

const wireStyles = StyleSheet.create({
  area: {
    marginTop: 8,
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#C88898",
  },
});

/* ====================================================================
 *  5.  SWELLING  –  Pressure Point Release: press & hold trigger points
 *      on an anatomical back SVG to release them.
 * ==================================================================== */
const BUMP_COUNT = 3;
const HOLD_DURATION = 1500; // ms to hold each bump
const TICK_INTERVAL = 50;
const BACK_SIZE = W * 0.90;
const BACK_VB = 200; // SVG viewBox

// Pressure point positions in viewBox coords (on the back)
const PRESSURE_PTS = [
  { x: 65,  y: 55,  label: "Upper Trap" },   // left upper trapezius
  { x: 135, y: 75,  label: "Rhomboid" },      // right rhomboid
  { x: 80,  y: 135, label: "Lower Back" },    // left lower back
];

export function CircularMassageGame({
  onComplete,
  onProgress,
  accentColor = "#EC4899",
}: MiniGameProps) {
  const [fills, setFills] = useState<number[]>(Array(BUMP_COUNT).fill(0));
  const [drained, setDrained] = useState<boolean[]>(Array(BUMP_COUNT).fill(false));
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const fillsRef = useRef<number[]>(Array(BUMP_COUNT).fill(0));
  const drainedRef = useRef<boolean[]>(Array(BUMP_COUNT).fill(false));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const scale = BACK_SIZE / BACK_VB;
  const PT_R_VB = 14; // radius of pressure point in viewBox
  const PT_R_PX = PT_R_VB * scale;

  const handlePressIn = useCallback((idx: number) => {
    if (doneRef.current || drainedRef.current[idx]) return;
    setActiveIdx(idx);
    stopTimer();

    timerRef.current = setInterval(() => {
      const newFills = [...fillsRef.current];
      newFills[idx] = Math.min(HOLD_DURATION, newFills[idx] + TICK_INTERVAL);
      fillsRef.current = newFills;
      setFills([...newFills]);

      if (newFills[idx] >= HOLD_DURATION) {
        const newDrained = [...drainedRef.current];
        newDrained[idx] = true;
        drainedRef.current = newDrained;
        setDrained([...newDrained]);
        stopTimer();
        setActiveIdx(null);

        const drainedCount = newDrained.filter(Boolean).length;
        onProgress?.(drainedCount / BUMP_COUNT);

        if (drainedCount >= BUMP_COUNT) {
          doneRef.current = true;
          setDone(true);
          setTimeout(() => onComplete(), 400);
        }
      }
    }, TICK_INTERVAL);
  }, [onComplete, onProgress, stopTimer]);

  const handlePressOut = useCallback((idx: number) => {
    stopTimer();
    setActiveIdx(null);
    if (!drainedRef.current[idx]) {
      const newFills = [...fillsRef.current];
      newFills[idx] = 0;
      fillsRef.current = newFills;
      setFills([...newFills]);
    }
  }, [stopTimer]);

  return (
    <View style={gStyles.center}>
      <Text style={gStyles.instruction}>
        {done ? "Tension released!" : "Press & hold each trigger point!"}
      </Text>

      <View style={backStyles.frame}>
        {/* Back anatomy SVG */}
        <Svg width={BACK_SIZE} height={BACK_SIZE} viewBox={`0 0 ${BACK_VB} ${BACK_VB}`}>
          <Defs>
            <LinearGradient id="backSkin" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D4956A" stopOpacity="1" />
              <Stop offset="50%" stopColor="#C8885E" stopOpacity="1" />
              <Stop offset="100%" stopColor="#B87A52" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="muscleL" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#C07050" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#A05838" stopOpacity="0.4" />
            </LinearGradient>
            <LinearGradient id="muscleR" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#C07050" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#A05838" stopOpacity="0.4" />
            </LinearGradient>
            <SvgRadialGradient id="ptActive" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFDD44" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FF6633" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#FF3322" stopOpacity="0.6" />
            </SvgRadialGradient>
            <SvgRadialGradient id="ptIdle" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFCC33" stopOpacity="0.8" />
              <Stop offset="60%" stopColor="#FF5533" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#CC2211" stopOpacity="0.3" />
            </SvgRadialGradient>
          </Defs>

          {/* Background skin */}
          <Rect x="0" y="0" width={BACK_VB} height={BACK_VB} fill="#2A1A12" rx="12" />

          {/* Back torso shape */}
          <Path
            d="M60 8 Q50 8, 40 14 Q28 22, 22 38 Q18 50, 20 70 Q22 95, 28 120 Q32 140, 40 158 Q48 170, 60 178 L80 182 Q95 184, 100 184 Q105 184, 120 182 L140 178 Q152 170, 160 158 Q168 140, 172 120 Q178 95, 180 70 Q182 50, 178 38 Q172 22, 160 14 Q150 8, 140 8 L120 10 Q110 12, 100 14 Q90 12, 80 10 Z"
            fill="url(#backSkin)"
            stroke="rgba(160,100,60,0.5)"
            strokeWidth="1"
          />

          {/* === SPINE === */}
          {/* Vertebrae bumps down the center */}
          {[28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140, 148, 156].map((vy, i) => (
            <React.Fragment key={`vert-${i}`}>
              <SvgEllipse cx="100" cy={vy} rx="3.5" ry="2.5" fill="rgba(180,130,90,0.5)" />
              <Line x1="96" y1={vy} x2="104" y2={vy} stroke="rgba(160,110,70,0.3)" strokeWidth="0.5" />
            </React.Fragment>
          ))}
          {/* Spine groove */}
          <Line x1="100" y1="22" x2="100" y2="164" stroke="rgba(140,90,55,0.35)" strokeWidth="1.5" />

          {/* === TRAPEZIUS MUSCLES (upper back) === */}
          <Path
            d="M100 18 Q80 20, 60 30 Q42 40, 36 55 Q34 62, 40 65 Q50 60, 70 50 Q85 42, 100 38"
            fill="url(#muscleL)" stroke="rgba(160,90,60,0.3)" strokeWidth="0.8"
          />
          <Path
            d="M100 18 Q120 20, 140 30 Q158 40, 164 55 Q166 62, 160 65 Q150 60, 130 50 Q115 42, 100 38"
            fill="url(#muscleR)" stroke="rgba(160,90,60,0.3)" strokeWidth="0.8"
          />

          {/* === LATISSIMUS DORSI (mid-back wings) === */}
          <Path
            d="M40 65 Q32 80, 28 100 Q26 115, 30 130 Q34 140, 45 145 Q55 140, 62 125 Q68 110, 70 90 Q70 75, 65 65 Z"
            fill="url(#muscleL)" stroke="rgba(160,90,60,0.25)" strokeWidth="0.7"
          />
          <Path
            d="M160 65 Q168 80, 172 100 Q174 115, 170 130 Q166 140, 155 145 Q145 140, 138 125 Q132 110, 130 90 Q130 75, 135 65 Z"
            fill="url(#muscleR)" stroke="rgba(160,90,60,0.25)" strokeWidth="0.7"
          />

          {/* === RHOMBOIDS (between spine and scapula) === */}
          <Path
            d="M70 50 Q78 48, 85 55 Q90 65, 88 78 Q85 85, 76 82 Q68 75, 66 65 Z"
            fill="rgba(185,120,80,0.3)" stroke="rgba(160,100,60,0.2)" strokeWidth="0.6"
          />
          <Path
            d="M130 50 Q122 48, 115 55 Q110 65, 112 78 Q115 85, 124 82 Q132 75, 134 65 Z"
            fill="rgba(185,120,80,0.3)" stroke="rgba(160,100,60,0.2)" strokeWidth="0.6"
          />

          {/* === ERECTOR SPINAE (parallel to spine) === */}
          <Path
            d="M90 45 Q88 70, 86 100 Q84 130, 86 155 Q88 160, 94 158 Q96 130, 96 100 Q96 70, 94 45 Z"
            fill="rgba(175,115,75,0.25)" stroke="rgba(150,95,60,0.15)" strokeWidth="0.5"
          />
          <Path
            d="M110 45 Q112 70, 114 100 Q116 130, 114 155 Q112 160, 106 158 Q104 130, 104 100 Q104 70, 106 45 Z"
            fill="rgba(175,115,75,0.25)" stroke="rgba(150,95,60,0.15)" strokeWidth="0.5"
          />

          {/* === SCAPULAE (shoulder blades) === */}
          <Path
            d="M50 42 Q44 50, 42 65 Q42 78, 48 85 Q56 90, 65 82 Q72 72, 70 58 Q68 46, 58 40 Z"
            fill="none" stroke="rgba(140,90,55,0.35)" strokeWidth="1.2"
          />
          <Path
            d="M150 42 Q156 50, 158 65 Q158 78, 152 85 Q144 90, 135 82 Q128 72, 130 58 Q132 46, 142 40 Z"
            fill="none" stroke="rgba(140,90,55,0.35)" strokeWidth="1.2"
          />

          {/* === MUSCLE FIBER LINES === */}
          {/* Left side fibers */}
          <Path d="M55 55 Q65 60, 75 70" fill="none" stroke="rgba(170,110,70,0.2)" strokeWidth="0.5" />
          <Path d="M48 70 Q58 75, 68 85" fill="none" stroke="rgba(170,110,70,0.2)" strokeWidth="0.5" />
          <Path d="M42 90 Q55 95, 68 105" fill="none" stroke="rgba(170,110,70,0.18)" strokeWidth="0.5" />
          <Path d="M38 110 Q52 112, 70 118" fill="none" stroke="rgba(170,110,70,0.15)" strokeWidth="0.5" />
          {/* Right side fibers */}
          <Path d="M145 55 Q135 60, 125 70" fill="none" stroke="rgba(170,110,70,0.2)" strokeWidth="0.5" />
          <Path d="M152 70 Q142 75, 132 85" fill="none" stroke="rgba(170,110,70,0.2)" strokeWidth="0.5" />
          <Path d="M158 90 Q145 95, 132 105" fill="none" stroke="rgba(170,110,70,0.18)" strokeWidth="0.5" />
          <Path d="M162 110 Q148 112, 130 118" fill="none" stroke="rgba(170,110,70,0.15)" strokeWidth="0.5" />

          {/* === PRESSURE POINTS (target circles with rings) === */}
          {PRESSURE_PTS.map((pt, i) => {
            const pct = fills[i] / HOLD_DURATION;
            const isDrained = drained[i];
            const isActive = activeIdx === i;

            return (
              <React.Fragment key={`pt-${i}`}>
                {/* Outer glow */}
                {(isActive || isDrained) && (
                  <Circle
                    cx={pt.x} cy={pt.y} r={PT_R_VB + 4}
                    fill="none"
                    stroke={isDrained ? "rgba(74,222,128,0.4)" : "rgba(255,100,50,0.3)"}
                    strokeWidth="3"
                  />
                )}
                {/* Main pressure point */}
                <Circle
                  cx={pt.x} cy={pt.y} r={PT_R_VB}
                  fill={isDrained ? "rgba(74,222,128,0.15)" : (isActive ? "url(#ptActive)" : "url(#ptIdle)")}
                  stroke={isDrained ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.3)"}
                  strokeWidth="1.5"
                />
                {/* Inner dot */}
                {!isDrained && (
                  <Circle
                    cx={pt.x} cy={pt.y} r={4}
                    fill={isActive ? "#FFE066" : "#FFCC33"}
                    opacity={isActive ? 1 : 0.7}
                  />
                )}
                {/* Progress ring */}
                <Circle
                  cx={pt.x} cy={pt.y} r={PT_R_VB - 2}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2.5"
                />
                <Circle
                  cx={pt.x} cy={pt.y} r={PT_R_VB - 2}
                  fill="none"
                  stroke={isDrained ? "#4ADE80" : "#FFF"}
                  strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * (PT_R_VB - 2)}`}
                  strokeDashoffset={`${2 * Math.PI * (PT_R_VB - 2) * (1 - pct)}`}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${pt.x},${pt.y}`}
                  opacity={0.9}
                />
                {/* Checkmark when done */}
                {isDrained && (
                  <SvgText x={pt.x} y={pt.y + 5} textAnchor="middle" fill="#4ADE80" fontSize="14" fontWeight="bold">✓</SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Touchable overlay for each pressure point */}
        {PRESSURE_PTS.map((pt, i) => (
          <TouchableOpacity
            key={`touch-${i}`}
            activeOpacity={1}
            onPressIn={() => handlePressIn(i)}
            onPressOut={() => handlePressOut(i)}
            disabled={drained[i] || done}
            style={[
              backStyles.touchTarget,
              {
                left: pt.x * scale - PT_R_PX - 4,
                top: pt.y * scale - PT_R_PX - 4,
                width: (PT_R_PX + 4) * 2,
                height: (PT_R_PX + 4) * 2,
                borderRadius: PT_R_PX + 4,
              },
            ]}
          />
        ))}
      </View>

      {done && <Text style={gStyles.successBurst}>RELEASED!</Text>}
    </View>
  );
}

const backStyles = StyleSheet.create({
  frame: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginTop: 6,
  },
  touchTarget: {
    position: "absolute",
    zIndex: 10,
  },
});

/* ====================================================================
 *  6.  FIND_PATH  –  Maze Path-Finder
 *  Draw a path from start→end through a procedural maze.
 *  Organic tissue-themed background; finger must stay on corridors.
 * ==================================================================== */

// ── Maze generation (recursive back-tracker) ──────────────────────
const MAZE_COLS = 7;
const MAZE_ROWS = 5;

interface MazeCell { top: boolean; right: boolean; bottom: boolean; left: boolean; visited: boolean }

function generateMaze(cols: number, rows: number): MazeCell[][] {
  const grid: MazeCell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { top: true, right: true, bottom: true, left: true, visited: false };
    }
  }
  const stack: [number, number][] = [];
  const start: [number, number] = [0, Math.floor(rows / 2)];
  grid[start[1]][start[0]].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbours: [number, number, string, string][] = [];
    if (cy > 0 && !grid[cy - 1][cx].visited) neighbours.push([cx, cy - 1, "top", "bottom"]);
    if (cy < rows - 1 && !grid[cy + 1][cx].visited) neighbours.push([cx, cy + 1, "bottom", "top"]);
    if (cx > 0 && !grid[cy][cx - 1].visited) neighbours.push([cx - 1, cy, "left", "right"]);
    if (cx < cols - 1 && !grid[cy][cx + 1].visited) neighbours.push([cx + 1, cy, "right", "left"]);

    if (neighbours.length === 0) {
      stack.pop();
    } else {
      const [nx, ny, wall, opposite] = neighbours[Math.floor(Math.random() * neighbours.length)];
      (grid[cy][cx] as any)[wall] = false;
      (grid[ny][nx] as any)[opposite] = false;
      grid[ny][nx].visited = true;
      stack.push([nx, ny]);
    }
  }
  // Open entrance (left of start row) and exit (right of middle-ish row)
  const startRow = Math.floor(rows / 2);
  grid[startRow][0].left = false;
  // Find a good exit row — use BFS to find the farthest reachable cell in the last column
  let exitRow = startRow;
  for (let r = 0; r < rows; r++) {
    grid[r][cols - 1].right = false; // test
    // Just pick the bottom half for variety
  }
  // Reclose all right edges except the chosen exit
  for (let r = 0; r < rows; r++) grid[r][cols - 1].right = true;
  exitRow = rows - 1 - startRow; // opposite side for challenge
  grid[exitRow][cols - 1].right = false;

  return grid;
}

// Solve maze with BFS and return waypoint path in cell coords
function solveMaze(grid: MazeCell[][], cols: number, rows: number, sr: number, er: number): [number, number][] {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = Array.from({ length: rows }, () => Array<[number, number] | null>(cols).fill(null));
  const queue: [number, number][] = [[0, sr]];
  visited[sr][0] = true;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (cx === cols - 1 && cy === er) break;
    const cell = grid[cy][cx];
    const moves: [number, number, boolean][] = [
      [cx, cy - 1, !cell.top],
      [cx + 1, cy, !cell.right],
      [cx, cy + 1, !cell.bottom],
      [cx - 1, cy, !cell.left],
    ];
    for (const [nx, ny, open] of moves) {
      if (open && nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        visited[ny][nx] = true;
        parent[ny][nx] = [cx, cy];
        queue.push([nx, ny]);
      }
    }
  }
  // Trace back
  const path: [number, number][] = [];
  let cur: [number, number] | null = [cols - 1, er];
  while (cur) {
    path.unshift(cur);
    cur = parent[cur[1]][cur[0]];
  }
  return path;
}

const MAZE_AREA_SIZE = W * 0.90;
const MAZE_AREA_W = MAZE_AREA_SIZE;
const MAZE_AREA_H = MAZE_AREA_SIZE;
const CELL_W = (MAZE_AREA_W - 20) / MAZE_COLS;
const CELL_H = (MAZE_AREA_H - 20) / MAZE_ROWS;
const MAZE_PAD = 10;
const PATH_TOLERANCE = CELL_W * 0.62;

export function FindPathGame({
  onComplete,
  onProgress,
  accentColor = "#E85D75",
}: MiniGameProps) {
  const startRow = Math.floor(MAZE_ROWS / 2);
  const exitRow = MAZE_ROWS - 1 - startRow;

  // Generate maze once
  const mazeRef = useRef(generateMaze(MAZE_COLS, MAZE_ROWS));
  const maze = mazeRef.current;

  // Solve for the solution path (cell coords)
  const solutionRef = useRef(solveMaze(maze, MAZE_COLS, MAZE_ROWS, startRow, exitRow));
  const solution = solutionRef.current;

  // Convert solution to pixel waypoints
  const waypoints = useRef(
    solution.map(([cx, cy]) => ({
      x: MAZE_PAD + cx * CELL_W + CELL_W / 2,
      y: MAZE_PAD + cy * CELL_H + CELL_H / 2,
    }))
  ).current;

  // 2 checkpoints at ~1/3 and ~2/3 of the solution path
  const checkpointIndices = useRef([
    Math.floor(waypoints.length / 3),
    Math.floor((waypoints.length * 2) / 3),
  ]).current;

  const [currentWP, setCurrentWP] = useState(0);
  const [trailPath, setTrailPath] = useState<{ x: number; y: number }[]>([]);
  const [done, setDone] = useState(false);
  const [lastCheckpoint, setLastCheckpoint] = useState(0);
  const currentWPRef = useRef(0);
  const doneRef = useRef(false);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const trackingRef = useRef(false);
  const lastCheckpointRef = useRef(0);
  // Permanent trail segments saved at each checkpoint
  const [savedTrails, setSavedTrails] = useState<string[]>([]);

  // Glow animation for start/end
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const cellCenter = (cx: number, cy: number) => ({
    x: MAZE_PAD + cx * CELL_W + CELL_W / 2,
    y: MAZE_PAD + cy * CELL_H + CELL_H / 2,
  });

  // Check if a pixel point is on any corridor (not just the solution)
  const isOnCorridor = useCallback((px: number, py: number): boolean => {
    // Convert to grid coords
    const gc = (px - MAZE_PAD) / CELL_W;
    const gr = (py - MAZE_PAD) / CELL_H;
    const col = Math.floor(gc);
    const row = Math.floor(gr);
    if (col < 0 || col >= MAZE_COLS || row < 0 || row >= MAZE_ROWS) {
      // Allow slight overshoot at entrance/exit
      if (col === -1 && row === startRow) return true;
      if (col === MAZE_COLS && row === exitRow) return true;
      return false;
    }
    // Fraction within cell
    const fx = gc - col;
    const fy = gr - row;
    const cell = maze[row][col];
    const margin = 0.12;
    const inCenter = fx > margin && fx < 1 - margin && fy > margin && fy < 1 - margin;
    if (inCenter) return true;
    // In top corridor
    if (!cell.top && fx > margin && fx < 1 - margin && fy <= margin) return true;
    // In bottom corridor
    if (!cell.bottom && fx > margin && fx < 1 - margin && fy >= 1 - margin) return true;
    // In left corridor
    if (!cell.left && fy > margin && fy < 1 - margin && fx <= margin) return true;
    // In right corridor
    if (!cell.right && fy > margin && fy < 1 - margin && fx >= 1 - margin) return true;
    return false;
  }, [maze]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,
      onPanResponderGrant: (evt) => {
        if (doneRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        // Allow starting from the current checkpoint or the start
        const resumeWP = lastCheckpointRef.current;
        const resumePt = waypoints[resumeWP];
        const dist = Math.sqrt((locationX - resumePt.x) ** 2 + (locationY - resumePt.y) ** 2);
        if (dist < CELL_W * 1.2) {
          trackingRef.current = true;
          currentWPRef.current = resumeWP + 1;
          setCurrentWP(resumeWP + 1);
          trailRef.current = [{ x: resumePt.x, y: resumePt.y }];
          setTrailPath([{ x: resumePt.x, y: resumePt.y }]);
          onProgress?.(resumeWP / waypoints.length);
        }
      },
      onPanResponderMove: (evt) => {
        if (doneRef.current || !trackingRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;

        // Check if finger is still on a corridor
        if (!isOnCorridor(locationX, locationY)) {
          // Reset to last checkpoint, not start
          trackingRef.current = false;
          const cp = lastCheckpointRef.current;
          currentWPRef.current = cp;
          setCurrentWP(cp);
          trailRef.current = [];
          setTrailPath([]);
          onProgress?.(cp / waypoints.length);
          return;
        }

        // Add to trail
        const newTrail = [...trailRef.current, { x: locationX, y: locationY }];
        trailRef.current = newTrail;
        setTrailPath([...newTrail]);

        // Check if we reached the next waypoint
        const wp = waypoints[currentWPRef.current];
        if (wp) {
          const dist = Math.sqrt((locationX - wp.x) ** 2 + (locationY - wp.y) ** 2);
          if (dist < PATH_TOLERANCE) {
            const nextWP = currentWPRef.current + 1;
            currentWPRef.current = nextWP;
            setCurrentWP(nextWP);
            onProgress?.(nextWP / waypoints.length);

            // Check if we hit a checkpoint — save progress
            if (checkpointIndices.includes(currentWPRef.current - 1) || currentWPRef.current - 1 === 0) {
              const cpIdx = currentWPRef.current - 1;
              if (cpIdx > lastCheckpointRef.current) {
                lastCheckpointRef.current = cpIdx;
                setLastCheckpoint(cpIdx);
                // Save the current trail as a permanent segment
                if (trailRef.current.length > 1) {
                  const d = trailRef.current.reduce((acc, p, i) => (i === 0 ? `M${p.x},${p.y}` : acc + ` L${p.x},${p.y}`), "");
                  setSavedTrails(prev => [...prev, d]);
                }
              }
            }

            // Check if done
            if (nextWP >= waypoints.length) {
              doneRef.current = true;
              setDone(true);
              onProgress?.(1);
              setTimeout(() => onComplete(), 600);
            }
          }
        }
      },
      onPanResponderRelease: () => {
        if (doneRef.current) return;
        // Reset to last checkpoint
        trackingRef.current = false;
        const cp = lastCheckpointRef.current;
        currentWPRef.current = cp;
        setCurrentWP(cp);
        trailRef.current = [];
        setTrailPath([]);
        onProgress?.(cp / waypoints.length);
      },
    })
  ).current;

  // ── Render maze walls as SVG ──
  const wallPaths: string[] = [];
  const wallThickness = 5;
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      const x = MAZE_PAD + c * CELL_W;
      const y = MAZE_PAD + r * CELL_H;
      const cell = maze[r][c];
      if (cell.top) wallPaths.push(`M${x},${y} L${x + CELL_W},${y}`);
      if (cell.right) wallPaths.push(`M${x + CELL_W},${y} L${x + CELL_W},${y + CELL_H}`);
      if (cell.bottom) wallPaths.push(`M${x},${y + CELL_H} L${x + CELL_W},${y + CELL_H}`);
      if (cell.left) wallPaths.push(`M${x},${y} L${x},${y + CELL_H}`);
    }
  }

  // ── Organic tissue background blobs (decorative) ──
  const bgBlobs = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      cx: MAZE_PAD + Math.random() * (MAZE_AREA_W - 2 * MAZE_PAD),
      cy: MAZE_PAD + Math.random() * (MAZE_AREA_H - 2 * MAZE_PAD),
      rx: 10 + Math.random() * 18,
      ry: 8 + Math.random() * 14,
      opacity: 0.12 + Math.random() * 0.18,
    }))
  ).current;

  // Vein lines (decorative)
  const veins = useRef(
    Array.from({ length: 6 }, () => {
      const sx = MAZE_PAD + Math.random() * (MAZE_AREA_W - 2 * MAZE_PAD);
      const sy = MAZE_PAD + Math.random() * (MAZE_AREA_H - 2 * MAZE_PAD);
      const dx = (Math.random() - 0.5) * 60;
      const dy = (Math.random() - 0.5) * 50;
      return `M${sx},${sy} Q${sx + dx * 0.5},${sy + dy} ${sx + dx},${sy + dy * 0.6}`;
    })
  ).current;

  const startPx = cellCenter(0, startRow);
  const endPx = cellCenter(MAZE_COLS - 1, exitRow);

  return (
    <View style={gStyles.center}>
      <Text style={gStyles.instruction}>
        {done ? "Path cleared!" : "Trace a path from start to end!"}
      </Text>

      <View
        style={[mazeStyles.area, { width: MAZE_AREA_W, height: MAZE_AREA_H }]}
        {...panResponder.panHandlers}
      >
        <Svg width={MAZE_AREA_W} height={MAZE_AREA_H} viewBox={`0 0 ${MAZE_AREA_W} ${MAZE_AREA_H}`}>
          <Defs>
            <SvgRadialGradient id="tissueBg" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#C94060" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#8B1A30" stopOpacity="0.55" />
            </SvgRadialGradient>
            <SvgRadialGradient id="startGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient id="endGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#4ADE80" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
            </SvgRadialGradient>
            <LinearGradient id="corridorFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F2B8A0" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#E89880" stopOpacity="0.45" />
            </LinearGradient>
          </Defs>

          {/* Background tissue fill */}
          <Rect x="0" y="0" width={MAZE_AREA_W} height={MAZE_AREA_H} rx="14" fill="#6B1828" />
          <Rect x="0" y="0" width={MAZE_AREA_W} height={MAZE_AREA_H} rx="14" fill="url(#tissueBg)" />

          {/* Organic blobs */}
          {bgBlobs.map((b, i) => (
            <SvgEllipse key={`blob-${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill="#A83050" opacity={b.opacity} />
          ))}

          {/* Veins */}
          {veins.map((d, i) => (
            <Path key={`vein-${i}`} d={d} stroke="#7B2040" strokeWidth={1.5} fill="none" opacity={0.5} />
          ))}

          {/* Corridor fill — draw filled rects for each open corridor */}
          {(() => {
            const corridors: React.ReactNode[] = [];
            const pad = 2;
            for (let r = 0; r < MAZE_ROWS; r++) {
              for (let c = 0; c < MAZE_COLS; c++) {
                const x = MAZE_PAD + c * CELL_W;
                const y = MAZE_PAD + r * CELL_H;
                const cell = maze[r][c];
                // Cell center fill
                corridors.push(
                  <Rect key={`cc-${r}-${c}`} x={x + pad} y={y + pad} width={CELL_W - pad * 2} height={CELL_H - pad * 2} rx={4} fill="url(#corridorFill)" />
                );
                // Open wall extensions
                if (!cell.right && c < MAZE_COLS - 1) {
                  corridors.push(
                    <Rect key={`cr-${r}-${c}`} x={x + CELL_W - pad} y={y + pad} width={pad * 2} height={CELL_H - pad * 2} fill="url(#corridorFill)" />
                  );
                }
                if (!cell.bottom && r < MAZE_ROWS - 1) {
                  corridors.push(
                    <Rect key={`cb-${r}-${c}`} x={x + pad} y={y + CELL_H - pad} width={CELL_W - pad * 2} height={pad * 2} fill="url(#corridorFill)" />
                  );
                }
              }
            }
            // Entrance corridor
            corridors.push(
              <Rect key="entrance" x={0} y={MAZE_PAD + startRow * CELL_H + pad} width={MAZE_PAD + pad} height={CELL_H - pad * 2} rx={3} fill="url(#corridorFill)" />
            );
            // Exit corridor
            corridors.push(
              <Rect key="exit" x={MAZE_PAD + (MAZE_COLS - 1) * CELL_W + CELL_W - pad} y={MAZE_PAD + exitRow * CELL_H + pad} width={MAZE_PAD + pad} height={CELL_H - pad * 2} rx={3} fill="url(#corridorFill)" />
            );
            return corridors;
          })()}

          {/* Maze walls */}
          <Path
            d={wallPaths.join(" ")}
            stroke="#3A0A18"
            strokeWidth={wallThickness}
            fill="none"
            strokeLinecap="round"
          />

          {/* Outer border */}
          <Rect x="1" y="1" width={MAZE_AREA_W - 2} height={MAZE_AREA_H - 2} rx="14" stroke="#2A0610" strokeWidth={4} fill="none" />

          {/* Player trail — saved checkpoint segments */}
          {savedTrails.map((d, i) => (
            <Path
              key={`saved-trail-${i}`}
              d={d}
              fill="none"
              stroke="#FFD700"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          ))}

          {/* Player trail — current segment */}
          {trailPath.length > 1 && (
            <Path
              d={trailPath.reduce((acc, p, i) => (i === 0 ? `M${p.x},${p.y}` : acc + ` L${p.x},${p.y}`), "")}
              fill="none"
              stroke="#FFD700"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* Waypoint dots — subtle guide for reached waypoints */}
          {waypoints.map((wp, i) => {
            if (i === 0 || i === waypoints.length - 1) return null;
            const isCheckpoint = checkpointIndices.includes(i);
            const reached = i < currentWP;
            if (isCheckpoint) {
              const cpReached = i <= lastCheckpoint;
              return (
                <React.Fragment key={`wp-${i}`}>
                  <Circle cx={wp.x} cy={wp.y} r={CELL_W * 0.28} fill={cpReached ? "rgba(100,220,150,0.5)" : "rgba(255,255,255,0.2)"} />
                  <Circle cx={wp.x} cy={wp.y} r={CELL_W * 0.15} fill={cpReached ? "#4ADE80" : "#FFFFFF"} opacity={cpReached ? 1 : 0.5} />
                  <Path
                    d={cpReached
                      ? `M${wp.x - 4},${wp.y} L${wp.x - 1},${wp.y + 4} L${wp.x + 5},${wp.y - 3}`
                      : `M${wp.x - 3},${wp.y - 3} L${wp.x + 3},${wp.y + 3} M${wp.x + 3},${wp.y - 3} L${wp.x - 3},${wp.y + 3}`}
                    stroke={cpReached ? "#FFF" : "#999"}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                  />
                </React.Fragment>
              );
            }
            return (
              <Circle key={`wp-${i}`} cx={wp.x} cy={wp.y} r={3} fill={reached ? "#FFD700" : "transparent"} opacity={reached ? 0.6 : 0} />
            );
          })}

          {/* Start node */}
          <Circle cx={startPx.x} cy={startPx.y} r={CELL_W * 0.35} fill="url(#startGlow)" />
          <Circle cx={startPx.x} cy={startPx.y} r={CELL_W * 0.18} fill="#FFD700" />
          {/* Start arrow */}
          <Path
            d={`M${startPx.x - 5},${startPx.y - 5} L${startPx.x + 5},${startPx.y} L${startPx.x - 5},${startPx.y + 5} Z`}
            fill="#8B5A00"
          />

          {/* End node */}
          <Circle cx={endPx.x} cy={endPx.y} r={CELL_W * 0.35} fill="url(#endGlow)" />
          <Circle cx={endPx.x} cy={endPx.y} r={CELL_W * 0.18} fill="#4ADE80" />
          {/* End arrow */}
          <Path
            d={`M${endPx.x - 5},${endPx.y - 5} L${endPx.x + 5},${endPx.y} L${endPx.x - 5},${endPx.y + 5} Z`}
            fill="#1A6B30"
          />
        </Svg>
      </View>

      {done && <Text style={gStyles.successBurst}>PATH CLEARED!</Text>}
    </View>
  );
}

const mazeStyles = StyleSheet.create({
  area: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#5A1020",
  },
});

/* ====================================================================
 *  Router — picks the right game for the ailment
 * ==================================================================== */
export function MiniGameRouter({
  gameType,
  onComplete,
  onProgress,
  accentColor,
}: MiniGameProps & { gameType: MiniGameType }) {
  switch (gameType) {
    case "BONE_CRACK":
      return <PressureComboGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    case "JOINT_POP":
      return <DragAlignGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    case "MUSCLE_KNOT":
      return <RapidTapGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    case "NERVE_PINCH":
      return <TracePathGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    case "SWELLING":
      return <CircularMassageGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    case "FIND_PATH":
      return <FindPathGame onComplete={onComplete} onProgress={onProgress} accentColor={accentColor} />;
    default:
      return null;
  }
}

/* ====================================================================
 *  Shared styles
 * ==================================================================== */
const gStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  instruction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  /* Timing ring */
  tapArea: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  targetCircle: {
    position: "absolute",
    borderWidth: 3,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  shrinkRing: {
    borderWidth: 4,
    position: "absolute",
  },
  successBurst: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4ADE80",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  /* Drag align */
  alignArea: {
    width: 240,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  targetSlot: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 8,
    marginBottom: 0,
  },
  bonePiece: {
    position: "absolute",
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  /* Rapid tap */
  knotCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  knotEmoji: {
    fontSize: 36,
  },
  /* Trace path */
  traceArea: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    overflow: "hidden",
  },
  /* Circular massage */
  massageArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  massageCircle: {
    borderWidth: 3,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  circleCount: {
    position: "absolute",
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF8EE",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  directionArrow: {
    position: "absolute",
    bottom: 12,
    fontSize: 20,
    color: "rgba(255,255,255,0.6)",
  },
});
