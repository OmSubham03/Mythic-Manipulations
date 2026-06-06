import Ionicons from "react-native-vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NurseBirdSVG from "./NurseBirdSVG";
import Svg, { Rect, Ellipse, Path, Circle, G, Defs, Mask } from "react-native-svg";
import { useGame } from "../context/GameContext";
import { useCrackSound } from "../hooks/useCrackSound";

const { width: W, height: H } = Dimensions.get("window");

/*
  Tutorial steps:
  INTRO        – Nurse appears, asks for name (skip if name exists)
  NAME_INPUT   – Text input for doctor name
  CLINIC_INTRO – Nurse explains the clinic
  LOBBY_TAP    – Highlight 2nd patient, ask to tap
  (navigation to Treatment happens externally)
  TREAT_SELECT – Highlight ailment zones, instruct to tap
  TREAT_SOLVE  – Instruct how to solve the ailment
  (ailment solved externally)
  COMPLETE     – Nurse congratulates
*/
export type TutorialStep =
  | "INTRO"
  | "NAME_INPUT"
  | "CLINIC_INTRO"
  | "LOBBY_TAP"
  | "TREAT_SELECT"
  | "TREAT_SOLVE"
  | "COMPLETE"
  | "HIDDEN";

interface Props {
  step: TutorialStep;
  onStepDone: (step: TutorialStep) => void;
  /** Rect {x,y,w,h} of the spotlight cutout (in screen coords) */
  spotlightRect?: { x: number; y: number; w: number; h: number } | null;
  gestureHint?: string;
  /** Called when user taps the skip (X) button — only shown on replay */
  onSkip?: () => void;
}

