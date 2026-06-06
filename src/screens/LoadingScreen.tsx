import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Polygon, Rect, G, Ellipse } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: W, height: H } = Dimensions.get("window");

const FLAVOR_TEXTS = [
  "Attuning Healing Crystals",
  "Summoning Mythic Patients",
  "Polishing Stethoscope Runes",
  "Warming Up Bone Crackers",
  "Calibrating Aura Sensors",
  "Brewing Herbal Potions",
  "Aligning Chakra Stones",
];

export default function LoadingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [flavorIdx, setFlavorIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Spin crystal continuously
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Update progress text
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return Math.min(100, p + 2);
      });
    }, 100);

    // Cycle flavor text
    const flavorInterval = setInterval(() => {
      setFlavorIdx((i) => (i + 1) % FLAVOR_TEXTS.length);
    }, 1800);

    // Navigate after 5 seconds
    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: "Start" }] });
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(flavorInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <ImageBackground
      source={require("../assets/images/LoadingScreenBG.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        {/* Loading text + percentage above crystal */}
        <View style={styles.loadingArea}>
          <Text style={styles.loadingText}>   Loading...</Text>
          <Text style={styles.flavorText}>
            {FLAVOR_TEXTS[flavorIdx]} {progress}%
          </Text>
        </View>

        {/* Crystal + glow */}
        <View style={styles.crystalArea}>
          {/* Glow ring behind crystal */}
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]}>
            <Svg width={80} height={80} viewBox="0 0 120 120">
              <Defs>
                <LinearGradient id="crystalGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#00EEFF" stopOpacity="0.6" />
                  <Stop offset="50%" stopColor="#A855F5" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#00EEFF" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Ellipse cx={60} cy={60} rx={55} ry={55} fill="none" stroke="url(#crystalGlow)" strokeWidth={3} />
              <Ellipse cx={60} cy={60} rx={40} ry={40} fill="none" stroke="#00EEFF" strokeWidth={1.5} opacity={0.4} />
            </Svg>
          </Animated.View>

          {/* Rotating crystal */}
          <Animated.View style={[styles.crystal, { transform: [{ rotate: spin }] }]}>
            <Svg width={40} height={54} viewBox="0 0 60 80">
              <Defs>
                <LinearGradient id="crystalFace1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#B8E8FF" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.7" />
                </LinearGradient>
                <LinearGradient id="crystalFace2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0.7" />
                </LinearGradient>
                <LinearGradient id="crystalFace3" x1="50%" y1="0%" x2="50%" y2="100%">
                  <Stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
                  <Stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.8" />
                </LinearGradient>
              </Defs>
              {/* Left face */}
              <Polygon points="30,2 10,30 30,78 30,30" fill="url(#crystalFace1)" />
              {/* Right face */}
              <Polygon points="30,2 50,30 30,78 30,30" fill="url(#crystalFace2)" />
              {/* Center highlight */}
              <Polygon points="30,2 22,25 30,70 38,25" fill="url(#crystalFace3)" opacity={0.5} />
              {/* Edges */}
              <Path d="M30 2 L10 30 L30 78 L50 30 Z" fill="none" stroke="#E0F7FF" strokeWidth={1} opacity={0.6} />
              <Path d="M30 2 L30 78" fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.3} />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#1A0E2E",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: H * 0.08,
  },
  crystalArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    width: 80,
    height: 80,
  },
  glowRing: {
    position: "absolute",
  },
  crystal: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingArea: {
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E0F2FE",
    letterSpacing: 2,
    textShadowColor: "#00EEFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  flavorText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#BAE6FD",
    marginTop: 4,
    textShadowColor: "#00EEFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textAlign: "center",
  },

});
