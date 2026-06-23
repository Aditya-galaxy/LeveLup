// Missions — list with daily/weekly/custom segment.
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStore, todayKey } from "@/src/store/levelup";
import { colors, font, radius, spacing } from "@/src/theme";
import { baseXP, missPenalty } from "@/src/domain/xp";

type Seg = "daily" | "weekly" | "custom";

export default function MissionsScreen() {
  const router = useRouter();
  const { state, completeMission, missMission, addCustomMission } = useStore();
  const [seg, setSeg] = useState<Seg>("daily");
  const [showCustom, setShowCustom] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTier, setNewTier] = useState<"primary" | "secondary" | "lifestyle">("secondary");
  const today = todayKey();
  const completedToday = new Set(
    state.completions.filter((c) => c.date === today).map((c) => c.missionId)
  );

  const list = useMemo(() => {
    if (seg === "custom") return state.missions.filter((m) => m.custom);
    return state.missions.filter((m) => !m.custom);
  }, [state.missions, seg]);

  const handleAddCustom = () => {
    if (!state.pro) {
      router.push("/paywall");
      return;
    }
    if (!newTitle.trim()) return;
    addCustomMission({
      title: newTitle.trim(),
      tier: newTier,
      category: "Discipline",
      stats: ["Discipline"],
    });
    setNewTitle("");
    setShowCustom(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Missions</Text>
        <Pressable
          testID="missions-add"
          onPress={() => setShowCustom(true)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        {(["daily", "weekly", "custom"] as Seg[]).map((s) => (
          <Pressable
            key={s}
            testID={`missions-seg-${s}`}
            onPress={() => setSeg(s)}
            style={[styles.segBtn, seg === s && styles.segActive]}
          >
            <Text style={[styles.segText, seg === s && styles.segTextActive]}>
              {s.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.muted}>
              {seg === "custom"
                ? "No custom missions. Pro unlocks user-defined directives."
                : "No missions in this tier."}
            </Text>
            {seg === "custom" && !state.pro && (
              <Pressable
                testID="missions-empty-paywall"
                style={styles.btnPrimary}
                onPress={() => router.push("/paywall")}
              >
                <Text style={styles.btnPrimaryText}>Unlock Pro</Text>
              </Pressable>
            )}
          </View>
        ) : (
          list.map((m) => {
            const done = completedToday.has(m.id);
            return (
              <View
                key={m.id}
                testID={`mission-card-${m.id}`}
                style={[styles.card, done && { borderColor: colors.success }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.tier}>
                    {m.tier.toUpperCase()} · {m.category}
                  </Text>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  <Text style={styles.cardMeta}>
                    +{baseXP(m.tier)} XP · miss {missPenalty(m.tier)} XP
                  </Text>
                  <View style={styles.btnRow}>
                    <Pressable
                      testID={`mission-complete-${m.id}`}
                      style={[styles.btnSmall, styles.btnSmallSuccess]}
                      onPress={() => !done && completeMission(m.id)}
                      disabled={done}
                    >
                      <Text style={styles.btnSmallText}>
                        {done ? "Completed" : "Complete"}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID={`mission-miss-${m.id}`}
                      style={[styles.btnSmall, styles.btnSmallDanger]}
                      onPress={() => missMission(m.id)}
                    >
                      <Text style={[styles.btnSmallText, { color: colors.error }]}>
                        Mark Missed
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showCustom} transparent animationType="slide" onRequestClose={() => setShowCustom(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Custom Mission</Text>
            <Text style={styles.modalEyebrow}>PRO FEATURE</Text>
            <TextInput
              testID="custom-mission-title"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Cold shower"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            <View style={styles.chipRow}>
              {(["primary", "secondary", "lifestyle"] as const).map((t) => (
                <Pressable
                  key={t}
                  testID={`custom-tier-${t}`}
                  onPress={() => setNewTier(t)}
                  style={[styles.chip, newTier === t && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
              <Pressable style={styles.btnSecondary} onPress={() => setShowCustom(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="custom-mission-save"
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={handleAddCustom}
              >
                <Text style={styles.btnPrimaryText}>
                  {state.pro ? "Save Mission" : "Unlock Pro"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: "500" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: radius.pill },
  segActive: { backgroundColor: colors.brand },
  segText: { color: colors.onSurfaceTertiary, fontSize: font.sm, letterSpacing: 1.2 },
  segTextActive: { color: colors.onBrand },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  muted: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: "center" },
  card: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  tier: { color: colors.onSurfaceTertiary, fontSize: font.sm, letterSpacing: 1.2 },
  cardTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500", marginTop: 4 },
  cardMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 4 },
  btnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btnSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  btnSmallSuccess: { backgroundColor: colors.success, borderColor: colors.success },
  btnSmallDanger: { borderColor: colors.error, backgroundColor: "transparent" },
  btnSmallText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "500" },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnPrimaryText: { color: colors.onBrand, fontWeight: "500", fontSize: font.lg },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  btnSecondaryText: { color: colors.onSurfaceSecondary, fontSize: font.lg },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopColor: colors.brand,
    borderTopWidth: 1,
  },
  modalTitle: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500" },
  modalEyebrow: { color: colors.brand, fontSize: font.sm, letterSpacing: 1.4, marginTop: 4 },
  input: {
    color: colors.onSurface,
    fontSize: font.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  chipRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: font.base, textTransform: "capitalize" },
});
