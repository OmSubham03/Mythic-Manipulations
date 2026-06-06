import Ionicons from "react-native-vector-icons/Ionicons";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { Ailment } from "../constants/patients";
import type { PatientType } from "../constants/patients";
import { useCrackSound } from "../hooks/useCrackSound";

const { width: W, height: H } = Dimensions.get("window");

/* ── Full-screen tray with equal small padding ── */
const PAD = 16;
const TRAY_W = W - PAD * 2;
const TRAY_H = H - PAD * 2 - 40; // 40 for header

/* Outline area matches zoomed model aspect ratio (1:1.6), centered in tray */
const MODEL_ASPECT = 1.6;
const OUTLINE_H = TRAY_H * 0.85;
const OUTLINE_W = OUTLINE_H / MODEL_ASPECT;
const OUTLINE_OX = (TRAY_W - OUTLINE_W) / 2;  // horizontal offset to center
const OUTLINE_OY = (TRAY_H - OUTLINE_H) / 2;  // vertical offset to center
const ROPE_REST_LEN = 48;
const PULL_THRESHOLD = 120;
const RING_SIZE = 32;

interface Props {
  ailments: Ailment[];
  currentAilmentIdx: number;
  patientName: string;
  patientType: PatientType;
  bodyColor: string;
  glowColor: string;
}

