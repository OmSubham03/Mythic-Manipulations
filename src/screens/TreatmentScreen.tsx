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

import CrackEffect from "../components/CrackEffect";
import PatienceBar from "../components/PatienceBar";
import PatientSVGModel from "../components/PatientSVGModel";
import { useGame } from "../context/GameContext";
import { useCrackSound } from "../hooks/useCrackSound";
import PATIENTS, { AilmentType, PatientConfig } from "../constants/patients";
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: W, height: H } = Dimensions.get("window");
const MODEL_W = Math.min(W - 40, 320);
const MODEL_H = MODEL_W * 1.6;

type Phase = "ENTERING" | "TREATING" | "SUCCESS" | "FAILED";

interface CrackState { visible: boolean; label: string; x: number; y: number }

const GESTURE_LABELS: Record<string, string> = {
  DRAG_UP: "Drag ↑",
  DRAG_DOWN: "Drag ↓",
  DRAG_HORIZONTAL: "Drag ↔",
  TAP_RAPID: "Tap fast!",
};

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
  const { patientType } = route.params;
  const insets = useSafeAreaInsets();
  const { addCoins, loseReputation, addReputation, recordTreatment, recordCrack, hasUpgrade } = useGame();
  const { playCrack, playPop } = useCrackSound();

  const patient: PatientConfig | undefined = PATIENTS.find((p) => p.type === patientType);

  const [phase, setPhase] = useState<Phase>("ENTERING");
  const [ailmentIdx, setAilmentIdx] = useState(0);
  const [patience, setPatience] = useState(100);
  const [combo, setCombo] = useState(1);
  const [progress, setProgress] = useState(0);
  const [crack, setCrack] = useState<CrackState>({ visible: false, label: "", x: 0, y: 0 });

  const phaseRef = useRef<Phase>("ENTERING");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modelEnter = useRef(new Animated.Value(0)).current;
  const modelScale = useRef(new Animated.Value(0.7)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const patienceDuration = patient
    ? patient.patienceDuration
      + (hasUpgrade("incense") ? 10 : 0)
      + (patient.type === "EMBER_KITTEN" && hasUpgrade("plush_table") ? 15 : 0)
    : 30;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(modelEnter, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.spring(modelScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
    ]).start(() => setPhase("TREATING"));
  }, []);

  useEffect(() => {
    if (phase !== "TREATING") return;
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

  const handleFailed = useCallback(() => {
    if (phaseRef.current !== "TREATING") return;
    phaseRef.current = "FAILED";
    setPhase("FAILED");
    loseReputation(15);
    recordTreatment(false);
    triggerHaptic("notification");
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "Lobby" }] }), 2000);
  }, []);

  const handleAilmentComplete = useCallback(() => {
    if (!patient || phaseRef.current !== "TREATING") return;
    if (timerRef.current) clearInterval(timerRef.current);

    recordCrack();
    triggerHaptic("impact");

    const ailment = patient.ailments[ailmentIdx];
    // Play sound
    if (ailment.type === "HAND") playPop();
    else playCrack();

    const earned = Math.round(
      (patient.baseReward / patient.ailments.length) *
        patient.rewardMultiplier *
        combo *
        (hasUpgrade("squeaky_toys") ? 1.2 : 1)
    );
    addCoins(earned);
    setCombo((c) => c + 1);
    setProgress(0);
    progressAnim.setValue(0);

    setCrack({ visible: true, label: ailment.crunchLabel, x: W / 2, y: H * 0.38 });

    const nextIdx = ailmentIdx + 1;
    if (nextIdx >= patient.ailments.length) {
      setTimeout(handleAllDone, 700);
    } else {
      setTimeout(() => {
        setAilmentIdx(nextIdx);
        setPatience((p) => Math.min(100, p + 18));
        phaseRef.current = "TREATING";
        setPhase("TREATING");
      }, 750);
    }
  }, [patient, ailmentIdx, combo, hasUpgrade, addCoins, recordCrack, playCrack, playPop]);

  const handleAllDone = useCallback(() => {
    phaseRef.current = "SUCCESS";
    setPhase("SUCCESS");
    addReputation(12);
    recordTreatment(true);
    triggerSuccessHaptic();
    Animated.sequence([
      Animated.spring(modelScale, { toValue: 1.15, tension: 200, friction: 4, useNativeDriver: true }),
      Animated.timing(exitAnim, { toValue: 0, duration: 600, delay: 600, useNativeDriver: true }),
    ]).start();
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "Lobby" }] }), 2000);
  }, [addReputation, recordTreatment]);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
    Animated.timing(progressAnim, { toValue: p, duration: 80, useNativeDriver: false }).start();
  }, []);

  if (!patient) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Patient not found</Text>
        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: "Lobby" }] })} style={styles.errorBtn}>
          <Text style={{ color: "#fff", fontWeight: "700" as const }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ailment = patient.ailments[ailmentIdx];
  const activeAilmentType: AilmentType | null =
    phase === "TREATING" ? ailment.type : null;

  const progressBarColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#FFD166", "#FF9900", "#68D585"],
  });

  return (
    <ImageBackground
      source={require("../assets/images/clinic_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => { if (timerRef.current) clearInterval(timerRef.current); navigation.reset({ index: 0, routes: [{ name: "Lobby" }] }); }}
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
          <Text style={styles.patientName}>{patient.name}</Text>
        </View>

        {/* Status banner */}
        {phase === "TREATING" && (
          <View style={styles.statusBanner}>
            <Text style={styles.ailmentLabel}>{ailment.label}</Text>
            <Text style={styles.gestureHint}>{GESTURE_LABELS[ailment.gesture]}</Text>
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

        {/* Patient model */}
        <Animated.View
          style={[
            styles.modelContainer,
            {
              opacity: exitAnim,
              transform: [
                { translateY: modelEnter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                { scale: modelScale },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <PatientSVGModel
            patientType={patient.type}
            bodyColor={patient.bodyColor}
            glowColor={patient.glowColor}
            accentColor={patient.accentColor}
            activeAilmentType={activeAilmentType}
            onAilmentComplete={handleAilmentComplete}
            onProgressChange={handleProgress}
            width={MODEL_W}
            height={MODEL_H}
            tapCount={ailment?.tapCount ?? 5}
          />
        </Animated.View>

        {/* Progress bar */}
        {phase === "TREATING" && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` as `${number}%`, backgroundColor: progressBarColor },
                ]}
              />
            </View>
            <View style={styles.ailmentDots}>
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
          </View>
        )}
      </View>

      {/* Crack effect overlay */}
      <CrackEffect
        visible={crack.visible}
        label={crack.label}
        x={crack.x}
        y={crack.y}
        onDone={() => setCrack((c) => ({ ...c, visible: false }))}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF8EE" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255,248,238,0.78)",
    alignItems: "center",
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
    gap: 8, alignSelf: "flex-start", paddingHorizontal: 14, marginBottom: 4,
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
    alignItems: "center", marginBottom: 6, width: "90%",
  },
  ailmentLabel: {
    fontSize: 13, fontWeight: "700" as const,
    color: "#FFD166",
  },
  gestureHint: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  successText: {
    fontSize: 16, fontWeight: "700" as const,
    color: "#FFF",
  },
  modelContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    width: "88%",
    paddingBottom: 16,
    gap: 10,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%", height: 14,
    backgroundColor: "#E8D8C4", borderRadius: 7, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 7 },
  ailmentDots: { flexDirection: "row", gap: 12 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2,
  },
  dotPending: { backgroundColor: "#E8D8C4", borderColor: "#C9B8A8" },
  dotDone: { backgroundColor: "#68D585", borderColor: "#50BA6A" },
  dotActive: { backgroundColor: "#FFD166", borderColor: "#FFB800" },
});
