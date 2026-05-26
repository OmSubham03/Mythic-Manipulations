import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

interface CrackEffectProps {
  visible: boolean;
  label: string;
  x: number;
  y: number;
  onDone: () => void;
}

const useND = Platform.OS !== "web";

export default function CrackEffect({ visible, label, x, y, onDone }: CrackEffectProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(0);
    opacityAnim.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 5,
          useNativeDriver: useND,
        }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 100, useNativeDriver: useND }),
      ]),
      Animated.delay(400),
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: useND }),
    ]).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - 60,
          top: y - 30,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{label}</Text>
      <View style={styles.sparkles}>
        {["✦", "✦", "✦", "✦"].map((s, i) => (
          <Text key={i} style={styles.sparkle}>
            {s}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  text: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sparkles: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  sparkle: {
    fontSize: 12,
    color: "#FFD166",
  },
});
