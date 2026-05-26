import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReputationDisplay from "../components/ReputationDisplay";
import { useGame } from "../context/GameContext";
import UPGRADES from "../constants/upgrades";
import { useColors } from "../hooks/useColors";
import type { RootStackParamList } from "../navigation/AppNavigator";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const {
    coins,
    reputation,
    completedTreatments,
    highScore,
    totalCrackCount,
    ownedUpgrades,
  } = useGame();

  const clinicLevel = Math.floor(completedTreatments / 5) + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingBottom: 20 },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Clinic Profile
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.clinicCard, { backgroundColor: "#FF7A5C" }]}>
          <View style={styles.clinicIconRing}>
            <Ionicons name="medical" size={36} color="#FF7A5C" />
          </View>
          <Text style={styles.clinicName}>Mythic Wellness Clinic</Text>
          <Text style={styles.clinicLevel}>Level {clinicLevel} Practice</Text>
          <View style={styles.repRow}>
            <ReputationDisplay value={reputation} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Your Stats
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="star"
            label="Coins"
            value={coins}
            color="#FFD700"
            bg="rgba(255,215,0,0.15)"
          />
          <StatCard
            icon="heart"
            label="Treated"
            value={completedTreatments}
            color="#FF7A5C"
            bg="rgba(255,122,92,0.12)"
          />
          <StatCard
            icon="flash"
            label="Total Cracks"
            value={totalCrackCount}
            color="#7ECEC4"
            bg="rgba(126,206,196,0.15)"
          />
          <StatCard
            icon="trophy"
            label="High Score"
            value={highScore}
            color="#FFD166"
            bg="rgba(255,209,102,0.15)"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Owned Upgrades
        </Text>
        {ownedUpgrades.length === 0 ? (
          <View style={[styles.emptyUpgrades, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="construct-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No upgrades yet
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Upgrades")}
              style={styles.shopBtn}
            >
              <Text style={styles.shopBtnText}>Visit Upgrade Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.upgradesList}>
            {ownedUpgrades.map((uid) => {
              const upgrade = UPGRADES.find((u) => u.id === uid);
              if (!upgrade) return null;
              return (
                <View
                  key={uid}
                  style={[
                    styles.upgradeChip,
                    { backgroundColor: upgrade.color + "20", borderColor: upgrade.color },
                  ]}
                >
                  <Ionicons
                    name={upgrade.iconName as any}
                    size={16}
                    color={upgrade.color}
                  />
                  <Text style={[styles.upgradeChipText, { color: upgrade.color }]}>
                    {upgrade.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Progress
        </Text>
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              Next Level
            </Text>
            <Text style={[styles.progressValue, { color: colors.foreground }]}>
              {5 - (completedTreatments % 5)} more treatments
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((completedTreatments % 5) / 5) * 100}%` as `${number}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
            {completedTreatments} total treatments completed
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D8C4",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  clinicCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#FF7A5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  clinicIconRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  clinicLevel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  repRow: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: -4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  emptyUpgrades: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
  },
  shopBtn: {
    backgroundColor: "#FF7A5C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  shopBtnText: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
    fontSize: 13,
  },
  upgradesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  upgradeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  upgradeChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  progressCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressSub: {
    fontSize: 11,
    textAlign: "center",
  },
});
