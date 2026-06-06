import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReputationDisplay from "../components/ReputationDisplay";
import { useGame } from "../context/GameContext";
import UPGRADES from "../constants/upgrades";
import { useColors } from "../hooks/useColors";
import { useCrackSound } from "../hooks/useCrackSound";
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
  const { playTap } = useCrackSound();
  const {
    coins,
    reputation,
    completedTreatments,
    highScore,
    totalCrackCount,
    ownedUpgrades,
    doctorName,
    avatarIndex,
    setDoctorName,
    setAvatarIndex,
  } = useGame();

  const AVATARS: { icon: string; bg: string }[] = [
    { icon: "person-circle", bg: "#FF7A5C" },
    { icon: "skull", bg: "#7C3AED" },
    { icon: "flame", bg: "#EF4444" },
    { icon: "leaf", bg: "#22C55E" },
    { icon: "snow", bg: "#3B82F6" },
    { icon: "moon", bg: "#F59E0B" },
  ];

  const RANK_NAMES = ["Newbie", "Intern", "Junior", "Specialist", "Master", "Legend"];
  const rankIndex = Math.min(5, Math.floor(reputation / 1000));
  const rankLevel = reputation >= 5000 ? Math.floor((reputation - 4000) / 200) : Math.floor((reputation % 1000) / 200) + 1;
  const stars = rankIndex;
  const levelName = RANK_NAMES[rankIndex];

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(doctorName);

  const currentAvatar = AVATARS[avatarIndex] || AVATARS[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingBottom: 20 },
        ]}
      >
        <TouchableOpacity onPress={() => { playTap(); navigation.goBack(); }} style={styles.backBtn}>
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
        {/* ID Card */}
        <View style={styles.idCard}>
          {/* Header strip */}
          <View style={styles.idHeader}>
            <Ionicons name="medical" size={16} color="#FFF" />
            <Text style={styles.idHospitalName}>Mythic Wellness Clinic</Text>
          </View>

          {/* Body */}
          <View style={styles.idBody}>
            {/* Avatar on left */}
            <View style={[styles.avatarCircle, { backgroundColor: currentAvatar.bg }]}>
              <Ionicons name={currentAvatar.icon as any} size={40} color="#FFF" />
            </View>

            {/* Info on right */}
            <View style={styles.idInfo}>
              <Text style={[styles.idDrName, { color: colors.foreground }]}>
                Dr {doctorName || "Unknown"}
              </Text>
              <Text style={[styles.idLevel, { color: colors.mutedForeground }]}>
                Lvl {rankLevel} • {levelName}
              </Text>
              <View style={styles.idStars}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= stars ? "star" : "star-outline"}
                    size={16}
                    color={i <= stars ? "#FFD700" : "rgba(0,0,0,0.15)"}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Action buttons below card */}
        <View style={styles.idActions}>
          <TouchableOpacity
            style={[styles.idActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { playTap(); setShowAvatarPicker(true); }}
          >
            <Ionicons name="image-outline" size={18} color={colors.foreground} />
            <Text style={[styles.idActionText, { color: colors.foreground }]}>Change Avatar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.idActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { playTap(); setNameInput(doctorName); setShowNameModal(true); }}
          >
            <Ionicons name="create-outline" size={18} color={colors.foreground} />
            <Text style={[styles.idActionText, { color: colors.foreground }]}>Change Name</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Picker Modal */}
        <Modal visible={showAvatarPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((av, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { playTap(); setAvatarIndex(i); setShowAvatarPicker(false); }}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: av.bg },
                      avatarIndex === i && styles.avatarSelected,
                    ]}
                  >
                    <Ionicons name={av.icon as any} size={32} color="#FFF" />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Name Change Modal */}
        <Modal visible={showNameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Change Name</Text>
              <TextInput
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter name"
                placeholderTextColor={colors.mutedForeground}
                maxLength={20}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity onPress={() => setShowNameModal(false)} style={styles.modalCancel}>
                  <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const trimmed = nameInput.trim();
                    if (trimmed.length > 0) {
                      setDoctorName(trimmed);
                      setShowNameModal(false);
                    }
                  }}
                  style={styles.modalSaveBtn}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Your Stats
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="cash-outline"
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
            icon="ribbon-outline"
            label="Reputation"
            value={reputation}
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
              Next Rank Level
            </Text>
            <Text style={[styles.progressValue, { color: colors.foreground }]}>
              {rankIndex < 5 ? `${(rankIndex * 1000 + rankLevel * 200) - reputation} more rep` : `Legend Lvl ${rankLevel}`}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (reputation / 5000) * 100)}%` as `${number}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
            Reputation: {reputation}
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
  idCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E8D8C4",
    backgroundColor: "#FFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  idHeader: {
    backgroundColor: "#FF7A5C",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  idHospitalName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  idBody: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  idInfo: {
    flex: 1,
    gap: 4,
  },
  idDrName: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  idLevel: {
    fontSize: 13,
  },
  idStars: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  idFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E8D8C4",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  idActions: {
    flexDirection: "row",
    gap: 10,
  },
  idActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  idActionText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarSelected: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  nameInput: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  modalSaveBtn: {
    backgroundColor: "#FF7A5C",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSaveText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700" as const,
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
