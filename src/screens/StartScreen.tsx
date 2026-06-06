import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useCrackSound } from "../hooks/useCrackSound";

const { width: W, height: H } = Dimensions.get("window");

// Door position calibrated to the background image's white doorway area
// The doorway in the background sits roughly:
//   top: 51% of height, bottom: 72% of height
//   left: 20% of width,  right: 80% of width
const DOOR_TOP = H * 0.52;
const DOOR_HEIGHT = H * 0.21;
const DOOR_TOTAL_WIDTH = W * 0.58;
const DOOR_LEFT_EDGE = W * 0.21;
const DOOR_HALF = DOOR_TOTAL_WIDTH / 2;

export default function StartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Start">>();
  const { playTap } = useCrackSound();
  const fromLobby = route.params?.fromLobby ?? false;

  const [started, setStarted] = useState(false);
  const [introComplete, setIntroComplete] = useState(!fromLobby);

  // Door slide animations (0 = closed)
  const leftDoorX = useRef(new Animated.Value(fromLobby ? -DOOR_HALF * 0.45 : 0)).current;
  const rightDoorX = useRef(new Animated.Value(fromLobby ? DOOR_HALF * 0.45 : 0)).current;

  // Zoom + fade to white
  const zoomScale = useRef(new Animated.Value(fromLobby ? 5 : 1)).current;
  const whiteOverlay = useRef(new Animated.Value(fromLobby ? 1 : 0)).current;

  // Reverse intro: zoom out from white, doors close
  useEffect(() => {
    if (!fromLobby) return;
    // White fades out first, then zoom out + doors close
    Animated.sequence([
      Animated.timing(whiteOverlay, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(zoomScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftDoorX, {
          toValue: 0,
          duration: 1000,
          delay: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rightDoorX, {
          toValue: 0,
          duration: 1000,
          delay: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setIntroComplete(true);
    });
  }, [fromLobby]);

  // Play button pulse
  const btnPulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePlay = useCallback(() => {
    if (started) return;
    setStarted(true);
    playTap();

    // Doors open partially + zoom + white fade all together
    Animated.parallel([
      // Doors slide open just a little
      Animated.timing(leftDoorX, {
        toValue: -DOOR_HALF * 0.45,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rightDoorX, {
        toValue: DOOR_HALF * 0.45,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      // Zoom into the doorway simultaneously
      Animated.timing(zoomScale, {
        toValue: 5,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      // White fade starts slightly after
      Animated.timing(whiteOverlay, {
        toValue: 1,
        duration: 600,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
    });
  }, [started, navigation, playTap]);

  // Zoom pivot point: center of the doorway
  const PIVOT_X = DOOR_LEFT_EDGE + DOOR_HALF - W / 2;
  const PIVOT_Y = DOOR_TOP + DOOR_HEIGHT / 2 - H / 2;

  const zoomTranslateX = zoomScale.interpolate({
    inputRange: [1, 5],
    outputRange: [0, -PIVOT_X * 4],
  });
  const zoomTranslateY = zoomScale.interpolate({
    inputRange: [1, 5],
    outputRange: [0, -PIVOT_Y * 4],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.sceneWrap,
          {
            transform: [
              { translateX: zoomTranslateX },
              { translateY: zoomTranslateY },
              { scale: zoomScale },
            ],
          },
        ]}
      >
        {/* Background */}
        <ImageBackground
          source={require("../assets/images/UI/StartScreen_background.jpg")}
          style={styles.bg}
          resizeMode="cover"
        >
          {/* Left door */}
          <Animated.View
            style={[
              styles.door,
              styles.leftDoor,
              { transform: [{ translateX: leftDoorX }] },
            ]}
          >
            <Image
              source={require("../assets/images/UI/Left_door.png")}
              style={styles.doorImage}
              resizeMode="stretch"
            />
          </Animated.View>

          {/* Right door */}
          <Animated.View
            style={[
              styles.door,
              styles.rightDoor,
              { transform: [{ translateX: rightDoorX }] },
            ]}
          >
            <Image
              source={require("../assets/images/UI/right_door.png")}
              style={styles.doorImage}
              resizeMode="stretch"
            />
          </Animated.View>
        </ImageBackground>
      </Animated.View>

      {/* Play button — 20% from bottom */}
      {!started && introComplete && (
        <Animated.View
          style={[
            styles.playBtnWrap,
            { transform: [{ scale: btnPulse }] },
          ]}
        >
          <TouchableOpacity activeOpacity={0.85} onPress={handlePlay}>
            <Image
              source={require("../assets/images/UI/Game_button.jpg")}
              style={styles.playBtnImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* White overlay for zoom transition */}
      <Animated.View
        style={[
          styles.whiteOverlay,
          { opacity: whiteOverlay },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  sceneWrap: {
    flex: 1,
  },
  bg: {
    flex: 1,
  },
  // Doors positioned over the white doorway area in the background
  door: {
    position: "absolute",
    top: DOOR_TOP,
    width: DOOR_HALF,
    height: DOOR_HEIGHT,
  },
  leftDoor: {
    left: DOOR_LEFT_EDGE,
  },
  rightDoor: {
    left: DOOR_LEFT_EDGE + DOOR_HALF * 0.9,
  },
  doorImage: {
    width: "100%",
    height: "100%",
  },
  // Play button at 20% from bottom
  playBtnWrap: {
    position: "absolute",
    bottom: H * 0.10,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  playBtnImage: {
    width: W * 0.55,
    height: W * 0.55 * 0.35, // aspect ratio of the button image (~3:1)
    borderRadius: 16,
  },
  whiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFF",
    zIndex: 20,
  },
});
