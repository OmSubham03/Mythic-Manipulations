import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Svg, { Defs, Line, LinearGradient, Path, Rect as SvgRect, Stop, Text as SvgText } from "react-native-svg";
import CoinDisplay from "../components/CoinDisplay";
import TutorialOverlay, { TutorialStep } from "../components/TutorialOverlay";
import PATIENTS, { AilmentType, PatientConfig, getRandomPatients } from "../constants/patients";
import { useGame } from "../context/GameContext";
import { useCrackSound } from "../hooks/useCrackSound";
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: W, height: H } = Dimensions.get("window");

/* ---- Thought bubble phrases keyed by ailment type ---- */
const THOUGHT_PHRASES: Record<AilmentType, string[]> = {
  TEETH:   ["Ow, my tooth!", "This toothache is killing me!", "Something's stuck in my teeth…"],
  HEAD:    ["Ah! This headache…", "My head is throbbing!", "Everything is spinning…"],
  NECK:    ["My neck won't turn!", "Ouch, stiff neck…", "Can't look sideways!"],
  CHEST:   ["My chest feels tight…", "Heart's racing!", "Can't catch my breath!"],
  BACK:    ["My back is killing me!", "Spine feels locked up…", "Need a good crack!"],
  LEG:     ["My leg is so stiff!", "Can't walk properly…", "Leg won't cooperate!"],
  STOMACH: ["My stomach is growling!", "Tummy feels bubbly…", "Belly ache again…"],
  EYE:     ["I can't see clearly…", "Everything looks fuzzy!", "My eyes are so blurry…"],
};

const SIT_IMAGES: Record<string, any> = {
  GOLEM: require("../assets/images/sit_golem.png"),
  HARPY: require("../assets/images/sit_harpy.png"),
  EMBER_KITTEN: require("../assets/images/sit_kitten.png"),
  ICE_YETI: require("../assets/images/sit_yeti.png"),
  MUSHROOM_SPRITE: require("../assets/images/sit_mushroom.png"),
  MINI_DRAGON: require("../assets/images/sit_dragon.png"),
  CRYSTAL_DEER: require("../assets/images/sit_deer.png"),
  LAVA_BLOB: require("../assets/images/sit_lava.png"),
  MOON_BUNNY: require("../assets/images/sit_bunny.png"),
};

// Chair positions as fraction of screen (x = center, y = bottom of sprite)
const CHAIR_POSITIONS = [
  { cx: 0.16, cy: 0.76 },
  { cx: 0.31, cy: 0.71 },
  { cx: 0.65, cy: 0.67 },
  { cx: 0.90, cy: 0.68 },
];

const SPRITE_SIZE = W * 0.22;
const SEAT_COSTS = [1000, 1500, 2500];
const RANK_NAMES = ["Newbie", "Intern", "Junior", "Specialist", "Master", "Legend"];

interface PatientSpriteProps {
  patient: PatientConfig;
  position: { cx: number; cy: number };
  delay: number;
  onPress: () => void;
  bubbleText?: string | null;
  bubbleOpacity?: Animated.Value;
}

