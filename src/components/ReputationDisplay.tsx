import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ReputationDisplayProps {
  value: number;
}

export default function ReputationDisplay({ value }: ReputationDisplayProps) {
  const stars = Math.round((value / 5000) * 5);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= stars ? "star" : "star-outline"}
          size={14}
          color={i <= stars ? "#FFD700" : "#C9B8A8"}
        />
      ))}
      <Text style={styles.label}>Rep</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.3)",
  },
  label: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#8B7355",
    marginLeft: 2,
  },
});
