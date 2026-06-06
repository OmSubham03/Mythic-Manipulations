import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Svg, { Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";
import CrackEffect from "../components/CrackEffect";
import PatienceBar from "../components/PatienceBar";
import PatientSVGModel from "../components/PatientSVGModel";
import ResultPopup from "../components/ResultPopup";
import TutorialOverlay, { TutorialStep } from "../components/TutorialOverlay";
import { MiniGameRouter } from "../components/MiniGames";
// import XrayOverlay from "../components/XrayOverlay";
import { useGame } from "../context/GameContext";
import { useCrackSound } from "../hooks/useCrackSound";
import PATIENTS, { AilmentType, PatientConfig } from "../constants/patients";
import type { MiniGameType } from "../constants/patients";
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: W, height: H } = Dimensions.get("window");

/* ── Bed-view layout constants ── */
// The patient model size when lying on the bed (small)
const BED_MODEL_W = 140;
const BED_MODEL_H = BED_MODEL_W * 1.6; // 224

// Where the bed center is on screen (fraction of W/H) — based on clinic_bg.png
const BED_CENTER_X = W * 0.48;
const BED_CENTER_Y = H * 0.65;

// Zoomed-in model size
const ZOOM_MODEL_W = Math.min(W - 40, 320);
const ZOOM_MODEL_H = ZOOM_MODEL_W * 1.6;

// Scale factor between bed view and zoomed view
const BED_SCALE = BED_MODEL_W / ZOOM_MODEL_W; // ~0.44

type Phase = "ENTERING" | "SELECTING" | "ZOOMING_IN" | "TREATING" | "ZOOMING_OUT" | "SUCCESS" | "FAILED";

interface CrackState { visible: boolean; label: string; x: number; y: number }