/* ── Monster body outline paths (fraction of tray, SVG path data) ── */
function getMonsterOutline(type: PatientType): string {
  // All paths are drawn in a 0-1 coordinate space, scaled to TRAY_W × TRAY_H in render
  switch (type) {
    case "GOLEM":
      return "M 0.50 0.06 C 0.38 0.06, 0.30 0.12, 0.30 0.18 C 0.30 0.24, 0.38 0.30, 0.50 0.30 C 0.62 0.30, 0.70 0.24, 0.70 0.18 C 0.70 0.12, 0.62 0.06, 0.50 0.06 Z "
        + "M 0.44 0.30 L 0.44 0.34 L 0.56 0.34 L 0.56 0.30 "
        + "M 0.32 0.34 C 0.28 0.34, 0.22 0.42, 0.22 0.56 C 0.22 0.70, 0.30 0.76, 0.50 0.76 C 0.70 0.76, 0.78 0.70, 0.78 0.56 C 0.78 0.42, 0.72 0.34, 0.68 0.34 Z "
        + "M 0.22 0.44 L 0.12 0.52 L 0.12 0.64 L 0.22 0.60 "
        + "M 0.78 0.44 L 0.88 0.52 L 0.88 0.64 L 0.78 0.60 "
        + "M 0.34 0.76 L 0.34 0.90 L 0.44 0.90 L 0.44 0.76 "
        + "M 0.56 0.76 L 0.56 0.90 L 0.66 0.90 L 0.66 0.76";
    case "HARPY":
      return "M 0.50 0.08 C 0.40 0.08, 0.34 0.14, 0.34 0.20 C 0.34 0.26, 0.40 0.30, 0.50 0.30 C 0.60 0.30, 0.66 0.26, 0.66 0.20 C 0.66 0.14, 0.60 0.08, 0.50 0.08 Z "
        + "M 0.44 0.30 L 0.44 0.34 L 0.56 0.34 L 0.56 0.30 "
        + "M 0.36 0.34 C 0.32 0.38, 0.30 0.50, 0.30 0.60 C 0.30 0.68, 0.38 0.72, 0.50 0.72 C 0.62 0.72, 0.70 0.68, 0.70 0.60 C 0.70 0.50, 0.68 0.38, 0.64 0.34 Z "
        + "M 0.30 0.38 L 0.10 0.30 L 0.06 0.52 L 0.24 0.50 "
        + "M 0.70 0.38 L 0.90 0.30 L 0.94 0.52 L 0.76 0.50 "
        + "M 0.40 0.72 L 0.38 0.88 L 0.44 0.90 "
        + "M 0.60 0.72 L 0.62 0.88 L 0.56 0.90";
    case "EMBER_KITTEN":
      return "M 0.42 0.06 L 0.38 0.16 M 0.58 0.06 L 0.62 0.16 "
        + "M 0.50 0.12 C 0.38 0.12, 0.32 0.18, 0.32 0.24 C 0.32 0.30, 0.38 0.34, 0.50 0.34 C 0.62 0.34, 0.68 0.30, 0.68 0.24 C 0.68 0.18, 0.62 0.12, 0.50 0.12 Z "
        + "M 0.44 0.34 L 0.56 0.34 "
        + "M 0.34 0.36 C 0.28 0.40, 0.26 0.52, 0.26 0.60 C 0.26 0.68, 0.36 0.72, 0.50 0.72 C 0.64 0.72, 0.74 0.68, 0.74 0.60 C 0.74 0.52, 0.72 0.40, 0.66 0.36 Z "
        + "M 0.36 0.72 L 0.34 0.88 M 0.44 0.72 L 0.44 0.90 "
        + "M 0.56 0.72 L 0.56 0.90 M 0.64 0.72 L 0.66 0.88 "
        + "M 0.74 0.58 C 0.80 0.62, 0.84 0.68, 0.82 0.74";
    case "ICE_YETI":
      return "M 0.50 0.06 C 0.34 0.06, 0.26 0.14, 0.26 0.22 C 0.26 0.30, 0.34 0.36, 0.50 0.36 C 0.66 0.36, 0.74 0.30, 0.74 0.22 C 0.74 0.14, 0.66 0.06, 0.50 0.06 Z "
        + "M 0.42 0.36 L 0.58 0.36 "
        + "M 0.28 0.38 C 0.20 0.44, 0.18 0.56, 0.18 0.65 C 0.18 0.74, 0.30 0.78, 0.50 0.78 C 0.70 0.78, 0.82 0.74, 0.82 0.65 C 0.82 0.56, 0.80 0.44, 0.72 0.38 Z "
        + "M 0.18 0.46 L 0.08 0.52 L 0.08 0.66 L 0.18 0.62 "
        + "M 0.82 0.46 L 0.92 0.52 L 0.92 0.66 L 0.82 0.62 "
        + "M 0.34 0.78 L 0.32 0.92 L 0.42 0.92 L 0.42 0.78 "
        + "M 0.58 0.78 L 0.58 0.92 L 0.68 0.92 L 0.68 0.78";
    case "MUSHROOM_SPRITE":
      return "M 0.30 0.20 C 0.30 0.08, 0.70 0.08, 0.70 0.20 C 0.70 0.28, 0.58 0.32, 0.58 0.32 L 0.42 0.32 C 0.42 0.32, 0.30 0.28, 0.30 0.20 Z "
        + "M 0.44 0.32 L 0.56 0.32 "
        + "M 0.38 0.34 C 0.34 0.40, 0.32 0.52, 0.32 0.60 C 0.32 0.68, 0.40 0.72, 0.50 0.72 C 0.60 0.72, 0.68 0.68, 0.68 0.60 C 0.68 0.52, 0.66 0.40, 0.62 0.34 Z "
        + "M 0.40 0.72 L 0.38 0.90 M 0.60 0.72 L 0.62 0.90";
    case "MINI_DRAGON":
      return "M 0.50 0.08 C 0.40 0.08, 0.34 0.14, 0.34 0.20 C 0.34 0.26, 0.40 0.32, 0.50 0.32 C 0.60 0.32, 0.66 0.26, 0.66 0.20 C 0.66 0.14, 0.60 0.08, 0.50 0.08 Z "
        + "M 0.28 0.16 L 0.34 0.20 M 0.72 0.16 L 0.66 0.20 "
        + "M 0.44 0.32 L 0.44 0.36 L 0.56 0.36 L 0.56 0.32 "
        + "M 0.30 0.36 C 0.24 0.42, 0.22 0.54, 0.22 0.62 C 0.22 0.72, 0.34 0.78, 0.50 0.78 C 0.66 0.78, 0.78 0.72, 0.78 0.62 C 0.78 0.54, 0.76 0.42, 0.70 0.36 Z "
        + "M 0.22 0.40 L 0.08 0.34 L 0.04 0.54 L 0.22 0.50 "
        + "M 0.78 0.40 L 0.92 0.34 L 0.96 0.54 L 0.78 0.50 "
        + "M 0.36 0.78 L 0.34 0.90 M 0.64 0.78 L 0.66 0.90 "
        + "M 0.78 0.68 C 0.84 0.72, 0.88 0.78, 0.86 0.86";
    case "CRYSTAL_DEER":
      return "M 0.42 0.04 L 0.38 0.14 L 0.34 0.04 M 0.58 0.04 L 0.62 0.14 L 0.66 0.04 "
        + "M 0.50 0.10 C 0.42 0.10, 0.38 0.16, 0.38 0.22 C 0.38 0.28, 0.42 0.32, 0.50 0.32 C 0.58 0.32, 0.62 0.28, 0.62 0.22 C 0.62 0.16, 0.58 0.10, 0.50 0.10 Z "
        + "M 0.46 0.32 L 0.46 0.40 L 0.54 0.40 L 0.54 0.32 "
        + "M 0.34 0.40 C 0.30 0.46, 0.28 0.54, 0.28 0.62 C 0.28 0.70, 0.38 0.74, 0.50 0.74 C 0.62 0.74, 0.72 0.70, 0.72 0.62 C 0.72 0.54, 0.70 0.46, 0.66 0.40 Z "
        + "M 0.36 0.74 L 0.34 0.92 M 0.44 0.74 L 0.44 0.92 "
        + "M 0.56 0.74 L 0.56 0.92 M 0.64 0.74 L 0.66 0.92";
    case "LAVA_BLOB":
      return "M 0.50 0.10 C 0.34 0.10, 0.22 0.22, 0.22 0.38 C 0.22 0.54, 0.28 0.68, 0.50 0.78 C 0.72 0.68, 0.78 0.54, 0.78 0.38 C 0.78 0.22, 0.66 0.10, 0.50 0.10 Z "
        + "M 0.22 0.34 L 0.10 0.40 L 0.10 0.56 L 0.22 0.50 "
        + "M 0.78 0.34 L 0.90 0.40 L 0.90 0.56 L 0.78 0.50 "
        + "M 0.38 0.78 C 0.36 0.84, 0.38 0.92, 0.42 0.92 "
        + "M 0.62 0.78 C 0.64 0.84, 0.62 0.92, 0.58 0.92";
    case "MOON_BUNNY":
      return "M 0.44 0.04 C 0.44 0.04, 0.42 0.18, 0.44 0.22 M 0.56 0.04 C 0.56 0.04, 0.58 0.18, 0.56 0.22 "
        + "M 0.50 0.18 C 0.40 0.18, 0.34 0.24, 0.34 0.30 C 0.34 0.36, 0.40 0.40, 0.50 0.40 C 0.60 0.40, 0.66 0.36, 0.66 0.30 C 0.66 0.24, 0.60 0.18, 0.50 0.18 Z "
        + "M 0.44 0.40 L 0.56 0.40 "
        + "M 0.34 0.42 C 0.28 0.48, 0.26 0.58, 0.26 0.66 C 0.26 0.74, 0.36 0.78, 0.50 0.78 C 0.64 0.78, 0.74 0.74, 0.74 0.66 C 0.74 0.58, 0.72 0.48, 0.66 0.42 Z "
        + "M 0.36 0.78 L 0.34 0.90 L 0.42 0.92 "
        + "M 0.64 0.78 L 0.66 0.90 L 0.58 0.92 "
        + "M 0.74 0.64 C 0.78 0.66, 0.80 0.70, 0.78 0.74";
    default:
      return "M 0.50 0.08 C 0.38 0.08, 0.30 0.14, 0.30 0.22 C 0.30 0.30, 0.38 0.34, 0.50 0.34 C 0.62 0.34, 0.70 0.30, 0.70 0.22 C 0.70 0.14, 0.62 0.08, 0.50 0.08 Z "
        + "M 0.34 0.36 C 0.28 0.44, 0.26 0.56, 0.26 0.66 C 0.26 0.76, 0.36 0.80, 0.50 0.80 C 0.64 0.80, 0.74 0.76, 0.74 0.66 C 0.74 0.56, 0.72 0.44, 0.66 0.36 Z "
        + "M 0.38 0.80 L 0.36 0.92 M 0.62 0.80 L 0.64 0.92";
  }
}

