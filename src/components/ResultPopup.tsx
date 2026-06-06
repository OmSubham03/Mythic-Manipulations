import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

interface Props {
  visible: boolean;
  success: boolean;
  message: string;
  coinsEarned: number;
  reputationChange: number;
  onDismiss: () => void;
}

export default function ResultPopup({
  visible,
  success,
  message,
  coinsEarned,
  reputationChange,
  onDismiss,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(onDismiss, 3500);
      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      scale.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  const borderColor = success ? "#68D585" : "#FF5252";
  const headerColor = success ? "#68D585" : "#FF5252";
  const coinArrowUp = coinsEarned > 0;
  const repArrowUp = reputationChange > 0;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />
      <Animated.View
        style={[
          styles.card,
          { borderColor, opacity, transform: [{ scale }] },
        ]}
      >
        {/* Message */}
        <Text style={[styles.message, { color: headerColor }]}>{message}</Text>

        <View style={styles.divider} />

        {/* Coins row */}
        <View style={styles.row}>
          <Ionicons name="cash-outline" size={22} color="#FFD700" />
          <Text style={styles.label}>Coins</Text>
          <Text style={[styles.value, { color: coinArrowUp ? "#3D9E53" : "#CC3333" }]}>
            {coinArrowUp ? "+" : ""}{coinsEarned}
          </Text>
          <Ionicons
            name={coinArrowUp ? "arrow-up" : "arrow-down"}
            size={16}
            color={coinArrowUp ? "#3D9E53" : "#CC3333"}
          />
        </View>

        {/* Reputation row */}
        <View style={styles.row}>
          <Ionicons name="ribbon-outline" size={22} color="#FF7A5C" />
          <Text style={styles.label}>Reputation</Text>
          <Text style={[styles.value, { color: repArrowUp ? "#3D9E53" : "#CC3333" }]}>
            {repArrowUp ? "+" : ""}{reputationChange}
          </Text>
          <Ionicons
            name={repArrowUp ? "arrow-up" : "arrow-down"}
            size={16}
            color={repArrowUp ? "#3D9E53" : "#CC3333"}
          />
        </View>

        <Text style={styles.tap}>Tap to continue</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  message: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  divider: {
    width: "85%",
    height: 1,
    backgroundColor: "#E8D8C4",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 6,
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#3D2C1E",
  },
  value: {
    fontSize: 17,
    fontWeight: "800",
  },
  tap: {
    marginTop: 12,
    fontSize: 12,
    color: "#B8A898",
    fontWeight: "500",
  },
});