function triggerHaptic(type: "impact" | "notification" = "impact") {
  try {
    if (type === "notification") {
      ReactNativeHapticFeedback.trigger("notificationWarning", { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
    } else {
      ReactNativeHapticFeedback.trigger("impactMedium", { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
    }
  } catch {
    Vibration.vibrate(50);
  }
}

function triggerSuccessHaptic() {
  try {
    ReactNativeHapticFeedback.trigger("notificationSuccess", { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
  } catch {
    Vibration.vibrate(50);
  }
}

export default function TreatmentScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Treatment">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { patientType, tutorial: isTutorial, patientData } = route.params as { patientType: string; tutorial?: boolean; patientData?: string };
  const insets = useSafeAreaInsets();
  const { addCoins, loseReputation, addReputation, recordTreatment, recordCrack, hasUpgrade, completeTutorial } = useGame();
  const { playCrack, playPop, playTap } = useCrackSound();

  // Use passed patient data (with dynamic level/ailments) or fall back to static lookup
  const patient: PatientConfig | undefined = (() => {
    if (patientData) {
      try {
        const parsed = JSON.parse(patientData);
        const base = PATIENTS.find((p) => p.type === patientType);
        return { ...parsed, image: base?.image } as PatientConfig;
      } catch { /* fall through */ }
    }
    const base = PATIENTS.find((p) => p.type === patientType);
    return base ? { ...base, level: base.level ?? 1 } : undefined;
  })();

  const [phase, setPhase] = useState<Phase>("ENTERING");
  const [ailmentIdx, setAilmentIdx] = useState(0);
  const [patience, setPatience] = useState(100);
  const [combo, setCombo] = useState(1);
  const [progress, setProgress] = useState(0);
  const [crack, setCrack] = useState<CrackState>({ visible: false, label: "", x: 0, y: 0 });

  // Result popup state
  const [resultPopup, setResultPopup] = useState<{ visible: boolean; success: boolean; message: string; coins: number; rep: number }>({ visible: false, success: true, message: "", coins: 0, rep: 0 });
  const totalCoinsRef = useRef(0);

  // Tutorial state
  const [tutStep, setTutStep] = useState<TutorialStep>("HIDDEN");

  const phaseRef = useRef<Phase>("ENTERING");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Animation values ── */
  const modelEnter = useRef(new Animated.Value(0)).current;   // 0→1 on enter
  const exitAnim = useRef(new Animated.Value(1)).current;     // 1→0 on success
  const shakeAnim = useRef(new Animated.Value(0)).current;    // shake on fail

  // Zoom: 0 = bed view (small, rotated), 1 = zoomed-in (full size, upright)
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Glow pulse for ailment indicators in SELECTING
  const glowPulse = useRef(new Animated.Value(0)).current;

  // Angry escape animation (failed)
  const angryGlow = useRef(new Animated.Value(0)).current;   // 0→1 red glow
  const escapeX = useRef(new Animated.Value(0)).current;     // 0 → ±W (slide off)

  // Success golden glow + happy bounce
  const successGlow = useRef(new Animated.Value(0)).current;  // 0→1 golden radial glow
  const happyScale = useRef(new Animated.Value(1)).current;   // pulse 1→1.08→1

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const patienceDuration = patient
    ? patient.patienceDuration
      + (hasUpgrade("incense") ? 10 : 0)
      + (patient.type === "EMBER_KITTEN" && hasUpgrade("plush_table") ? 15 : 0)
    : 30;

  /* ── ENTERING → SELECTING ── */
  useEffect(() => {
    Animated.spring(modelEnter, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start(() => {
      setPhase("SELECTING");
    });
  }, []);

  /* ── Tutorial phase sync ── */
  useEffect(() => {
    if (!isTutorial) return;
    // Only show TREAT_SELECT / TREAT_SOLVE for the first ailment
    if (ailmentIdx > 0) {
      // Hide tutorial overlay so player can complete remaining ailments freely
      if (tutStep === "TREAT_SELECT" || tutStep === "TREAT_SOLVE") {
        setTutStep("HIDDEN");
      }
      return;
    }
    if (phase === "SELECTING" && tutStep !== "COMPLETE") {
      const t = setTimeout(() => setTutStep("TREAT_SELECT"), 500);
      return () => clearTimeout(t);
    }
    if (phase === "TREATING" && tutStep === "TREAT_SELECT") {
      setTutStep("TREAT_SOLVE");
    }
  }, [phase, isTutorial, ailmentIdx, tutStep]);

  /* ── Glow pulse for ailment indicators ── */
  useEffect(() => {
    if (phase === "SELECTING") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [phase]);

  /* ── Patience timer (only during TREATING, disabled in tutorial) ── */
  useEffect(() => {
    if (phase !== "TREATING" || isTutorial) return;
    const tick = (patienceDuration * 1000) / 100;
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== "TREATING") return;
      setPatience((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleFailed(); return 0; }
        return prev - 1;
      });
    }, tick);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, ailmentIdx]);

  /* ── Tap ailment → zoom in ── */
  const handleSelectAilment = useCallback((idx: number) => {
    if (phaseRef.current !== "SELECTING") return;
    setAilmentIdx(idx);
    phaseRef.current = "ZOOMING_IN";
    setPhase("ZOOMING_IN");

    Animated.spring(zoomAnim, {
      toValue: 1,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start(() => {
      phaseRef.current = "TREATING";
      setPhase("TREATING");
    });
  }, []);

  /* ── Zoom back out ── */
  const zoomOut = useCallback((onDone?: () => void) => {
    phaseRef.current = "ZOOMING_OUT";
    setPhase("ZOOMING_OUT");

    Animated.spring(zoomAnim, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start(() => {
      onDone?.();
    });
  }, []);

  const handleFailed = useCallback(() => {
    if (phaseRef.current === "FAILED" || phaseRef.current === "SUCCESS") return;
    phaseRef.current = "FAILED";
    setPhase("FAILED");
    loseReputation(60);
    recordTreatment(false);
    triggerHaptic("notification");

    // Pick a random escape direction
    const escapeDir = Math.random() > 0.5 ? 1 : -1;

    // Step 1: Zoom out to bed if currently zoomed, then stand up
    const standUp = () => {
      // Stand up: zoom to 1 (upright, full size at center)
      Animated.spring(zoomAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        // Step 2: Angry red glow + shake for 3 seconds
        const angryPulse = Animated.loop(
          Animated.sequence([
            Animated.timing(angryGlow, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(angryGlow, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        );
        const angryShake = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
          ])
        );
        angryPulse.start();
        angryShake.start();

        // Step 3: After 3 seconds, escape off screen
        setTimeout(() => {
          angryPulse.stop();
          angryShake.stop();
          shakeAnim.setValue(0);
          angryGlow.setValue(0);

          Animated.timing(escapeX, {
            toValue: escapeDir * (W + 100),
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            setResultPopup({ visible: true, success: false, message: `${patient!.name} left unhappy!`, coins: totalCoinsRef.current, rep: -60 });
          });
        }, 3000);
      });
    };

    // If currently zoomed in, zoom out first
    if (zoomAnim._value > 0.5) {
      Animated.timing(zoomAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => standUp());
    } else {
      standUp();
    }
  }, []);

  const handleAilmentComplete = useCallback(() => {
    if (!patient || (phaseRef.current !== "TREATING")) return;
    if (timerRef.current) clearInterval(timerRef.current);

    recordCrack();
    triggerHaptic("impact");

    const ailment = patient.ailments[ailmentIdx];
    if (ailment.type === "EYE" || ailment.type === "TEETH") playPop();
    else playCrack();

    const earned = Math.round(
      (patient.baseReward / patient.ailments.length) *
        patient.rewardMultiplier *
        combo *
        (hasUpgrade("squeaky_toys") ? 1.2 : 1)
    );
    addCoins(earned);
    totalCoinsRef.current += earned;
    setCombo((c) => c + 1);
    setProgress(0);
    progressAnim.setValue(0);

    setCrack({ visible: true, label: ailment.crunchLabel, x: W / 2, y: H * 0.38 });

    const nextIdx = ailmentIdx + 1;
    if (nextIdx >= patient.ailments.length) {
      // All done — zoom out then show success
      setTimeout(() => {
        zoomOut(() => handleAllDone());
      }, 600);
    } else {
      // Zoom out, then go back to SELECTING for next ailment
      setTimeout(() => {
        zoomOut(() => {
          setAilmentIdx(nextIdx);
          setPatience((p) => Math.min(100, p + 18));
          phaseRef.current = "SELECTING";
          setPhase("SELECTING");
        });
      }, 600);
    }
  }, [patient, ailmentIdx, combo, hasUpgrade, addCoins, recordCrack, playCrack, playPop, zoomOut]);

  const handleAllDone = useCallback(() => {
    phaseRef.current = "SUCCESS";
    setPhase("SUCCESS");
    addReputation(50);
    recordTreatment(true, patient!.type, patient!.ailments.map(a => a.label));
    triggerSuccessHaptic();

    // Stand up: spring zoomAnim to 1 (upright, full size at center)
    Animated.spring(zoomAnim, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      // Golden glow fade in
      Animated.timing(successGlow, { toValue: 1, duration: 500, useNativeDriver: true }).start();

      // Happy bounce pulse (3 bounces)
      Animated.loop(
        Animated.sequence([
          Animated.timing(happyScale, { toValue: 1.08, duration: 200, useNativeDriver: true }),
          Animated.timing(happyScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ).start();

      Animated.timing(exitAnim, { toValue: 0, duration: 800, delay: 1400, useNativeDriver: true }).start();
      if (isTutorial) {
        // Show tutorial completion nurse dialogue instead of auto-navigating
        setTimeout(() => setTutStep("COMPLETE"), 1800);
      } else {
        setTimeout(() => {
          setResultPopup({ visible: true, success: true, message: `${patient!.name} is all healed!`, coins: totalCoinsRef.current, rep: 50 });
        }, 2000);
      }
    });
  }, [addReputation, recordTreatment, isTutorial]);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
    Animated.timing(progressAnim, { toValue: p, duration: 80, useNativeDriver: false }).start();
  }, []);

  if (!patient) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Patient not found</Text>
        <TouchableOpacity onPress={() => { playTap(); navigation.reset({ index: 0, routes: [{ name: "Lobby" }] }); }} style={styles.errorBtn}>
          <Text style={{ color: "#fff", fontWeight: "700" as const }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ailment = patient.ailments[ailmentIdx];
  // Disable PatientSVGModel gestures — mini-games handle interaction now
  const activeAilmentType: AilmentType | null = null;

  const progressBarColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#FFD166", "#FF9900", "#68D585"],
  });

  /* ── Interpolated transforms for zoom ── */
  // Scale: BED_SCALE (small on bed) → 1 (full size)
  const modelScale = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BED_SCALE, 1],
  });

  // Rotation: -90deg (lying on bed, 90° clockwise) → 0deg (upright for interaction)
  const modelRotation = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["55deg", "0deg"],
  });

  // Position: bed center → screen center
  const modelCenterX = W / 2;
  const modelCenterY = H * 0.48; // center for zoomed view

  const modelTranslateX = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BED_CENTER_X - modelCenterX, 0],
  });
  const modelTranslateY = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BED_CENTER_Y - modelCenterY, 0],
  });

  // Background overlay darkens when zoomed
  const overlayOpacity = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.78],
  });

  const isSelectingOrEntering = phase === "SELECTING" || phase === "ENTERING";
  const isZoomed = phase === "TREATING" || phase === "ZOOMING_IN";

  return (
    <ImageBackground
      source={require("../assets/images/clinic_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Semi-transparent overlay — gets darker when zoomed */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity, paddingTop: insets.top, paddingBottom: insets.bottom }]} pointerEvents="none" />

      {/* HUD (always on top) */}
      <View style={[styles.hud, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => { playTap(); if (timerRef.current) clearInterval(timerRef.current); navigation.reset({ index: 0, routes: [{ name: "Lobby" }] }); }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color="#3D2C1E" />
          </TouchableOpacity>

          <View style={styles.patienceWrap}>
            <PatienceBar value={patience} maxValue={100} />
          </View>

          <View style={[styles.comboBadge, { borderColor: patient.glowColor }]}>
            <Text style={styles.comboText}>x{combo}</Text>
          </View>
        </View>

        {/* Patient name + kingdom */}
        <View style={styles.metaRow}>
          <View style={[styles.kingdomPill, { backgroundColor: patient.bodyColor + "28", borderColor: patient.bodyColor }]}>
            <Text style={[styles.kingdomText, { color: patient.bodyColor }]}>{patient.kingdom}</Text>
          </View>
          <Text style={styles.patientName}>{patient.name} <Text style={{ fontSize: 12, fontWeight: "600", color: patient.glowColor }}>Lv.{patient.level}</Text></Text>
        </View>

        {/* Status banner */}
        {phase === "SELECTING" && (
          <View style={styles.statusBanner}>
            <Text style={styles.ailmentLabel}>Tap a glowing area to treat</Text>
          </View>
        )}

        {phase === "SUCCESS" && (
          <View style={[styles.statusBanner, { backgroundColor: "rgba(104,213,133,0.92)" }]}>
            <Text style={styles.successText}>All healed!</Text>
          </View>
        )}
        {phase === "FAILED" && (
          <View style={[styles.statusBanner, { backgroundColor: "rgba(255,82,82,0.88)" }]}>
            <Text style={styles.successText}>{patient.name} left unhappy...</Text>
          </View>
        )}
      </View>

      {/* Golden radial glow — behind model, visible on SUCCESS */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.modelContainer,
          {
            opacity: Animated.multiply(successGlow, exitAnim),
            transform: [
              { translateX: modelTranslateX },
              { translateY: modelTranslateY },
              { scale: modelScale },
              { rotate: modelRotation },
            ],
            zIndex: 4,
          },
        ]}
      >
        <View style={{ position: "absolute", top: -ZOOM_MODEL_H * 0.3, left: -ZOOM_MODEL_W * 0.3, width: ZOOM_MODEL_W * 1.6, height: ZOOM_MODEL_H * 1.6 }}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="goldenGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.7" />
                <Stop offset="40%" stopColor="#FFC200" stopOpacity="0.4" />
                <Stop offset="70%" stopColor="#FFB300" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#FFA000" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#goldenGlow)" />
          </Svg>
        </View>
      </Animated.View>

      {/* Angry radial glow — behind model, visible on FAILED */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.modelContainer,
          {
            opacity: angryGlow,
            transform: [
              { translateX: modelTranslateX },
              { translateY: modelTranslateY },
              { scale: modelScale },
              { rotate: modelRotation },
            ],
            zIndex: 4,
          },
        ]}
      >
        <View style={{ position: "absolute", top: -ZOOM_MODEL_H * 0.3, left: -ZOOM_MODEL_W * 0.3, width: ZOOM_MODEL_W * 1.6, height: ZOOM_MODEL_H * 1.6 }}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="angryGlowGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FF1E1E" stopOpacity="0.7" />
                <Stop offset="40%" stopColor="#FF3030" stopOpacity="0.4" />
                <Stop offset="70%" stopColor="#FF4040" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#FF5050" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#angryGlowGrad)" />
          </Svg>
        </View>
      </Animated.View>

      {/* Patient model — positioned on bed, zooms in on interaction */}
      <Animated.View
        style={[
          styles.modelContainer,
          {
            opacity: Animated.multiply(modelEnter, exitAnim),
            transform: [
              { translateX: modelTranslateX },
              { translateY: modelTranslateY },
              { scale: Animated.multiply(modelScale, happyScale) },
              { rotate: modelRotation },
              { translateX: Animated.add(shakeAnim, escapeX) },
            ],
          },
        ]}
        pointerEvents={phase === "TREATING" ? "auto" : "none"}
      >
        <PatientSVGModel
          patientType={patient.type}
          bodyColor={patient.bodyColor}
          glowColor={patient.glowColor}
          accentColor={patient.accentColor}
          activeAilmentType={activeAilmentType}
          onAilmentComplete={handleAilmentComplete}
          onProgressChange={handleProgress}
          width={ZOOM_MODEL_W}
          height={ZOOM_MODEL_H}
          tapCount={ailment?.tapCount ?? 5}
          mood={phase === "SUCCESS" ? "happy" : phase === "FAILED" ? "angry" : "pain"}
        />
      </Animated.View>

      {/* Ailment zone indicators — visible in SELECTING phase on the bed */}
      {phase === "SELECTING" && patient.ailments.map((a, i) => {
        const healed = i < ailmentIdx;
        // Map bodyZone (fraction of model) to screen position on the bed
        // bodyZone coords are for upright model → we need to rotate them for lying-down
        // When rotated -90°, x stays, y maps to horizontal offset
        const bz = a.bodyZone;
        const dotSize = 42;
        // Lying-down mapping: model is rotated -90°, so model-Y becomes screen-X offset
        // and model-X becomes screen-Y offset (inverted)
        const offsetX = (bz.y - 0.5) * BED_MODEL_H; // along the bed length
        const offsetY = (bz.x - 0.5) * BED_MODEL_W; // across the bed width
        const screenX = BED_CENTER_X + offsetX - dotSize / 2;
        const screenY = BED_CENTER_Y - offsetY - dotSize / 2;
        const isNext = i === ailmentIdx;
        const isFuture = i > ailmentIdx;

        return (
          <TouchableOpacity
            key={a.id}
            activeOpacity={isNext ? 0.7 : 1}
            onPress={() => isNext && handleSelectAilment(i)}
            disabled={!isNext}
            style={[
              styles.ailmentIndicator,
              {
                left: screenX,
                top: screenY,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                borderColor: healed ? "#888" : isNext ? patient.glowColor : "rgba(255,209,102,0.35)",
                opacity: healed ? 0.4 : isFuture ? 0.3 : 1,
              },
            ]}
          >
            {isNext && (
              <Animated.View
                style={[
                  styles.ailmentGlow,
                  {
                    backgroundColor: patient.glowColor,
                    opacity: glowPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                    borderRadius: dotSize / 2,
                  },
                ]}
              />
            )}
            <View style={styles.ailmentIcon}>
              <Ionicons
                name={healed ? "checkmark" :
                  a.type === "TEETH" ? "nutrition" :
                  a.type === "HEAD" ? "skull" :
                  a.type === "NECK" ? "body" :
                  a.type === "CHEST" ? "heart" :
                  a.type === "BACK" ? "fitness" :
                  a.type === "LEG" ? "walk" :
                  a.type === "STOMACH" ? "ellipse" :
                  a.type === "EYE" ? "eye" :
                  "medkit"}
                size={16}
                color={healed ? "#888" : isNext ? "#FFF" : "rgba(255,255,255,0.35)"}
              />
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Ailment dots indicator at bottom */}
      {(phase === "SELECTING" || phase === "TREATING" || phase === "ZOOMING_IN" || phase === "ZOOMING_OUT") && (
        <View style={[styles.dotsBar, { bottom: insets.bottom + 16 }]}>
          {patient.ailments.map((a, i) => (
            <View
              key={a.id}
              style={[
                styles.dot,
                i < ailmentIdx ? styles.dotDone : i === ailmentIdx ? styles.dotActive : styles.dotPending,
              ]}
            />
          ))}
        </View>
      )}

      {/* Progress bar — only while treating */}
      {phase === "TREATING" && (
        <View style={[styles.progressContainer, { bottom: insets.bottom + 40 }]}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as `${number}%`, backgroundColor: progressBarColor },
              ]}
            />
          </View>
        </View>
      )}

      {/* X-ray overlay — pull rope to reveal */}
      {/* <XrayOverlay
        ailments={patient.ailments}
        currentAilmentIdx={ailmentIdx}
        patientName={patient.name}
        patientType={patient.type}
        bodyColor={patient.bodyColor}
        glowColor={patient.glowColor}
      /> */}

      {/* Mini-game overlay — shown during TREATING phase */}
      {phase === "TREATING" && ailment?.miniGame && (
        <View style={styles.miniGameOverlay}>
          <MiniGameRouter
            gameType={ailment.miniGame as MiniGameType}
            onComplete={handleAilmentComplete}
            onProgress={handleProgress}
            accentColor={patient.glowColor}
          />
        </View>
      )}

      {/* Crack effect overlay */}
      <CrackEffect
        visible={crack.visible}
        label={crack.label}
        x={crack.x}
        y={crack.y}
        onDone={() => setCrack((c) => ({ ...c, visible: false }))}
      />

      {/* Tutorial overlay */}
      {isTutorial && (
        <TutorialOverlay
          step={tutStep}
          onStepDone={(s) => {
            if (s === "TREAT_SELECT") {
              setTutStep("HIDDEN");
            } else if (s === "TREAT_SOLVE") {
              setTutStep("HIDDEN");
            } else if (s === "COMPLETE") {
              completeTutorial();
              setTutStep("HIDDEN");
              navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
            }
          }}
          spotlightRect={
            tutStep === "TREAT_SELECT" && patient.ailments[ailmentIdx]
              ? (() => {
                  const bz = patient.ailments[ailmentIdx].bodyZone;
                  const dotSize = 42;
                  const offsetX = (bz.y - 0.5) * BED_MODEL_H;
                  const offsetY = (bz.x - 0.5) * BED_MODEL_W;
                  const sx = BED_CENTER_X + offsetX - dotSize / 2;
                  const sy = BED_CENTER_Y - offsetY - dotSize / 2;
                  return { x: sx, y: sy, w: dotSize, h: dotSize };
                })()
              : tutStep === "TREAT_SOLVE"
                ? {
                    x: 0,
                    y: H * 0.13,
                    w: W,
                    h: H - H * 0.13 - H * 0.12,
                  }
                : null
          }
          gestureHint={undefined}
          onSkip={() => {
            setTutStep("HIDDEN");
            navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
          }}
        />
      )}

      {/* Result popup — shown after success or failure */}
      <ResultPopup
        visible={resultPopup.visible}
        success={resultPopup.success}
        message={resultPopup.message}
        coinsEarned={resultPopup.coins}
        reputationChange={resultPopup.rep}
        onDismiss={() => {
          setResultPopup((p) => ({ ...p, visible: false }));
          navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
        }}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF8EE" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,248,238,1)",
  },
  hud: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  errorBox: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF8EE", gap: 16,
  },
  errorText: { fontSize: 18, color: "#3D2C1E" },
  errorBtn: {
    backgroundColor: "#FF7A5C", paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 12,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,248,238,0.9)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#E8D8C4",
  },
  patienceWrap: { flex: 1 },
  comboBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, borderWidth: 2,
    backgroundColor: "rgba(255,215,0,0.15)",
  },
  comboText: {
    fontSize: 14, fontWeight: "700" as const,
    color: "#B8960C",
  },
  metaRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingHorizontal: 14, marginBottom: 4,
  },
  kingdomPill: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1.5,
  },
  kingdomText: { fontSize: 11, fontWeight: "700" as const },
  patientName: {
    fontSize: 20, fontWeight: "700" as const,
    color: "#3D2C1E",
  },
  statusBanner: {
    backgroundColor: "rgba(61,44,30,0.86)",
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8,
    alignItems: "center", marginBottom: 6,
    alignSelf: "center", width: "90%",
  },
  ailmentLabel: {
    fontSize: 13, fontWeight: "700" as const,
    color: "#FFD166",
  },
  successText: {
    fontSize: 16, fontWeight: "700" as const,
    color: "#FFF",
  },

  /* Model container — centered at screen center, transforms move it to bed or keep it centered */
  modelContainer: {
    position: "absolute",
    left: (W - ZOOM_MODEL_W) / 2,
    top: H * 0.48 - ZOOM_MODEL_H / 2,
    width: ZOOM_MODEL_W,
    height: ZOOM_MODEL_H,
    zIndex: 5,
  },

  /* Ailment zone indicators on bed */
  ailmentIndicator: {
    position: "absolute",
    zIndex: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderStyle: "dashed",
  },
  ailmentGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  ailmentIcon: {
    zIndex: 1,
  },

  /* Bottom dots */
  dotsBar: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2,
  },
  dotPending: { backgroundColor: "#E8D8C4", borderColor: "#C9B8A8" },
  dotDone: { backgroundColor: "#68D585", borderColor: "#50BA6A" },
  dotActive: { backgroundColor: "#FFD166", borderColor: "#FFB800" },

  /* Progress bar */
  progressContainer: {
    position: "absolute",
    left: "6%", right: "6%",
    zIndex: 10,
  },
  progressTrack: {
    width: "100%", height: 14,
    backgroundColor: "#E8D8C4", borderRadius: 7, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 7 },

  /* Angry glow overlay on model */

  /* Mini-game overlay */
  miniGameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: H * 0.13,
    bottom: H * 0.12,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
});