/** Scale a normalized path (0-1 coords) to actual pixel dimensions */
function scalePath(raw: string, w: number, h: number): string {
  return raw.replace(/(\d+\.\d+)/g, (match, _p1, offset) => {
    // Determine if this is an X or Y coordinate by counting preceding numeric values
    const before = raw.slice(0, offset);
    const nums = before.match(/\d+\.\d+/g);
    const idx = nums ? nums.length : 0;
    const val = parseFloat(match);
    return (idx % 2 === 0 ? val * w : val * h).toFixed(1);
  });
}

/* ── Pain point zones per ailment type (normalized to tray) ── */
function zoneFor(type: string) {
  switch (type) {
    case "TEETH": return { cx: 0.5, cy: 0.20, rx: 0.10, ry: 0.05 };
    case "HEAD":  return { cx: 0.5, cy: 0.18, rx: 0.12, ry: 0.06 };
    case "NECK":  return { cx: 0.5, cy: 0.33, rx: 0.10, ry: 0.04 };
    case "CHEST": return { cx: 0.5, cy: 0.42, rx: 0.14, ry: 0.08 };
    case "BACK":  return { cx: 0.5, cy: 0.52, rx: 0.14, ry: 0.10 };
    case "LEG":   return { cx: 0.45, cy: 0.78, rx: 0.10, ry: 0.06 };
    case "STOMACH": return { cx: 0.5, cy: 0.58, rx: 0.12, ry: 0.08 };
    case "EYE":   return { cx: 0.5, cy: 0.16, rx: 0.08, ry: 0.04 };
    case "HAND":  return { cx: 0.20, cy: 0.50, rx: 0.09, ry: 0.05 };
    default:      return { cx: 0.5, cy: 0.50, rx: 0.10, ry: 0.08 };
  }
}

