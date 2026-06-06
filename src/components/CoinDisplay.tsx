import Ionicons from "react-native-vector-icons/Ionicons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useGame } from "../context/GameContext";

interface CoinDisplayProps {
  coins?: number;
  burst?: number | null;
}

const useND = Platform.OS !== "web";

export default function CoinDisplay({ coins: coinsProp, burst }: CoinDisplayProps) {
  const { coins: ctxCoins } = useGame();
  const displayCoins = coinsProp ?? ctxCoins;

  const burstAnim = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!burst) return;
    burstAnim.setValue(0);
    burstOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(burstAnim, { toValue: -40, duration: 800, useNativeDriver: useND }),
      Animated.sequence([
        Animated.timing(burstOpacity, { toValue: 1, duration: 100, useNativeDriver: useND }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 600, delay: 200, useNativeDriver: useND }),
      ]),
    ]).start();
  }, [burst]);

  return (
    <View style={styles.container}>
      <Ionicons name="cash-outline" size={16} color="#FFD700" />
      <Text style={styles.coins}>{displayCoins}</Text>
      {burst != null && burst > 0 && (
        <Animated.Text
          style={[
            styles.burst,
            { transform: [{ translateY: burstAnim }], opacity: burstOpacity },
          ]}
        >
          +{burst}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    position: "relative",
  },
  coins: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#B8960C",
    fontFamily: "Inter_700Bold",
  },
  burst: {
    position: "absolute",
    top: -10,
    right: -10,
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
  },
});
