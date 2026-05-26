import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "../hooks/useColors";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function NotFoundScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Page not found
      </Text>
      <TouchableOpacity
        onPress={() => navigation.reset({ index: 0, routes: [{ name: "Lobby" }] })}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Go to Lobby</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#FF7A5C",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
    fontSize: 15,
  },
});
