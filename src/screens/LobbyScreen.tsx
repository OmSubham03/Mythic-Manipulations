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

import CoinDisplay from "../components/CoinDisplay";
import TutorialOverlay, { TutorialStep } from "../components/TutorialOverlay";
import PATIENTS, { PatientConfig, getRandomPatients } from "../constants/patients";
import { useGame } from "../context/GameContext";
import { useCrackSound } from "../hooks/useCrackSound";
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: W, height: H } = Dimensions.get("window");

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

interface PatientSpriteProps {
  patient: PatientConfig;
  position: { cx: number; cy: number };
  delay: number;
  onPress: () => void;
}

function PatientSprite({ patient, position, delay, onPress }: PatientSpriteProps) {
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
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { coins, reputation, tutorialComplete, doctorName, completeTutorial, resetTutorial } = useGame();
  const { playTap } = useCrackSound();
  const [patients] = useState<PatientConfig[]>(() => getRandomPatients(4));
  const titleAnim = useRef(new Animated.Value(0)).current;

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
    if (tutStep === "LOBBY_TAP") {
      // Only allow tapping the 2nd patient (index 1) during tutorial
      if (index !== 1) return;
      setTutStep("HIDDEN");
      navigation.navigate("Treatment", { patientType: patient.type, tutorial: true } as any);
    } else if (tutStep !== "HIDDEN" && tutStep !== "INTRO" && tutStep !== "NAME_INPUT" && tutStep !== "CLINIC_INTRO" && tutStep !== "COMPLETE") {
      // Block taps during other tutorial steps
      return;
    } else if (tutStep === "HIDDEN") {
      navigation.navigate("Treatment", { patientType: patient.type });
    }
  }, [tutStep, navigation]);

  const handleRestartTutorial = useCallback(() => {
    isTutorialRestart.current = true;
    resetTutorial();
    setTutStep(doctorName ? "CLINIC_INTRO" : "INTRO");
  }, [resetTutorial, doctorName]);

  const RANK_NAMES = ["Newbie", "Intern", "Junior", "Specialist", "Master", "Legend"];
  const rankIndex = Math.min(5, Math.floor(reputation / 1000));
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

      {/* Patient sprites on chairs */}
      {patients.map((patient, i) => (
        <PatientSprite
          key={patient.type + i}
          patient={patient}
          position={CHAIR_POSITIONS[i]}
          delay={i * 120}
          onPress={() => handlePatientPress(patient, i)}
        />
      ))}

      {/* Tutorial overlay */}
      <TutorialOverlay
        step={tutStep}
        onStepDone={handleTutorialStepDone}
        spotlightRect={spotlightRect}
        onSkip={isTutorialRestart.current ? () => setTutStep("HIDDEN") : undefined}
      />
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
});
