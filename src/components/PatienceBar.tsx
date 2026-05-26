import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface PatienceBarProps {
  value: number;
  maxValue: number;
}

export default function PatienceBar({ value, maxValue }: PatienceBarProps) {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pct = Math.max(0, Math.min(1, value / maxValue));
    Animated.timing(progress, { toValue: pct, duration: 300, useNativeDriver: false }).start();
  }, [value, maxValue]);

  const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const barColor = progress.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: ["#FF5252", "#FF5252", "#FFD166", "#68D585"],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Patience</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: barColor }]} />
        {[25, 50, 75].map((seg) => (
          <View key={seg} style={[styles.segment, { left: `${seg}%` as `${number}%` }]} />
        ))}
      </View>
      <Text style={styles.pct}>{Math.round(pct)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 0, flex: 1 },
  label: { fontSize: 12, fontWeight: "700" as const, color: "#8B7355", width: 58 },
  track: { flex: 1, height: 16, backgroundColor: "#E8D8C4", borderRadius: 8, overflow: "hidden", position: "relative" },
  fill: { height: "100%", borderRadius: 8 },
  segment: { position: "absolute", width: 2, height: "100%", backgroundColor: "rgba(255,255,255,0.4)" },
  pct: { fontSize: 12, fontWeight: "700" as const, color: "#8B7355", width: 36, textAlign: "right" },
});
