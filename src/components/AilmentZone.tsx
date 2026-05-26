import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureType } from "../constants/patients";

interface AilmentZoneProps {
  position: { x: number; y: number; size: number };
  gesture: GestureType;
  label: string;
  description: string;
  dragThreshold: number;
  tapCount?: number;
  containerWidth: number;
  containerHeight: number;
  isActive: boolean;
  onSuccess: () => void;
  onWrongGesture: () => void;
}

export default function AilmentZone({
  position,
  gesture,
  label,
  description,
  dragThreshold,
  tapCount = 5,
  containerWidth,
  containerHeight,
  isActive,
  onSuccess,
  onWrongGesture,
}: AilmentZoneProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const successCalledRef = useRef(false);
  const tapCountRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const gestureRef = useRef(gesture);
  const dragThresholdRef = useRef(dragThreshold);
  const tapCountParamRef = useRef(tapCount);
  const onSuccessRef = useRef(onSuccess);
  const onWrongGestureRef = useRef(onWrongGesture);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { gestureRef.current = gesture; }, [gesture]);
  useEffect(() => { dragThresholdRef.current = dragThreshold; }, [dragThreshold]);
  useEffect(() => { tapCountParamRef.current = tapCount; }, [tapCount]);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onWrongGestureRef.current = onWrongGesture; }, [onWrongGesture]);

  useEffect(() => {
    if (!isActive) {
      successCalledRef.current = false;
      tapCountRef.current = 0;
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }

    successCalledRef.current = false;
    tapCountRef.current = 0;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    loop.start();
    glow.start();
    return () => {
      loop.stop();
      glow.stop();
    };
  }, [isActive]);

  const triggerSuccess = () => {
    if (successCalledRef.current) return;
    successCalledRef.current = true;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 80, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
    onSuccessRef.current();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isActiveRef.current,
      onMoveShouldSetPanResponder: () => isActiveRef.current,
      onPanResponderGrant: () => {
        if (!isActiveRef.current) return;
        if (gestureRef.current === "TAP_RAPID") {
          tapCountRef.current += 1;
          if (tapCountRef.current >= tapCountParamRef.current) {
            triggerSuccess();
          }
        }
      },
      onPanResponderMove: (_e, gs) => {
        if (!isActiveRef.current || gestureRef.current === "TAP_RAPID") return;
        let delta = 0;
        if (gestureRef.current === "DRAG_DOWN") delta = Math.max(0, gs.dy);
        else if (gestureRef.current === "DRAG_UP") delta = Math.max(0, -gs.dy);
        else if (gestureRef.current === "DRAG_HORIZONTAL") delta = Math.abs(gs.dx);

        if (delta >= dragThresholdRef.current) {
          triggerSuccess();
        }
      },
    })
  ).current;

  const left = containerWidth * position.x - position.size / 2;
  const top = containerHeight * position.y - position.size / 2;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.7],
  });

  if (!isActive) {
    return (
      <View
        style={[
          styles.zoneInactive,
          {
            left,
            top,
            width: position.size,
            height: position.size,
            borderRadius: position.size / 2,
          },
        ]}
      />
    );
  }

  return (
    <View style={[styles.wrapper, { left, top, width: position.size, height: position.size }]}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: position.size + 24,
            height: position.size + 24,
            borderRadius: (position.size + 24) / 2,
            opacity: glowOpacity,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.zone,
          {
            width: position.size,
            height: position.size,
            borderRadius: position.size / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.gestureHint}>
          {gesture === "DRAG_UP"
            ? "↑"
            : gesture === "DRAG_DOWN"
            ? "↓"
            : gesture === "DRAG_HORIZONTAL"
            ? "↔"
            : "✦"}
        </Text>
      </Animated.View>

      <View style={styles.labelContainer} pointerEvents="none">
        <Text style={styles.zoneLabel}>{label}</Text>
        <Text style={styles.zoneDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    backgroundColor: "rgba(255,220,80,0.3)",
    borderWidth: 2,
    borderColor: "rgba(255,200,50,0.5)",
  },
  zone: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,220,80,0.65)",
    borderWidth: 3,
    borderColor: "#FFD166",
  },
  zoneInactive: {
    position: "absolute",
    backgroundColor: "rgba(200,200,200,0.15)",
    borderWidth: 2,
    borderColor: "rgba(200,200,200,0.3)",
  },
  gestureHint: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  labelContainer: {
    position: "absolute",
    top: "115%",
    backgroundColor: "rgba(61,44,30,0.88)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    minWidth: 120,
    zIndex: 10,
  },
  zoneLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#FFD166",
    textAlign: "center",
  },
  zoneDesc: {
    fontSize: 9,
    color: "#FFF0DC",
    textAlign: "center",
  },
});