export default function TutorialOverlay({ step, onStepDone, spotlightRect, gestureHint, onSkip }: Props) {
  const { doctorName, setDoctorName, tutorialComplete } = useGame();
  const { playTap } = useCrackSound();
  const [nameInput, setNameInput] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const nurseSlide = useRef(new Animated.Value(W)).current;
  const bubbleScale = useRef(new Animated.Value(0)).current;

  const showNurse = step === "INTRO" || step === "NAME_INPUT" || step === "CLINIC_INTRO" || step === "COMPLETE";
  const showDim = step !== "HIDDEN";

  useEffect(() => {
    if (showDim) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [showDim]);

  useEffect(() => {
    if (showNurse) {
      nurseSlide.setValue(W);
      bubbleScale.setValue(0);
      Animated.spring(nurseSlide, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }).start(() => {
        Animated.spring(bubbleScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
      });
    }
  }, [step]);

  const handleNameSubmit = useCallback(() => {
    Keyboard.dismiss();
    const name = nameInput.trim() || "Doc";
    setDoctorName(name);
    onStepDone("NAME_INPUT");
  }, [nameInput, setDoctorName, onStepDone]);

  const handleTap = useCallback(() => {
    if (step === "INTRO") {
      onStepDone("INTRO");
    } else if (step === "CLINIC_INTRO") {
      onStepDone("CLINIC_INTRO");
    } else if (step === "COMPLETE") {
      onStepDone("COMPLETE");
    }
  }, [step, onStepDone]);

  if (step === "HIDDEN") return null;

  const dialogueText = getDialogueText(step, doctorName);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
      {/* Skip button — shown when onSkip is provided */}
      {onSkip && (
        <TouchableOpacity style={styles.skipBtn} onPress={() => { playTap(); onSkip?.(); }} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>
      )}
      {/* Dim background with cutout */}
      <Animated.View
        style={[styles.dimOverlay, { opacity: fadeAnim }]}
        pointerEvents={step === "LOBBY_TAP" || step === "TREAT_SELECT" || step === "TREAT_SOLVE" ? "none" : "auto"}
      >
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="spotlightMask">
              <Rect x={0} y={0} width={W} height={H} fill="white" />
              {spotlightRect && (
                <Rect
                  x={spotlightRect.x - 6}
                  y={spotlightRect.y - 6}
                  width={spotlightRect.w + 12}
                  height={spotlightRect.h + 12}
                  rx={18}
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="rgba(0,0,0,0.72)"
            mask="url(#spotlightMask)"
          />
          {spotlightRect && (
            <Rect
              x={spotlightRect.x - 6}
              y={spotlightRect.y - 6}
              width={spotlightRect.w + 12}
              height={spotlightRect.h + 12}
              rx={18}
              fill="none"
              stroke="#FFD166"
              strokeWidth={3}
            />
          )}
        </Svg>
      </Animated.View>

      {/* Nurse + dialogue for intro/outro steps */}
      {showNurse && (
        <Animated.View
          style={[styles.nurseContainer, { transform: [{ translateX: nurseSlide }] }]}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.speechBubble, { transform: [{ scale: bubbleScale }] }]}>
            <View style={styles.bubbleTailDown} />
            <Text style={styles.speechText}>{dialogueText}</Text>

            {step === "NAME_INPUT" ? (
              <View style={styles.nameInputRow}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Your name..."
                  placeholderTextColor="#B8A896"
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={16}
                  autoFocus
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.nameSubmitBtn} onPress={() => { playTap(); handleNameSubmit(); }}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.continueBtn} onPress={() => { playTap(); handleTap(); }} activeOpacity={0.7}>
                <Text style={styles.continueBtnText}>
                  {step === "COMPLETE" ? "Let's go!" : "Continue"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </Animated.View>
          {/* Bird + table scene */}
          <View style={styles.nurseScene}>
            <View style={styles.nurseBirdWrap}>
              <NurseBirdSVG width={200} height={260} />
            </View>
            <View style={styles.medicalTable}>
              <Svg width={W} height={80} viewBox="0 0 400 80" preserveAspectRatio="none">
                {/* Table surface - extends full height */}
                <Rect x={0} y={0} width={400} height={80} rx={4} fill="#C9A86C" />
                <Rect x={0} y={0} width={400} height={10} rx={4} fill="#D4B87A" />
                {/* Cloth/mat */}
                <Rect x={25} y={3} width={140} height={16} rx={3} fill="#8BC5A6" opacity={0.7} />
                {/* Stethoscope */}
                <Path d="M 55 8 Q 46 18, 52 28 Q 58 36, 66 30" fill="none" stroke="#5B9BD5" strokeWidth={2.5} strokeLinecap="round" />
                <Circle cx={66} cy={30} r={4} fill="#5B9BD5" />
                {/* Syringe */}
                <Rect x={95} y={5} width={42} height={7} rx={2} fill="#E8E8E8" />
                <Rect x={92} y={4} width={6} height={9} rx={1} fill="#CCCCCC" />
                <Rect x={137} y={7} width={10} height={3} rx={0.5} fill="#DDDDDD" />
                {/* Clipboard */}
                <G transform="translate(200, 2)">
                  <Rect x={0} y={0} width={30} height={38} rx={3} fill="#F5E6D0" />
                  <Rect x={9} y={-4} width={12} height={7} rx={2} fill="#A08060" />
                  <Rect x={4} y={8} width={22} height={2} rx={0.5} fill="#D4C4B0" />
                  <Rect x={4} y={13} width={20} height={2} rx={0.5} fill="#D4C4B0" />
                  <Rect x={4} y={18} width={17} height={2} rx={0.5} fill="#D4C4B0" />
                  <Rect x={4} y={23} width={14} height={2} rx={0.5} fill="#D4C4B0" />
                </G>
                {/* Band-aids */}
                <G transform="translate(270, 5)">
                  <Rect x={0} y={0} width={26} height={10} rx={3} fill="#FFD4A8" />
                  <Rect x={8} y={0} width={10} height={10} rx={0} fill="#F5C494" />
                  <Circle cx={13} cy={5} r={1.5} fill="#E8B080" />
                </G>
                {/* Small bottle */}
                <G transform="translate(330, 0)">
                  <Rect x={5} y={0} width={12} height={6} rx={1.5} fill="#88BBDD" />
                  <Rect x={3} y={6} width={16} height={20} rx={4} fill="#AAD4EE" />
                  <Rect x={7} y={10} width={8} height={6} rx={1.5} fill="#FFFFFF" opacity={0.5} />
                </G>
              </Svg>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Instruction banners for gameplay steps */}
      {(step === "LOBBY_TAP" || step === "TREAT_SELECT" || step === "TREAT_SOLVE") && (
        <Animated.View style={[
          styles.instructionBanner,
          step === "TREAT_SOLVE" ? { top: undefined, bottom: H * 0.06 } : null,
          { opacity: fadeAnim },
        ]}>
          <Ionicons name="hand-left-outline" size={18} color="#FFD166" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.instructionText}>{dialogueText}</Text>
            {gestureHint ? <Text style={styles.gestureHintText}>{gestureHint}</Text> : null}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function getDialogueText(step: TutorialStep, doctorName: string): string {
  switch (step) {
    case "INTRO":
      return "Hi there! I'm Nurse ChoosyBird, your clinic assistant.\n\nWhat should I call you, Doctor?";
    case "NAME_INPUT":
      return "Please enter your name below:";
    case "CLINIC_INTRO":
      return `Welcome, Dr. ${doctorName || "Doc"}! This is Mythic Wellness — our clinic for magical creatures.\n\nMonsters come in with aches and pains. Your job is to treat them!\n\nLet me show you how it works.`;
    case "LOBBY_TAP":
      return "Tap on this patient to begin treatment!";
    case "TREAT_SELECT":
      return "Tap a glowing area to start treating that ailment.";
    case "TREAT_SOLVE":
      return "Complete the mini-game to heal!";
    case "COMPLETE":
      return `Well done, Dr. ${doctorName || "Doc"}! You are quite skilled.\n\nLet's treat more patients!`;
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  skipBtn: {
    position: "absolute",
    top: 44,
    right: 16,
    zIndex: 110,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  nurseContainer: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 95,
  },
  nurseScene: {
    alignItems: "center",
    position: "relative",
    marginBottom: -20,
  },
  nurseBirdWrap: {
    alignItems: "center",
    marginBottom: -30,
    zIndex: 1,
  },
  medicalTable: {
    zIndex: 2,
    width: W,
    alignItems: "center",
  },
  speechBubble: {
    backgroundColor: "#FFF8EE",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    maxWidth: W * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#E8D8C4",
    marginBottom: 8,
  },
  bubbleTailDown: {
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: "transparent",
    borderRightWidth: 8,
    borderRightColor: "transparent",
    borderTopWidth: 12,
    borderTopColor: "#FFF8EE",
  },
  speechText: {
    fontSize: 19,
    color: "#3D2C1E",
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#68D585",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    gap: 4,
  },
  continueBtnText: {
    color: "#FFF",
    fontWeight: "700" as const,
    fontSize: 16,
  },
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#3D2C1E",
    borderWidth: 1.5,
    borderColor: "#E8D8C4",
    fontWeight: "600" as const,
  },
  nameSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#68D585",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionBanner: {
    position: "absolute",
    top: H * 0.12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(61,44,30,0.92)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    zIndex: 95,
    maxWidth: W * 0.85,
    borderWidth: 1.5,
    borderColor: "#FFD166",
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFD166",
  },
  gestureHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});
