// Home — rank card, XP bar, Aura, daily missions, System Alert.
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useStore, todayKey } from "@/src/store/levelup";
import {
  rankFromXP,
  rankProgress,
  levelFromXP,
  streakBonus,
  checkRankUp,
  RANK_UP_MESSAGE,
} from "@/src/domain/xp";
import { colors, font, radius, spacing } from "@/src/theme";

export default function Home() {
  const router = useRouter();
  const { state, completeMission, addAlert } = useStore();
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [rankUpMsg, setRankUpMsg] = useState<string | null>(null);

  const rank = useMemo(() => rankFromXP(state.xp), [state.xp]);
  const level = useMemo(() => levelFromXP(state.xp), [state.xp]);
  const progress = useMemo(() => rankProgress(state.xp), [state.xp]);
  const bonus = streakBonus(state.streakDays);

  // Today's 3 missions = first primary + first secondary + first lifestyle (deterministic)
  const todays = useMemo(() => {
    const primary = state.missions.find((m) => m.tier === "primary");
    const secondary = state.missions.find((m) => m.tier === "secondary");
    const lifestyle = state.missions.find((m) => m.tier === "lifestyle");
    return [primary, secondary, lifestyle].filter(Boolean) as typeof state.missions;
  }, [state.missions]);

  const today = todayKey();
  const completedToday = new Set(
    state.completions.filter((c) => c.date === today).map((c) => c.missionId)
  );

  // Generate a rule-based System Alert once per session if penalty zone or low protein.
  useEffect(() => {
    const active = state.alerts.filter((a) => !a.dismissed);
    if (active.length > 0) return;
    if (state.penaltyZone) {
      addAlert({
        category: "Discipline",
        observation: "3 consecutive missed primary missions detected",
        consequence: "Penalty Zone active — XP gain reduced 50%",
        directive: "Complete 5 consecutive missions to recover",
      });
    }
  }, [state.penaltyZone]);

  const handleComplete = (id: string) => {
    const prevXP = state.xp;
    const gain = completeMission(id);
    if (gain) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setXpToast(gain);
      setTimeout(() => setXpToast(null), 1800);
      const newXP = prevXP + gain;
      const r = checkRankUp(prevXP, newXP);
      if (r.ranked && r.to && r.from) {
        setRankUpMsg(RANK_UP_MESSAGE(r.from.code, r.to));
      }
    }
  };

  const visibleAlert = state.alerts.find((a) => !a.dismissed);
  const dailyXP = state.completions
    .filter((c) => c.date === today)
    .reduce((s, c) => s + c.xpAwarded, 0);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>SYSTEM · OPERATIONAL</Text>
            <Text style={styles.helloText}>{state.profile.name}</Text>
          </View>
          <Pressable onPress={() => router.push("/profile")} testID="home-avatar">
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.profile.name[0]}</Text>
            </View>
          </Pressable>
        </View>

        {/* Hero rank card */}
        <View style={styles.rankCard} testID="home-rank-card">
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankCode}>{rank.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName}>{rank.code}-Class {rank.name}</Text>
              <Text style={styles.rankMeta}>
                Level {level} · {state.xp} XP
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(2, progress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.metaRow}>
            <Meta label="AURA" value={state.aura} />
            <Meta label="STREAK" value={`${state.streakDays}d`} />
            <Meta
              label="MULTIPLIER"
              value={`${(rank.multiplier * bonus * (state.penaltyZone ? 0.5 : 1)).toFixed(2)}x`}
              accent={state.penaltyZone ? colors.error : undefined}
            />
          </View>
        </View>

        {/* System Alert */}
        {visibleAlert && (
          <View style={styles.alertCard} testID="home-alert">
            <Text style={styles.alertHeader}>
              SYSTEM ALERT · {visibleAlert.category.toUpperCase()}
            </Text>
            <Text style={styles.alertBody}>
              {visibleAlert.observation}. {visibleAlert.consequence}.{" "}
              <Text style={{ color: colors.onSurface }}>
                {visibleAlert.directive}.
              </Text>
            </Text>
          </View>
        )}

        {/* Daily XP */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TODAY{`’`}S XP</Text>
          <Text style={styles.dailyXP}>{dailyXP}</Text>
          <View style={styles.progressBarSmall}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (dailyXP / 400) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Today's missions */}
        <Text style={styles.sectionTitle}>Today{`’`}s Missions</Text>
        {todays.map((m) => {
          const done = completedToday.has(m.id);
          return (
            <Pressable
              key={m.id}
              testID={`home-mission-${m.id}`}
              onPress={() => !done && handleComplete(m.id)}
              style={[styles.missionCard, done && styles.missionDone]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.missionTier}>{m.tier.toUpperCase()} · {m.category}</Text>
                <Text style={[styles.missionTitle, done && styles.strike]}>{m.title}</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  done && { backgroundColor: colors.success, borderColor: colors.success },
                ]}
              >
                {done && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          testID="home-go-missions"
          style={styles.linkRow}
          onPress={() => router.push("/missions")}
        >
          <Text style={styles.linkText}>View all missions</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
        </Pressable>
      </ScrollView>

      {xpToast !== null && (
        <View style={styles.toast} testID="home-xp-toast">
          <Text style={styles.toastText}>+{xpToast} XP</Text>
        </View>
      )}

      {rankUpMsg && (
        <Pressable
          style={styles.rankUpOverlay}
          onPress={() => setRankUpMsg(null)}
          testID="rankup-overlay"
        >
          <View style={styles.rankUpCard}>
            <Text style={styles.rankUpTitle}>RANK UP</Text>
            <Text style={styles.rankUpMsg}>{rankUpMsg}</Text>
            <Text style={styles.rankUpDismiss}>Tap to dismiss</Text>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Meta({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  helloText: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  rankCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankCode: { color: colors.onSurface, fontSize: 32, fontWeight: "500" },
  rankName: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500" },
  rankMeta: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 2 },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 3 },
  metaRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.sm },
  metaLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.4 },
  metaValue: {
    color: colors.onSurface,
    fontSize: font.lg,
    fontWeight: "500",
    marginTop: 2,
  },
  alertCard: {
    marginTop: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertHeader: {
    color: colors.brand,
    fontSize: font.sm,
    letterSpacing: 1.4,
    fontWeight: "500",
    marginBottom: 4,
  },
  alertBody: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 20 },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  sectionLabel: { color: colors.onSurfaceTertiary, fontSize: font.sm, letterSpacing: 1.4 },
  dailyXP: { color: colors.onSurface, fontSize: 32, fontWeight: "500", marginTop: 4 },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: font.lg,
    fontWeight: "500",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  missionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  missionDone: { borderColor: colors.success },
  missionTier: { color: colors.onSurfaceTertiary, fontSize: font.sm, letterSpacing: 1.2 },
  missionTitle: { color: colors.onSurface, fontSize: font.lg, marginTop: 2 },
  strike: { textDecorationLine: "line-through", color: colors.onSurfaceTertiary },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  linkText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  toast: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  toastText: { color: colors.onBrand, fontWeight: "500", fontSize: font.lg },
  rankUpOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  rankUpCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderColor: colors.brand,
    borderWidth: 1,
    alignItems: "center",
    maxWidth: 340,
  },
  rankUpTitle: { color: colors.brand, fontSize: font.xl, fontWeight: "500", letterSpacing: 2 },
  rankUpMsg: {
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    marginTop: spacing.md,
    fontSize: font.lg,
    lineHeight: 24,
  },
  rankUpDismiss: { color: colors.onSurfaceTertiary, marginTop: spacing.lg, fontSize: font.sm },
});
