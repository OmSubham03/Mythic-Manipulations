import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "../context/GameContext";
import PATIENTS from "../constants/patients";
import { useColors } from "../hooks/useColors";
import { useCrackSound } from "../hooks/useCrackSound";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function MonsterCollectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const { playTap } = useCrackSound();
  const { treatmentHistory } = useGame();

  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Build per-monster stats
  const monsterStats = useMemo(() => {
    const map: Record<string, { count: number; records: { ailments: string[]; timestamp: number }[] }> = {};
    for (const rec of treatmentHistory) {
      if (!map[rec.patientType]) {
        map[rec.patientType] = { count: 0, records: [] };
      }
      map[rec.patientType].count += 1;
      map[rec.patientType].records.push({ ailments: rec.ailments, timestamp: rec.timestamp });
    }
    return map;
  }, [treatmentHistory]);

  const selectedPatient = selectedType ? PATIENTS.find((p) => p.type === selectedType) : null;
  const selectedRecords = selectedType ? monsterStats[selectedType]?.records || [] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { playTap(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Monster Collection</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {Object.keys(monsterStats).length}/{PATIENTS.length} discovered
        </Text>

        <View style={styles.grid}>
          {PATIENTS.map((patient) => {
            const stats = monsterStats[patient.type];
            const treated = !!stats;
            return (
              <TouchableOpacity
                key={patient.type}
                style={[
                  styles.card,
                  {
                    backgroundColor: treated ? colors.card : "rgba(0,0,0,0.05)",
                    borderColor: treated ? patient.accentColor : colors.border,
                  },
                ]}
                onPress={() => {
                  if (treated) {
                    playTap();
                    setSelectedType(patient.type);
                  }
                }}
                activeOpacity={treated ? 0.7 : 1}
              >
                <View style={[styles.iconCircle, { backgroundColor: treated ? patient.accentColor + "25" : "rgba(0,0,0,0.08)" }]}>
                  {treated ? (
                    <Text style={styles.monsterEmoji}>{getMonsterIcon(patient.type)}</Text>
                  ) : (
                    <Ionicons name="help-outline" size={28} color={colors.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.cardName, { color: treated ? colors.foreground : colors.mutedForeground }]}>
                  {treated ? patient.name : "???"}
                </Text>
                <Text style={[styles.cardCount, { color: treated ? patient.accentColor : colors.mutedForeground }]}>
                  {treated ? `×${stats.count}` : "—"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedType} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {selectedPatient && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconCircle, { backgroundColor: selectedPatient.accentColor + "25" }]}>
                    <Text style={styles.modalEmoji}>{getMonsterIcon(selectedPatient.type)}</Text>
                  </View>
                  <View style={styles.modalInfo}>
                    <Text style={[styles.modalName, { color: colors.foreground }]}>{selectedPatient.name}</Text>
                    <Text style={[styles.modalKingdom, { color: colors.mutedForeground }]}>{selectedPatient.kingdom}</Text>
                    <Text style={[styles.modalCount, { color: selectedPatient.accentColor }]}>
                      Treated {monsterStats[selectedPatient.type]?.count || 0} times
                    </Text>
                  </View>
                </View>

                <Text style={[styles.modalSection, { color: colors.foreground }]}>Treatment History</Text>

                <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
                  {selectedRecords.map((rec, i) => (
                    <View key={i} style={[styles.historyRow, { borderColor: colors.border }]}>
                      <View style={styles.historyLeft}>
                        <Text style={[styles.historyIdx, { color: colors.mutedForeground }]}>#{i + 1}</Text>
                        <View>
                          <Text style={[styles.historyAilments, { color: colors.foreground }]}>
                            {rec.ailments.join(", ")}
                          </Text>
                          <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                            {formatTimestamp(rec.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              onPress={() => { playTap(); setSelectedType(null); }}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getMonsterIcon(type: string): string {
  switch (type) {
    case "GOLEM": return "🪨";
    case "HARPY": return "🦅";
    case "EMBER_KITTEN": return "🐱";
    case "ICE_YETI": return "❄️";
    case "MUSHROOM_SPRITE": return "🍄";
    case "MINI_DRAGON": return "🐉";
    case "CRYSTAL_DEER": return "🦌";
    case "LAVA_BLOB": return "🌋";
    case "MOON_BUNNY": return "🐰";
    case "SNOW_LION": return "🦁";
    case "GREEN_DEER": return "🌿";
    default: return "❓";
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const mon = (d.getMonth() + 1).toString().padStart(2, "0");
  const hr = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${mon} ${hr}:${min}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D8C4",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { padding: 16, gap: 12 },
  subtitle: { fontSize: 13, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  monsterEmoji: { fontSize: 26 },
  cardName: { fontSize: 14, fontWeight: "600" },
  cardCount: { fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "75%",
  },
  modalHeader: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 16 },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmoji: { fontSize: 30 },
  modalInfo: { flex: 1, gap: 2 },
  modalName: { fontSize: 20, fontWeight: "700" },
  modalKingdom: { fontSize: 13 },
  modalCount: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  modalSection: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  historyScroll: { maxHeight: 300 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyLeft: { flexDirection: "row", gap: 10, alignItems: "center", flex: 1 },
  historyIdx: { fontSize: 13, fontWeight: "600", width: 28 },
  historyAilments: { fontSize: 13, fontWeight: "500" },
  historyTime: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "600" },
});
