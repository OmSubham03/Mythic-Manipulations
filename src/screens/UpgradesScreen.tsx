import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "../context/GameContext";
import UPGRADES from "../constants/upgrades";
import { useColors } from "../hooks/useColors";
import { useCrackSound } from "../hooks/useCrackSound";

export default function UpgradesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useColors();
  const { playTap } = useCrackSound();
  const { coins, purchaseUpgrade, hasUpgrade } = useGame();
  const [justBought, setJustBought] = useState<string | null>(null);

  const handlePurchase = (upgradeId: string, cost: number, name: string) => {
    if (hasUpgrade(upgradeId)) return;
    if (coins < cost) {
      Alert.alert(
        "Not Enough Coins",
        `You need ${cost - coins} more coins to buy ${name}.`,
        [{ text: "OK" }]
      );
      return;
    }
    const success = purchaseUpgrade(upgradeId, cost);
    if (success) {
      setJustBought(upgradeId);
      setTimeout(() => setJustBought(null), 1500);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingBottom: 16 },
        ]}
      >
        <TouchableOpacity onPress={() => { playTap(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Clinic Upgrades
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Make your patients even happier
          </Text>
        </View>
        <View style={styles.coinsBadge}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.coinsText}>{coins}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {UPGRADES.map((upgrade) => {
          const owned = hasUpgrade(upgrade.id);
          const affordable = coins >= upgrade.cost;
          const justPurchased = justBought === upgrade.id;

          return (
            <TouchableOpacity
              key={upgrade.id}
              onPress={() => { playTap(); handlePurchase(upgrade.id, upgrade.cost, upgrade.name); }}
              activeOpacity={owned ? 1 : 0.85}
              style={[
                styles.card,
                {
                  backgroundColor: owned
                    ? colors.success + "20"
                    : colors.card,
                  borderColor: owned
                    ? colors.success
                    : affordable
                    ? upgrade.color
                    : colors.border,
                  opacity: owned || affordable ? 1 : 0.65,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: upgrade.color + "25" },
                ]}
              >
                <Ionicons
                  name={upgrade.iconName as any}
                  size={28}
                  color={upgrade.color}
                />
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardName, { color: colors.foreground }]}>
                  {upgrade.name}
                </Text>
                <Text
                  style={[
                    styles.cardDescription,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {upgrade.description}
                </Text>
                <View
                  style={[
                    styles.effectChip,
                    { backgroundColor: upgrade.color + "20" },
                  ]}
                >
                  <Text style={[styles.effectText, { color: upgrade.color }]}>
                    {upgrade.effect}
                  </Text>
                </View>
              </View>

              <View style={styles.cardRight}>
                {owned ? (
                  <View style={styles.ownedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  </View>
                ) : justPurchased ? (
                  <View style={styles.ownedBadge}>
                    <Ionicons name="sparkles" size={24} color="#FFD700" />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.priceBadge,
                      {
                        backgroundColor: affordable ? "#FFD700" : colors.muted,
                      },
                    ]}
                  >
                    <Ionicons
                      name="star"
                      size={12}
                      color={affordable ? "#3D2C1E" : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.priceText,
                        {
                          color: affordable
                            ? "#3D2C1E"
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {upgrade.cost}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.comingSoon}>
          <Ionicons name="construct" size={32} color="#C9B8A8" />
          <Text style={styles.comingSoonText}>More upgrades coming soon!</Text>
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
    gap: 12,
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
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  headerSub: {
    fontSize: 12,
  },
  coinsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFD700",
  },
  coinsText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#B8960C",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  effectChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  effectText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  ownedBadge: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  comingSoon: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  comingSoonText: {
    fontSize: 13,
    color: "#C9B8A8",
  },
});
