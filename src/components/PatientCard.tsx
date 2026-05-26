import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PatientConfig } from "../constants/patients";
import { useColors } from "../hooks/useColors";

interface PatientCardProps {
  patient: PatientConfig;
  index: number;
  onPress: () => void;
}

const KINGDOM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Rock Kingdom": "diamond",
  "Wind Kingdom": "cloud",
  "Fire Kingdom": "flame",
  "Ice Kingdom": "snow",
};

export default function PatientCard({ patient, index, onPress }: PatientCardProps) {
  const colors = useColors();
  const icon = KINGDOM_ICONS[patient.kingdom] ?? "paw";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: patient.glowColor,
          shadowColor: patient.glowColor,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: patient.bodyColor }]}>
        <Text style={styles.badgeNum}>{index + 1}</Text>
      </View>

      <View style={[styles.imageContainer, { backgroundColor: patient.bodyColor + "30" }]}>
        <Image source={patient.image} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{patient.name}</Text>
        <View style={styles.kingdomRow}>
          <Ionicons name={icon} size={12} color={patient.bodyColor} />
          <Text style={[styles.kingdom, { color: colors.mutedForeground }]}>
            {patient.kingdom}
          </Text>
        </View>
        <View style={styles.ailmentRow}>
          {patient.ailments.map((a) => (
            <View
              key={a.id}
              style={[styles.ailmentChip, { backgroundColor: patient.bodyColor + "30" }]}
            >
              <Text style={[styles.ailmentText, { color: patient.bodyColor }]}>{a.type}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.reward}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.rewardText}>{patient.baseReward}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNum: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: 52,
    height: 52,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  kingdomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kingdom: {
    fontSize: 11,
  },
  ailmentRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  ailmentChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ailmentText: {
    fontSize: 9,
    fontWeight: "700" as const,
  },
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#B8960C",
    fontFamily: "Inter_700Bold",
  },
});