function PatientSprite({ patient, position, delay, onPress, bubbleText, bubbleOpacity }: PatientSpriteProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const img = SIT_IMAGES[patient.type] ?? SIT_IMAGES.GOLEM;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 80,
      friction: 7,
      delay,
      useNativeDriver: true,
    }).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -7, duration: 1600 + delay * 0.3, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1600 + delay * 0.3, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
      ])
    );
    const t = setTimeout(() => { float.start(); glow.start(); }, delay + 300);
    return () => {
      clearTimeout(t);
      float.stop();
      glow.stop();
    };
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.85],
  });

  const left = position.cx * W - SPRITE_SIZE / 2;
  const top = position.cy * H - SPRITE_SIZE;

  return (
    <Animated.View
      style={[
        styles.spriteWrapper,
        {
          left,
          top,
          width: SPRITE_SIZE,
          transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.spriteTouchable}
      >
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: patient.glowColor,
              backgroundColor: patient.bodyColor + "22",
              opacity: glowOpacity,
            },
          ]}
        />
        <Animated.Image
          source={img}
          style={[styles.spriteImage, { width: SPRITE_SIZE, height: SPRITE_SIZE }]}
          resizeMode="contain"
        />
        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: patient.glowColor }]}>
          <Text style={styles.levelBadgeText}>Lv.{patient.level}</Text>
        </View>
      </TouchableOpacity>

      {/* Thought bubble */}
      {bubbleText && bubbleOpacity && (
        <Animated.View style={[styles.thoughtBubble, { opacity: bubbleOpacity }]}>
          <Text style={styles.thoughtText}>{bubbleText}</Text>
          {/* Small circle "tail" dots */}
          <View style={styles.bubbleDot1} />
          <View style={styles.bubbleDot2} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/* ---- Digital wall clock (right wall) ---- */
const CLOCK_W = W * 0.40;
const CLOCK_H = CLOCK_W * 0.4;
const CLOCK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CLOCK_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dayName = CLOCK_DAYS[now.getDay()];
  const hrs = now.getHours();
  const ampm = hrs >= 12 ? "PM" : "AM";
  const h12 = hrs % 12 || 12;
  const mm = now.getMinutes().toString().padStart(2, "0");
  const mon = CLOCK_MONTHS[now.getMonth()];
  const dd = now.getDate();
  const yyyy = now.getFullYear();

  return (
    <View
      style={{
        position: "absolute",
        right: W * 0.18,
        top: H * 0.15,
        width: CLOCK_W,
        height: CLOCK_H,
        transform: [{ perspective: 400 }, { rotateY: "-6deg" }, { rotateZ: "-1deg" }],
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      }}
    >
      <Svg width={CLOCK_W} height={CLOCK_H} viewBox="0 0 140 82">
        <Defs>
          {/* Outer frame — warm wood base */}
          <LinearGradient id="frameOuter" x1="0" y1="0" x2="0" y2="82" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#C49468" />
            <Stop offset="50%" stopColor="#A87B4E" />
            <Stop offset="100%" stopColor="#8B6338" />
          </LinearGradient>
          {/* Inner bevel — lighter lip */}
          <LinearGradient id="frameInner" x1="0" y1="0" x2="0" y2="82" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#D4AD78" />
            <Stop offset="100%" stopColor="#B88C55" />
          </LinearGradient>
          {/* Top-left highlight for 3D bevel */}
          <LinearGradient id="bevelHL" x1="0" y1="0" x2="140" y2="82" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#E8CFA0" stopOpacity="0.7" />
            <Stop offset="50%" stopColor="#E8CFA0" stopOpacity="0" />
            <Stop offset="100%" stopColor="#5A3D1E" stopOpacity="0.3" />
          </LinearGradient>
          {/* Screen inset */}
          <LinearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFF8EE" />
            <Stop offset="100%" stopColor="#F5E8D4" />
          </LinearGradient>
        </Defs>

        {/* Outer frame */}
        <SvgRect x="0" y="0" width="140" height="82" rx="5" fill="url(#frameOuter)" />
        {/* Bevel highlight (light top-left, shadow bottom-right) */}
        <SvgRect x="0" y="0" width="140" height="82" rx="5" fill="url(#bevelHL)" />
        {/* Outer dark edge */}
        <SvgRect x="0.5" y="0.5" width="139" height="81" rx="5" fill="none" stroke="#5A3D1E" strokeWidth="1.2" />
        {/* Top highlight edge */}
        <Line x1="6" y1="1.2" x2="134" y2="1.2" stroke="#D4B88A" strokeWidth="0.6" opacity="0.6" />
        {/* Left highlight edge */}
        <Line x1="1.2" y1="6" x2="1.2" y2="76" stroke="#D4B88A" strokeWidth="0.6" opacity="0.5" />

        {/* Inner golden lip */}
        <SvgRect x="8" y="7" width="124" height="68" rx="3" fill="url(#frameInner)" />
        <SvgRect x="8" y="7" width="124" height="68" rx="3" fill="none" stroke="#7A5A35" strokeWidth="0.6" />
        {/* Inner lip highlight */}
        <Line x1="12" y1="8" x2="128" y2="8" stroke="#E8CFA0" strokeWidth="0.5" opacity="0.6" />

        {/* Wood grain texture */}
        <Line x1="4" y1="5" x2="136" y2="5" stroke="#8B6338" strokeWidth="0.3" opacity="0.3" />
        <Line x1="3" y1="77" x2="137" y2="77" stroke="#8B6338" strokeWidth="0.3" opacity="0.3" />
        <Line x1="4" y1="3" x2="4" y2="79" stroke="#8B6338" strokeWidth="0.2" opacity="0.2" />
        <Line x1="136" y1="3" x2="136" y2="79" stroke="#8B6338" strokeWidth="0.2" opacity="0.2" />

        {/* Screen inset */}
        <SvgRect x="12" y="11" width="116" height="60" rx="2" fill="url(#screenBg)" />
        <SvgRect x="12" y="11" width="116" height="60" rx="2" fill="none" stroke="#9B7A50" strokeWidth="0.6" />

        {/* AM / PM */}
        <SvgText x="20" y="40" fontSize="10" fill="#8B6B45" fontWeight="700">
          {ampm}
        </SvgText>
        {/* Time — split so colon always renders */}
        <SvgText x="74" y="44" fontSize="28" fill="#3D2C1E" fontWeight="800" textAnchor="end">
          {h12}
        </SvgText>
        <SvgText x="79" y="43" fontSize="24" fill="#3D2C1E" fontWeight="800" textAnchor="middle">
          :
        </SvgText>
        <SvgText x="83" y="44" fontSize="28" fill="#3D2C1E" fontWeight="800" textAnchor="start">
          {mm}
        </SvgText>
        {/* Day + Date row */}
        <SvgText x="28" y="60" fontSize="10" fill="#5A3D1E" fontWeight="700" textAnchor="middle">
          {dayName}
        </SvgText>
        <SvgText x="64" y="60" fontSize="10" fill="#5A3D1E" fontWeight="700" textAnchor="middle">
          {mon} {dd}
        </SvgText>
        <SvgText x="110" y="60" fontSize="10" fill="#5A3D1E" fontWeight="700" textAnchor="middle">
          {yyyy}
        </SvgText>
      </Svg>
    </View>
  );
}

function SeatPlaceholder({ position, type, onPress }: {
  position: { cx: number; cy: number };
  type: "locked" | "purchasable";
  onPress: () => void;
}) {
  const isGold = type === "purchasable";
  const left = position.cx * W - SPRITE_SIZE / 2;
  const top = position.cy * H - SPRITE_SIZE;

  return (
    <View style={[styles.spriteWrapper, { left, top, width: SPRITE_SIZE }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.spriteTouchable}>
        <View
          style={[
            styles.glowRing,
            {
              width: SPRITE_SIZE - 30,
              height: SPRITE_SIZE - 30,
              borderRadius: (SPRITE_SIZE - 30) / 2,
              top: 15,
              left: 15,
              borderColor: isGold ? "#FFD700" : "#C8C8C8",
              backgroundColor: isGold ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.60)",
              opacity: isGold ? 0.85 : 0.55,
            },
          ]}
        />
        <View style={styles.placeholderIcon}>
          <Ionicons
            name={isGold ? "add-circle" : "lock-closed"}
            size={24}
            color={isGold ? "#FFD700" : "#C8C8C8"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { coins, reputation, tutorialComplete, doctorName, completeTutorial, resetTutorial, unlockedSeats, unlockSeat } = useGame();
  const { playTap } = useCrackSound();
  const rankIdx = Math.min(5, Math.floor(reputation / 1000));
  const [patients] = useState<PatientConfig[]>(() => getRandomPatients(4, rankIdx));
  const titleAnim = useRef(new Animated.Value(0)).current;

  /* ---- Thought bubble cycling ---- */
  const [bubbleIdx, setBubbleIdx] = useState<number | null>(null);
  const [bubbleText, setBubbleText] = useState<string>("");
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickBubblePhrase = useCallback((patient: PatientConfig): string => {
    const ailType = patient.ailments[0]?.type ?? "HEAD";
    const pool = THOUGHT_PHRASES[ailType] ?? THOUGHT_PHRASES.HEAD;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  // Cycle thought bubbles: show on random patient, fade in → hold 3s → fade out → wait 2-4s → repeat
  useEffect(() => {
    let cancelled = false;

    const showNext = () => {
      if (cancelled) return;
      // Pick a random unlocked seat index
      const available = unlockedSeats.filter((i: number) => i < patients.length);
      if (available.length === 0) return;
      const idx = available[Math.floor(Math.random() * available.length)];
      const phrase = pickBubblePhrase(patients[idx]);

      setBubbleIdx(idx);
      setBubbleText(phrase);

      // Fade in
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
        if (cancelled) return;
        // Hold for 3 seconds, then fade out
        bubbleTimer.current = setTimeout(() => {
          if (cancelled) return;
          Animated.timing(bubbleOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
            if (cancelled) return;
            setBubbleIdx(null);
            // Wait 2–4s before next bubble
            const delay = 2000 + Math.random() * 2000;
            bubbleTimer.current = setTimeout(showNext, delay);
          });
        }, 3000);
      });
    };

    // Start first bubble after an initial 1.5s delay
    bubbleTimer.current = setTimeout(showNext, 1500);

    return () => {
      cancelled = true;
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleOpacity.setValue(0);
    };
  }, [unlockedSeats, patients]);

  // Seat popup state
  const [seatPopup, setSeatPopup] = useState<{
    visible: boolean;
    type: "locked" | "buy" | "noCoins";
    seatIndex: number;
    cost: number;
    neededRank: string;
  }>({ visible: false, type: "locked", seatIndex: 0, cost: 0, neededRank: "" });
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.8)).current;

  const showSeatPopup = useCallback((opts: typeof seatPopup) => {
    setSeatPopup(opts);
    Animated.parallel([
      Animated.timing(popupOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(popupScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const hideSeatPopup = useCallback(() => {
    Animated.timing(popupOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setSeatPopup((p) => ({ ...p, visible: false }));
      popupScale.setValue(0.8);
    });
  }, []);

  // Tutorial state
  const [tutStep, setTutStep] = useState<TutorialStep>("HIDDEN");
  const isTutorialRestart = useRef(false);

  useEffect(() => {
    Animated.spring(titleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  }, []);

  // Start tutorial on first load if not completed
  useEffect(() => {
    if (!tutorialComplete) {
      const timer = setTimeout(() => {
        // If name already set (restarted tutorial), skip intro
        setTutStep(doctorName ? "CLINIC_INTRO" : "INTRO");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [tutorialComplete]);

  const handleTutorialStepDone = useCallback((step: TutorialStep) => {
    switch (step) {
      case "INTRO":
        setTutStep("NAME_INPUT");
        break;
      case "NAME_INPUT":
        setTutStep("CLINIC_INTRO");
        break;
      case "CLINIC_INTRO":
        setTutStep("LOBBY_TAP");
        break;
      case "COMPLETE":
        setTutStep("HIDDEN");
        completeTutorial();
        break;
    }
  }, [completeTutorial]);

  const handlePatientPress = useCallback((patient: PatientConfig, index: number) => {
    playTap();
    // Serialize patient data (excluding non-serializable image)
    const { image, ...serializable } = patient;
    const patientData = JSON.stringify(serializable);
    if (tutStep === "LOBBY_TAP") {
      // Only allow tapping the 2nd patient (index 1) during tutorial
      if (index !== 1) return;
      setTutStep("HIDDEN");
      navigation.navigate("Treatment", { patientType: patient.type, tutorial: true, patientData } as any);
    } else if (tutStep !== "HIDDEN" && tutStep !== "INTRO" && tutStep !== "NAME_INPUT" && tutStep !== "CLINIC_INTRO" && tutStep !== "COMPLETE") {
      // Block taps during other tutorial steps
      return;
    } else if (tutStep === "HIDDEN") {
      navigation.navigate("Treatment", { patientType: patient.type, patientData });
    }
  }, [tutStep, navigation]);

  const handleRestartTutorial = useCallback(() => {
    isTutorialRestart.current = true;
    resetTutorial();
    setTutStep(doctorName ? "CLINIC_INTRO" : "INTRO");
  }, [resetTutorial, doctorName]);

  const handleSeatPlaceholderPress = useCallback((seatIndex: number, canPurchase: boolean) => {
    if (tutStep !== "HIDDEN") return;
    playTap();
    if (!canPurchase) {
      const neededRank = RANK_NAMES[unlockedSeats.length];
      showSeatPopup({ visible: true, type: "locked", seatIndex, cost: 0, neededRank });
      return;
    }
    const cost = SEAT_COSTS[unlockedSeats.length - 1];
    showSeatPopup({ visible: true, type: "buy", seatIndex, cost, neededRank: "" });
  }, [tutStep, playTap, unlockedSeats, showSeatPopup]);

  const rankIndex = Math.min(5, Math.floor(reputation / 1000));
  const maxSeats = Math.min(4, rankIndex + 1);
  const rankLevel = reputation >= 5000 ? Math.floor((reputation - 4000) / 200) : Math.floor((reputation % 1000) / 200) + 1;
  const stars = rankIndex;
  const levelName = RANK_NAMES[rankIndex];

  // Spotlight rect for 2nd patient (index 1)
  const spotlightRect = tutStep === "LOBBY_TAP" ? {
    x: CHAIR_POSITIONS[1].cx * W - SPRITE_SIZE / 2 - 4,
    y: CHAIR_POSITIONS[1].cy * H - SPRITE_SIZE - 4,
    w: SPRITE_SIZE + 8,
    h: SPRITE_SIZE + 8,
  } : null;

  return (
    <ImageBackground
      source={require("../assets/images/waiting_room.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 10 }]}>
        {/* Top bar */}
        <Animated.View
          style={[
            styles.topBar,
            { opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}
        >
          <View style={styles.dutyInfo}>
            <TouchableOpacity
              onPress={() => { playTap(); navigation.navigate("Start", { fromLobby: true }); }}
              style={styles.exitBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="exit-outline" size={22} color="#FFF8EE" />
            </TouchableOpacity>
            <View>
              <Text style={styles.dutyLabel}>On Duty:</Text>
              <Text style={styles.dutyName}>Dr {doctorName || "Unknown"}</Text>
            </View>
          </View>

          <View style={styles.topRight}>
            <View style={styles.repColumn}>
              <Text style={styles.levelLabel}>{levelName} {rankLevel}</Text>
              <View style={styles.repBadge}>
                {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= stars ? "star" : "star-outline"}
                  size={14}
                  color={i <= stars ? "#FFD700" : "rgba(255,255,255,0.4)"}
                />
              ))}
              </View>
            </View>
            <CoinDisplay />
          </View>
        </Animated.View>

        {/* Action buttons */}
        <View style={[styles.actionRow, { paddingBottom: insets.bottom }]}>
          {/* Tutorial restart button */}
          {tutorialComplete && (
            <TouchableOpacity
              onPress={() => { playTap(); handleRestartTutorial(); }}
              style={[styles.actionBtn, { marginRight: "auto" }]}
            >
              <Ionicons name="help-circle-outline" size={20} color="#FFF8EE" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { playTap(); navigation.navigate("Upgrades"); }}
            style={styles.actionBtn}
          >
            <Ionicons name="construct" size={20} color="#FFF8EE" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { playTap(); navigation.navigate("MonsterCollection"); }}
            style={styles.actionBtn}
          >
            <Ionicons name="paw" size={20} color="#FFF8EE" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { playTap(); navigation.navigate("Profile"); }}
            style={styles.actionBtn}
          >
            <Ionicons name="person" size={20} color="#FFF8EE" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Digital wall clock */}
      <DigitalClock />

      {/* Seats — patient sprites or placeholders */}
      {CHAIR_POSITIONS.map((pos, i) => {
        const isUnlocked = unlockedSeats.includes(i);
        const canPurchase = !isUnlocked && unlockedSeats.length < maxSeats;

        if (isUnlocked) {
          return (
            <PatientSprite
              key={`seat-${i}`}
              patient={patients[i]}
              position={pos}
              delay={i * 120}
              onPress={() => handlePatientPress(patients[i], i)}
              bubbleText={bubbleIdx === i ? bubbleText : null}
              bubbleOpacity={bubbleIdx === i ? bubbleOpacity : undefined}
            />
          );
        }

        return (
          <SeatPlaceholder
            key={`seat-${i}`}
            position={pos}
            type={canPurchase ? "purchasable" : "locked"}
            onPress={() => handleSeatPlaceholderPress(i, canPurchase)}
          />
        );
      })}

      {/* Tutorial overlay */}
      <TutorialOverlay
        step={tutStep}
        onStepDone={handleTutorialStepDone}
        spotlightRect={spotlightRect}
        onSkip={isTutorialRestart.current ? () => setTutStep("HIDDEN") : undefined}
      />

      {/* Seat popup */}
      {seatPopup.visible && (
        <View style={seatStyles.overlay}>
          <TouchableOpacity style={seatStyles.backdrop} activeOpacity={1} onPress={hideSeatPopup} />
          <Animated.View style={[
            seatStyles.card,
            {
              borderColor: seatPopup.type === "locked" ? "#C8C8C8" : seatPopup.type === "noCoins" ? "#FF5252" : "#FFD700",
              opacity: popupOpacity,
              transform: [{ scale: popupScale }],
            },
          ]}>
            {seatPopup.type === "locked" && (
              <>
                <Ionicons name="lock-closed" size={32} color="#C8C8C8" style={{ marginBottom: 8 }} />
                <Text style={[seatStyles.title, { color: "#999" }]}>Seat Locked</Text>
                <View style={seatStyles.divider} />
                <Text style={seatStyles.desc}>Reach <Text style={{ fontWeight: "800", color: "#3D2C1E" }}>{seatPopup.neededRank}</Text> rank to unlock more seats!</Text>
                <TouchableOpacity style={[seatStyles.btn, { backgroundColor: "#C8C8C8" }]} onPress={hideSeatPopup}>
                  <Text style={seatStyles.btnText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
            {seatPopup.type === "buy" && (
              <>
                <Ionicons name="add-circle" size={32} color="#FFD700" style={{ marginBottom: 8 }} />
                <Text style={[seatStyles.title, { color: "#B8960C" }]}>Unlock Seat</Text>
                <View style={seatStyles.divider} />
                <View style={seatStyles.costRow}>
                  <Ionicons name="cash-outline" size={20} color="#FFD700" />
                  <Text style={seatStyles.costLabel}>Cost</Text>
                  <Text style={seatStyles.costValue}>{seatPopup.cost}</Text>
                </View>
                <View style={seatStyles.costRow}>
                  <Ionicons name="wallet-outline" size={20} color="#3D9E53" />
                  <Text style={seatStyles.costLabel}>Your coins</Text>
                  <Text style={[seatStyles.costValue, { color: coins >= seatPopup.cost ? "#3D9E53" : "#CC3333" }]}>{coins}</Text>
                </View>
                <View style={seatStyles.btnRow}>
                  <TouchableOpacity style={[seatStyles.btn, { backgroundColor: "#E8D8C4" }]} onPress={hideSeatPopup}>
                    <Text style={[seatStyles.btnText, { color: "#3D2C1E" }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[seatStyles.btn, { backgroundColor: coins >= seatPopup.cost ? "#FFD700" : "#CCC" }]} onPress={() => {
                    if (unlockSeat(seatPopup.seatIndex, seatPopup.cost)) {
                      hideSeatPopup();
                    } else {
                      setSeatPopup((p) => ({ ...p, type: "noCoins" }));
                    }
                  }}>
                    <Text style={seatStyles.btnText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {seatPopup.type === "noCoins" && (
              <>
                <Ionicons name="warning" size={32} color="#FF5252" style={{ marginBottom: 8 }} />
                <Text style={[seatStyles.title, { color: "#CC3333" }]}>Not Enough Coins</Text>
                <View style={seatStyles.divider} />
                <Text style={seatStyles.desc}>You need <Text style={{ fontWeight: "800", color: "#3D2C1E" }}>{seatPopup.cost}</Text> coins to unlock this seat.</Text>
                <TouchableOpacity style={[seatStyles.btn, { backgroundColor: "#FF5252" }]} onPress={hideSeatPopup}>
                  <Text style={[seatStyles.btnText, { color: "#FFF" }]}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  overlay: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(61,44,30,0.72)",
    borderRadius: 20,
    marginHorizontal: 12,
  },
  dutyInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  exitBtn: {
    marginRight: 10,
    padding: 4,
  },
  dutyLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "rgba(255,248,238,0.7)",
  },
  dutyName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF8EE",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  repBadge: {
    flexDirection: "row",
    gap: 2,
  },
  repColumn: {
    alignItems: "center",
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    gap: 10,
    paddingBottom: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(61,44,30,0.72)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,248,238,0.2)",
  },
  spriteWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  spriteTouchable: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: SPRITE_SIZE + 20,
    height: SPRITE_SIZE + 20,
    borderRadius: (SPRITE_SIZE + 20) / 2,
    borderWidth: 2.5,
    top: -10,
    left: -10,
  },
  spriteImage: {
    zIndex: 2,
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    zIndex: 3,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  placeholderIcon: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  thoughtBubble: {
    position: "absolute" as const,
    top: -38,
    alignSelf: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    maxWidth: SPRITE_SIZE * 1.6,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  thoughtText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#3D2C1E",
    textAlign: "center" as const,
    lineHeight: 13,
  },
  bubbleDot1: {
    position: "absolute" as const,
    bottom: -6,
    left: "45%" as any,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  bubbleDot2: {
    position: "absolute" as const,
    bottom: -12,
    left: "50%" as any,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
});

const seatStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    width: "78%",
    backgroundColor: "#FFF8EE",
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  divider: {
    width: "85%",
    height: 1,
    backgroundColor: "#E8D8C4",
    marginVertical: 10,
  },
  desc: {
    fontSize: 14,
    color: "#6B5B4B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 6,
    gap: 8,
  },
  costLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#3D2C1E",
  },
  costValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D2C1E",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 6,
    elevation: 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2C1E",
  },
});
