// Home — glassmorphic dashboard.
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
import { LinearGradient } from "expo-linear-gradient";

import { useStore, todayKey } from "@/src/store/levelup";
import {
  rankFromXP,
  rankProgress,
  levelFromXP,
  streakBonus,
  checkRankUp,
  RANK_UP_MESSAGE,
} from "@/src/domain/xp";
import { GlassCard, ProgressBar, StatusPill } from "@/src/components/Glass";
import { fireRankUpAlert } from "@/src/notifications";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function Home() {
  const router = useRouter();
  const { state, completeMission, addAlert } = useStore();
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [rankUpMsg, setRankUpMsg] = useState<string | null>(null);

  const rank = useMemo(() => rankFromXP(state.xp), [state.xp]);
  const level = useMemo(() => levelFromXP(state.xp), [state.xp]);
  const progress = useMemo(() => rankProgress(state.xp), [state.xp]);
  const bonus = streakBonus(state.streakDays);

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

  useEffect(() => {
    const active = state.alerts.filter((a) => !a.dismissed);
    if (active.length > 0) return;
    if (state.penaltyZone) {
      addAlert({
        category: "Recovery",
        observation: "3 consecutive missed primary missions detected",
        consequence: "Penalty Zone active — XP multiplier reduced 50%",
        directive: "Complete 5 consecutive missions to recover",
      });
    }
  }, [state.penaltyZone]);

  // weekly calendar strip (last 7 incl. today)
  const weekStrip = useMemo(() => {
    const out: { date: string; done: boolean; isToday: boolean; weekday: string }[] = [];
    const now = new Date();
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const done = state.completions.some((c) => c.date === k);
      out.push({
        date: k,
        done,
        isToday: i === 0,
        weekday: days[d.getDay()],
      });
    }
    return out;
  }, [state.completions]);

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
        fireRankUpAlert(r.to.code).catch(() => {});
      }
    }
  };

  const visibleAlert = state.alerts.find((a) => !a.dismissed);
  const dailyXP = state.completions
    .filter((c) => c.date === today)
    .reduce((s, c) => s + c.xpAwarded, 0);
  const totalMult = (rank.multiplier * bonus * (state.penaltyZone ? 0.5 : 1)).toFixed(2);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Ambient accent glow */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={["rgba(83,74,183,0.28)", "rgba(83,74,183,0)"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.wordmark}>LEVELUP</Text>
            <Text style={styles.helloText}>{state.profile.name}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            testID="home-avatar"
            style={styles.avatarWrap}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.profile.name[0]}</Text>
            </View>
          </Pressable>
        </View>

        {/* Hunter card */}
        <GlassCard elevated testID="home-rank-card" style={{ marginTop: spacing.lg }}>
          <View style={styles.hunterTop}>
            <View style={styles.rankBadge}>
              <LinearGradient
                colors={["rgba(83,74,183,0.55)", "rgba(83,74,183,0.18)"]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.rankCode}>{rank.code}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text style={styles.hunterEyebrow}>HUNTER</Text>
              <Text style={styles.hunterName}>{rank.name}</Text>
              <Text style={styles.hunterMeta}>
                Level {level} · {state.xp.toLocaleString()} XP
              </Text>
            </View>
            <StatusPill label={state.pro ? "PRO" : "FREE"} tone={state.pro ? "accent" : "neutral"} small />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <ProgressBar progress={progress} height={8} />
            <View style={styles.xpFooter}>
              <Text style={styles.metaSmall}>{Math.round(progress * 100)}% to next rank</Text>
              <Text style={styles.metaSmall}>
                {state.xp} / {isFinite(rank.max) ? rank.max + 1 : "∞"}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <Meta label="AURA" value={state.aura} />
            <View style={styles.metaSep} />
            <Meta label="STREAK" value={`${state.streakDays}d`} />
            <View style={styles.metaSep} />
            <Meta
              label="MULTIPLIER"
              value={`${totalMult}×`}
              accent={state.penaltyZone ? colors.danger : colors.text}
            />
          </View>
        </GlassCard>

        {/* Week strip */}
        <View style={styles.weekStrip}>
          {weekStrip.map((d, i) => (
            <View key={i} style={styles.weekItem}>
              <Text style={styles.weekLabel}>{d.weekday}</Text>
              <View
                style={[
                  styles.weekDot,
                  d.done && styles.weekDotDone,
                  d.isToday && styles.weekDotToday,
                ]}
              >
                {d.done && <Ionicons name="checkmark" size={14} color="#0B0C12" />}
              </View>
            </View>
          ))}
        </View>

        {/* System Alert */}
        {visibleAlert && (
          <GlassCard
            testID="home-alert"
            style={styles.alertCard}
            borderColor="rgba(83,74,183,0.45)"
          >
            <View style={styles.alertHeader}>
              <Ionicons name="warning-outline" size={14} color="#C9C3FF" />
              <Text style={styles.alertHeaderText}>
                SYSTEM ALERT · {visibleAlert.category.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.alertBody}>
              {visibleAlert.observation}.{" "}
              <Text style={{ color: colors.textSecondary }}>
                {visibleAlert.consequence}.
              </Text>{" "}
              <Text style={{ color: colors.text }}>
                {visibleAlert.directive}.
              </Text>
            </Text>
          </GlassCard>
        )}

        {/* Today's metric tiles */}
        <View style={styles.tileRow}>
          <GlassCard style={styles.tile}>
            <Text style={styles.tileLabel}>TODAY{`’`}S XP</Text>
            <Text style={styles.tileMetric}>{dailyXP}</Text>
            <ProgressBar progress={Math.min(1, dailyXP / 400)} height={4} />
          </GlassCard>
          <GlassCard style={styles.tile}>
            <Text style={styles.tileLabel}>COMPLETED</Text>
            <Text style={styles.tileMetric}>
              {completedToday.size}
              <Text style={styles.tileMetricSmall}>/{todays.length}</Text>
            </Text>
            <ProgressBar
              progress={todays.length ? completedToday.size / todays.length : 0}
              height={4}
              color={colors.success}
            />
          </GlassCard>
        </View>

        {/* Start session CTA */}
        <Pressable
          testID="home-start-session"
          onPress={() => router.push("/session")}
          style={styles.sessionCTA}
        >
          <LinearGradient
            colors={["#FFFFFF", "#D9D9E3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sessionCTAInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionCTALabel}>TODAY · GUIDED SESSION</Text>
              <Text style={styles.sessionCTATitle}>Start training</Text>
              <Text style={styles.sessionCTAMeta}>
                {state.profile.onboarding?.sessionLength || 45} min · timed steps · AI Coach
              </Text>
            </View>
            <View style={styles.sessionCTAIcon}>
              <Ionicons name="play" size={24} color="#0B0C12" />
            </View>
          </View>
        </Pressable>

        {/* Missions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today{`’`}s Missions</Text>
          <Pressable
            testID="home-go-missions"
            onPress={() => router.push("/missions")}
          >
            <Text style={styles.linkText}>View all</Text>
          </Pressable>
        </View>

        {todays.map((m) => {
          const done = completedToday.has(m.id);
          const tone =
            m.tier === "primary" ? "accent" : m.tier === "secondary" ? "neutral" : "neutral";
          return (
            <Pressable
              key={m.id}
              testID={`home-mission-${m.id}`}
              onPress={() => !done && handleComplete(m.id)}
            >
              <GlassCard
                elevated={m.tier === "primary"}
                style={[styles.missionCard, done && styles.missionDone]}
                borderColor={done ? "rgba(29,158,117,0.45)" : undefined}
              >
                <View style={styles.missionTop}>
                  <StatusPill label={m.tier.toUpperCase()} tone={tone} small />
                  <Text style={styles.missionCategory}>{m.category}</Text>
                </View>
                <View style={styles.missionBody}>
                  <Text style={[styles.missionTitle, done && styles.strike]}>
                    {m.title}
                  </Text>
                  <View
                    style={[
                      styles.checkbox,
                      done && {
                        backgroundColor: colors.success,
                        borderColor: colors.success,
                      },
                    ]}
                  >
                    {done && <Ionicons name="checkmark" size={18} color="#0B0C12" />}
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
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
          <GlassCard elevated style={styles.rankUpCard} borderColor="rgba(83,74,183,0.55)">
            <Text style={styles.rankUpTitle}>RANK UP</Text>
            <Text style={styles.rankUpMsg}>{rankUpMsg}</Text>
            <Text style={styles.rankUpDismiss}>Tap to dismiss</Text>
          </GlassCard>
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
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  glowWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
  glow: { flex: 1, opacity: 0.7 },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordmark: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "700",
  },
  helloText: {
    ...typography.title,
    color: colors.text,
    marginTop: 2,
  },
  avatarWrap: { padding: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  avatarText: { color: colors.text, fontSize: 17, fontWeight: "600" },
  hunterTop: { flexDirection: "row", alignItems: "center" },
  rankBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.55)",
  },
  rankCode: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  hunterEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  hunterName: {
    ...typography.cardTitle,
    color: colors.text,
    marginTop: 2,
  },
  hunterMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  xpFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaSmall: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  metaGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  metaCell: { flex: 1 },
  metaSep: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.glassBorder,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  metaValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  weekItem: { alignItems: "center", flex: 1 },
  weekLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 6,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  weekDotToday: { borderColor: colors.accent, borderWidth: 1.5 },
  alertCard: { marginTop: spacing.lg },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  alertHeaderText: {
    color: "#C9C3FF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  alertBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  tileRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  tile: { flex: 1 },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  tileMetric: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 6,
    fontVariant: ["tabular-nums"],
  },
  tileMetricSmall: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  linkText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  missionCard: { marginBottom: spacing.md },
  missionDone: {},
  missionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  missionCategory: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  missionBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  missionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    paddingRight: spacing.md,
  },
  strike: { textDecorationLine: "line-through", color: colors.textMuted },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderColor: colors.glassBorderStrong,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  toastText: { color: "#0B0C12", fontWeight: "700", fontSize: 15 },
  rankUpOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3,4,7,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  rankUpCard: { maxWidth: 340, alignItems: "center" },
  rankUpTitle: {
    color: "#C9C3FF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 3,
  },
  rankUpMsg: {
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  rankUpDismiss: {
    color: colors.textMuted,
    marginTop: spacing.lg,
    fontSize: 12,
  },
  sessionCTA: {
    marginTop: spacing.xl,
    height: 92,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#fff",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  sessionCTAInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sessionCTALabel: {
    color: "#3E378A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  sessionCTATitle: {
    color: "#0B0C12",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  sessionCTAMeta: {
    color: "#3E378A",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  sessionCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0B0C12",
    alignItems: "center",
    justifyContent: "center",
  },
});