export default function XrayOverlay({
  ailments,
  currentAilmentIdx,
  patientName,
  patientType,
  bodyColor,
  glowColor,
}: Props) {
  const { playTap } = useCrackSound();
  const [trayOpen, setTrayOpen] = useState(false);
  const [scanned, setScanned] = useState(false);

  const pullY = useRef(new Animated.Value(0)).current;
  const trayY = useRef(new Animated.Value(-(TRAY_H + 80))).current;
  const scanLine = useRef(new Animated.Value(0)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const trayOpenRef = useRef(false);
  const scannedRef = useRef(false);

  /* ── Pull rope gesture ── */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !trayOpenRef.current,
      onMoveShouldSetPanResponder: (_, gs) => !trayOpenRef.current && gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (trayOpenRef.current) return;
        const clamped = Math.max(0, Math.min(gs.dy, PULL_THRESHOLD + 40));
        pullY.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        if (trayOpenRef.current) return;
        if (gs.dy >= PULL_THRESHOLD) {
          openTray();
        } else {
          Animated.spring(pullY, { toValue: 0, tension: 180, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const openTray = useCallback(() => {
    trayOpenRef.current = true;
    setTrayOpen(true);
    Animated.parallel([
      Animated.spring(pullY, { toValue: PULL_THRESHOLD, tension: 120, friction: 12, useNativeDriver: true }),
      Animated.spring(trayY, { toValue: PAD, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeTray = useCallback(() => {
    trayOpenRef.current = false;
    scannedRef.current = false;
    setScanned(false);
    highlightOpacity.setValue(0);
    scanLine.setValue(0);
    Animated.parallel([
      Animated.timing(trayY, { toValue: -(TRAY_H + 80), duration: 400, useNativeDriver: true }),
      Animated.spring(pullY, { toValue: 0, tension: 180, friction: 10, useNativeDriver: true }),
    ]).start(() => setTrayOpen(false));
  }, []);

  const doScan = useCallback(() => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    Animated.sequence([
      Animated.timing(scanLine, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(highlightOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const pulseOp = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  const ropeScaleY = pullY.interpolate({
    inputRange: [0, PULL_THRESHOLD + 40],
    outputRange: [1, (ROPE_REST_LEN + PULL_THRESHOLD + 40) / ROPE_REST_LEN],
    extrapolate: "clamp",
  });
  const ringY = pullY.interpolate({
    inputRange: [0, PULL_THRESHOLD + 40],
    outputRange: [ROPE_REST_LEN, ROPE_REST_LEN + PULL_THRESHOLD + 40],
    extrapolate: "clamp",
  });

  const outlinePath = scalePath(getMonsterOutline(patientType), OUTLINE_W, OUTLINE_H);
  // Offset string for SVG transform to center outline in tray
  const outlineTranslate = `translate(${OUTLINE_OX}, ${OUTLINE_OY})`;

  return (
    <View style={styles.root} pointerEvents="box-none">

      {/* ── Rope + Ring ── */}
      <View style={styles.ropeAnchor} pointerEvents="box-none">
        <Animated.View style={[styles.rope, { transform: [{ scaleY: ropeScaleY }] }]} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.ring, { transform: [{ translateY: ringY }] }]}
        >
          <Ionicons name="scan-outline" size={16} color="#78DCFF" />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.pullLabel, { transform: [{ translateY: ringY }] }]}
        >
          <Text style={styles.pullText}>PULL</Text>
          <Ionicons name="chevron-down" size={10} color="#78DCFF" style={{ marginTop: -2 }} />
        </Animated.View>
      </View>

      {/* ── Fullscreen X-ray Tray ── */}
      <Animated.View
        pointerEvents={trayOpen ? "auto" : "none"}
        style={[styles.trayContainer, { transform: [{ translateY: trayY }] }]}
      >
        {/* Header */}
        <View style={styles.trayHeader}>
          <Text style={styles.trayTitle}>X-RAY — {patientName.toUpperCase()}</Text>
          <TouchableOpacity onPress={() => { playTap(); closeTray(); }} style={styles.trayClose}>
            <Ionicons name="chevron-up" size={18} color="#78DCFF" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.trayBody}>
          <Svg width={TRAY_W} height={TRAY_H}>
            <Defs>
              <LinearGradient id="xbg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="rgba(0,18,35,0.96)" />
                <Stop offset="100%" stopColor="rgba(0,6,16,0.98)" />
              </LinearGradient>
            </Defs>
            {/* Background */}
            <Rect x={0} y={0} width={TRAY_W} height={TRAY_H} rx={16} fill="url(#xbg)" />

            {/* Monster outline (always visible) — centered in tray */}
            <G transform={outlineTranslate}>
              <Path
                d={outlinePath}
                fill="none"
                stroke={glowColor + "55"}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Faint inner fill */}
              <Path
                d={outlinePath}
                fill={bodyColor + "12"}
                stroke="none"
              />
            </G>

            {/* Pain-point markers (only after scan) */}
            {scanned && ailments.map((a, i) => {
              const z = zoneFor(a.type);
              const isCurrent = i === currentAilmentIdx;
              const isDone = i < currentAilmentIdx;
              const fillCol = isDone
                ? "rgba(104,213,133,0.30)"
                : isCurrent ? "rgba(255,80,80,0.45)" : "rgba(255,180,60,0.35)";
              const strokeCol = isDone ? "#68D585" : isCurrent ? "#FF5050" : "#FFB43C";
              return (
                <Ellipse
                  key={a.id}
                  cx={OUTLINE_OX + z.cx * OUTLINE_W}
                  cy={OUTLINE_OY + z.cy * OUTLINE_H}
                  rx={z.rx * OUTLINE_W}
                  ry={z.ry * OUTLINE_H}
                  fill={fillCol}
                  stroke={strokeCol}
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                  strokeDasharray={isDone ? undefined : "8,5"}
                  opacity={1}
                />
              );
            })}
          </Svg>

          {/* Ailment labels (absolute over SVG) */}
          {scanned && ailments.map((a, i) => {
            const z = zoneFor(a.type);
            const isDone = i < currentAilmentIdx;
            const isCurrent = i === currentAilmentIdx;
            return (
              <Animated.View
                key={`l-${a.id}`}
                style={[
                  styles.ailmentTag,
                  {
                    left: OUTLINE_OX + (z.cx + z.rx) * OUTLINE_W + 6,
                    top: OUTLINE_OY + z.cy * OUTLINE_H - 10,
                    opacity: isCurrent ? pulseOp : highlightOpacity.interpolate({
                      inputRange: [0, 1], outputRange: [0, isDone ? 0.5 : 0.8],
                    }),
                  },
                ]}
              >
                <Text
                  style={[styles.tagText, isDone && styles.tagDone, isCurrent && styles.tagActive]}
                  numberOfLines={1}
                >
                  {isDone ? "✓ " : isCurrent ? "▸ " : "• "}{a.label}
                </Text>
              </Animated.View>
            );
          })}

          {/* Scan sweep line */}
          {trayOpen && !scanned && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, TRAY_H],
                    }),
                  }],
                  opacity: scanLine.interpolate({
                    inputRange: [0, 0.05, 0.95, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                },
              ]}
            />
          )}

          {/* SCAN button */}
          {trayOpen && !scanned && (
            <View style={styles.scanBtnWrap}>
              <TouchableOpacity onPress={() => { playTap(); doScan(); }} style={styles.scanBtn} activeOpacity={0.75}>
                <Ionicons name="scan-outline" size={22} color="#00EEFF" />
                <Text style={styles.scanBtnText}>SCAN</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom glow */}
        <View style={styles.trayGlow} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: "center",
  },

  /* Rope & ring */
  ropeAnchor: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    alignItems: "center",
    zIndex: 60,
  },
  rope: {
    width: 3,
    height: ROPE_REST_LEN,
    backgroundColor: "#8B7355",
    borderRadius: 1.5,
    transformOrigin: "top",
  },
  ring: {
    position: "absolute",
    top: 0,
    width: RING_SIZE + 6,
    height: RING_SIZE + 6,
    borderRadius: (RING_SIZE + 6) / 2,
    borderWidth: 3,
    borderColor: "#78DCFF",
    backgroundColor: "rgba(0,30,60,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#78DCFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  ringInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9A86C",
  },
  pullLabel: {
    position: "absolute",
    top: RING_SIZE + 10,
    alignItems: "center",
  },
  pullText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#78DCFF",
    letterSpacing: 1.5,
    textShadowColor: "rgba(120,220,255,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  /* Tray — full screen */
  trayContainer: {
    position: "absolute",
    top: 0,
    left: PAD,
    width: TRAY_W,
  },
  trayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,40,70,0.94)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  trayTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(120,220,255,0.9)",
    letterSpacing: 2,
  },
  trayClose: { padding: 4 },
  trayBody: {
    position: "relative",
    overflow: "hidden",
  },
  trayGlow: {
    height: 4,
    backgroundColor: "rgba(0,180,255,0.3)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  /* Scan */
  scanLine: {
    position: "absolute",
    left: 0, right: 0,
    height: 3,
    backgroundColor: "rgba(0,230,255,0.7)",
    shadowColor: "#00E6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 4,
  },
  scanBtnWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,30,50,0.85)",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(0,230,255,0.5)",
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#00EEFF",
    letterSpacing: 2,
  },

  /* Labels */
  ailmentTag: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 150,
  },
  tagText: { fontSize: 11, fontWeight: "700", color: "#FFB43C" },
  tagDone: { color: "#68D585", textDecorationLine: "line-through" },
  tagActive: { color: "#FF6B6B" },
});
