// Guided session player — one step at a time, timer, pause, breaks.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useStore } from "@/src/store/levelup";
import { api } from "@/src/api";
import { rankFromXP, checkRankUp, RANK_UP_MESSAGE } from "@/src/domain/xp";
import {
  buildSession,
  SessionStep,
  formatMMSS,
  todayDayIndex,
} from "@/src/domain/session";
import { GlassCard, GlassButton, ProgressBar, StatusPill } from "@/src/components/Glass";
import { colors, radius, spacing, typography } from "@/src/theme";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

export default function SessionPlayer() {
  const router = useRouter();
  const { state, setState, completeMission, saveActiveSession } = useStore();
  const onb = state.profile.onboarding || ({} as any);
  const sessionLengthMin = onb.sessionLength || 45;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(true);
  const [showQuit, setShowQuit] = useState(false);
  const [done, setDone] = useState(false);
  const [rankUpMsg, setRankUpMsg] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  // Build / fetch plan once. Resume active session if any.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Try resume first
        const active = state.activeSession;
        if (
          active &&
          Array.isArray(active.steps) &&
          active.steps.length > 0 &&
          active.sessionDayKey === TODAY_KEY()
        ) {
          if (!alive) return;
          setSteps(active.steps as SessionStep[]);
          setIdx(Math.min(active.idx, active.steps.length - 1));
          setRemaining(active.remaining);
          setResumed(true);
          setLoading(false);
          return;
        }
        // Fresh: load plan + build
        let plan = state.workoutPlan;
        if (!plan) {
          const rank = rankFromXP(state.xp);
          const payload = {
            goal: onb.goal || "General Fitness",
            rank: rank.code,
            equipment: onb.equipment || ["Bodyweight only"],
            daysPerWeek: onb.trainingDays || 4,
            sessionLength: sessionLengthMin,
            movementLiteracy: onb.literacy || {},
            nutritionTargets: {
              calories: onb.calorieTarget || 2200,
              protein: onb.proteinTarget || 140,
            },
            recentCompletions: state.completions.slice(-10).map((c) => c.missionId),
          };
          const res = await api.generatePlan(payload, state.appUserId);
          plan = res.plan;
          if (alive && plan) setState({ workoutPlan: plan });
        }
        if (!plan || !plan.days?.length) {
          setError("No plan available. Try regenerating from Profile.");
          return;
        }
        const dayIndex = todayDayIndex(plan.days.length);
        const day = plan.days[dayIndex];
        const session = buildSession(day, sessionLengthMin);
        if (alive) {
          setSteps(session.steps);
          setRemaining(session.steps[0]?.duration || 0);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load session.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist active session on every tick / change (debounced via remaining state).
  useEffect(() => {
    if (loading || done || steps.length === 0) return;
    saveActiveSession({
      steps,
      idx,
      remaining,
      startedAt: Date.now(),
      sessionDayKey: TODAY_KEY(),
    });
  }, [idx, remaining, steps, loading, done]);

  // Tick timer
  useEffect(() => {
    if (paused || loading || done || steps.length === 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // advance
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          advance();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, loading, done, steps.length, idx]);

  // Soft tick haptic last 3s
  useEffect(() => {
    if (paused || remaining > 3 || remaining <= 0) return;
    Haptics.selectionAsync().catch(() => {});
  }, [remaining, paused]);

  function advance() {
    setIdx((i) => {
      const next = i + 1;
      if (next >= steps.length) {
        finishSession();
        return i;
      }
      setRemaining(steps[next].duration);
      return next;
    });
  }

  function skipBack() {
    setIdx((i) => {
      const prev = Math.max(0, i - 1);
      setRemaining(steps[prev].duration);
      return prev;
    });
  }

  function togglePause() {
    Haptics.selectionAsync().catch(() => {});
    setPaused((p) => !p);
  }

  function finishSession() {
    setDone(true);
    setPaused(true);
    saveActiveSession(null);
    // Find the primary mission and complete it.
    const primary = state.missions.find((m) => m.tier === "primary");
    if (primary) {
      const today = new Date().toISOString().slice(0, 10);
      const alreadyDone = state.completions.some(
        (c) => c.missionId === primary.id && c.date === today
      );
      if (!alreadyDone) {
        const prevXP = state.xp;
        const gain = completeMission(primary.id);
        if (gain) {
          const r = checkRankUp(prevXP, prevXP + gain);
          if (r.ranked && r.to && r.from) {
            setRankUpMsg(RANK_UP_MESSAGE(r.from.code, r.to));
          }
        }
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function quit() {
    setShowQuit(false);
    saveActiveSession(null);
    router.back();
  }

  // ----- Render -----
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Compiling today's routine…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centerBox}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={styles.muted}>{error}</Text>
          <GlassButton label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }
  if (done) {
    return <SessionComplete onClose={() => router.back()} rankUpMsg={rankUpMsg} />;
  }

  const step = steps[idx];
  const total = steps.length;
  const progress = (idx + (step.duration - remaining) / Math.max(1, step.duration)) / total;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Ambient glow color shifts by step kind */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={
            step.kind === "rest"
              ? ["rgba(29,158,117,0.32)", "rgba(29,158,117,0)"]
              : step.kind === "warmup" || step.kind === "cooldown"
              ? ["rgba(245,165,36,0.28)", "rgba(245,165,36,0)"]
              : ["rgba(83,74,183,0.42)", "rgba(83,74,183,0)"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glow}
        />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable testID="session-quit" onPress={() => setShowQuit(true)} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.topMeta}>
          <Text style={styles.topMetaLabel}>STEP {idx + 1} / {total}</Text>
          <Text style={styles.topMetaTitle}>
            {step.kind === "work"
              ? "Work"
              : step.kind === "rest"
              ? "Rest"
              : step.kind === "warmup"
              ? "Warmup"
              : "Cooldown"}
          </Text>
        </View>
        <StatusPill
          label={
            step.kind === "rest"
              ? "BREAK"
              : step.kind === "work"
              ? "FOCUS"
              : "PREP"
          }
          tone={step.kind === "rest" ? "success" : step.kind === "work" ? "accent" : "warning"}
          small
        />
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar progress={Math.min(1, progress)} height={3} />
      </View>

      {/* Main step card */}
      <View style={styles.body}>
        <StepBody step={step} />

        {/* Big timer */}
        <View style={styles.timerWrap}>
          <CircularPulse paused={paused} accent={step.kind === "rest" ? colors.success : colors.accent} />
          <Text style={styles.timer}>{formatMMSS(remaining)}</Text>
          <Text style={styles.timerLabel}>
            {paused ? "Paused" : step.kind === "rest" ? "Recovering" : "In progress"}
          </Text>
        </View>

        {/* Up next preview */}
        {idx + 1 < steps.length && (
          <GlassCard style={styles.upNext}>
            <Text style={styles.upNextLabel}>UP NEXT</Text>
            <Text style={styles.upNextText}>
              {previewName(steps[idx + 1])}
            </Text>
          </GlassCard>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Pressable
          testID="session-prev"
          onPress={skipBack}
          style={[styles.iconBtn, idx === 0 && { opacity: 0.4 }]}
          disabled={idx === 0}
        >
          <Ionicons name="play-skip-back" size={20} color={colors.text} />
        </Pressable>

        <Pressable
          testID="session-pause"
          onPress={togglePause}
          style={styles.playBtn}
        >
          <LinearGradient
            colors={[colors.text, "#E6E6F0"]}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name={paused ? "play" : "pause"}
            size={32}
            color="#0B0C12"
          />
        </Pressable>

        <Pressable
          testID="session-next"
          onPress={advance}
          style={styles.iconBtn}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Quit confirm */}
      <Modal visible={showQuit} transparent animationType="fade">
        <View style={styles.modalRoot}>
          <GlassCard elevated style={styles.modalCard}>
            <Text style={styles.modalTitle}>End session?</Text>
            <Text style={styles.muted}>
              Progress on this session will be discarded.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
              <GlassButton label="Resume" variant="ghost" onPress={() => setShowQuit(false)} style={{ flex: 1 }} />
              <GlassButton label="End" variant="danger" onPress={quit} testID="session-quit-confirm" style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function previewName(s: SessionStep): string {
  if (s.kind === "work") return `${s.exerciseName} · Set ${s.setIndex}/${s.totalSets}`;
  if (s.kind === "rest") return `Rest ${formatMMSS(s.duration)}`;
  if (s.kind === "warmup") return `Warmup · ${s.detail}`;
  return `Cooldown · ${s.title}`;
}

function StepBody({ step }: { step: SessionStep }) {
  if (step.kind === "work") {
    return (
      <View style={styles.stepBody}>
        <Text style={styles.eyebrow}>
          SET {step.setIndex} / {step.totalSets}
        </Text>
        <Text style={styles.stepTitle} testID="session-step-title">{step.exerciseName}</Text>
        <View style={styles.stepMetaRow}>
          <View style={styles.stepStat}>
            <Text style={styles.stepStatLabel}>REPS</Text>
            <Text style={styles.stepStatValue}>{step.reps}</Text>
          </View>
          <View style={styles.stepStatSep} />
          <View style={styles.stepStat}>
            <Text style={styles.stepStatLabel}>FOCUS</Text>
            <Text style={styles.stepStatValue}>{formatMMSS(step.duration)}</Text>
          </View>
        </View>
        {!!step.cue && (
          <Text style={styles.cue}>"{step.cue}"</Text>
        )}
      </View>
    );
  }
  if (step.kind === "rest") {
    return (
      <View style={styles.stepBody}>
        <Text style={[styles.eyebrow, { color: "#7DEABF" }]}>BREAK</Text>
        <Text style={styles.stepTitle}>Recover</Text>
        <Text style={styles.cue}>
          {step.nextExercise
            ? `Up next: ${step.nextExercise}${step.nextSet ? ` · Set ${step.nextSet}/${step.totalSets}` : ""}`
            : "Catch your breath. Reset posture."}
        </Text>
      </View>
    );
  }
  if (step.kind === "warmup") {
    return (
      <View style={styles.stepBody}>
        <Text style={[styles.eyebrow, { color: "#FFD080" }]}>WARMUP</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.cue}>{step.detail}</Text>
      </View>
    );
  }
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.eyebrow, { color: "#FFD080" }]}>COOLDOWN</Text>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.cue}>{step.detail}</Text>
    </View>
  );
}

function CircularPulse({ paused, accent }: { paused: boolean; accent: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (paused) {
      scale.stopAnimation();
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [paused]);
  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          borderColor: accent,
          transform: [{ scale }],
          shadowColor: accent,
        },
      ]}
    />
  );
}

function SessionComplete({
  onClose,
  rankUpMsg,
}: {
  onClose: () => void;
  rankUpMsg: string | null;
}) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={["rgba(29,158,117,0.45)", "rgba(29,158,117,0)"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={styles.centerBox}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={56} color="#0B0C12" />
        </View>
        <Text style={styles.doneTitle}>Session complete.</Text>
        <Text style={styles.muted}>
          Primary mission auto-logged. The System acknowledges your work.
        </Text>
        {rankUpMsg && (
          <GlassCard
            elevated
            style={{ marginTop: spacing.lg }}
            borderColor="rgba(83,74,183,0.55)"
          >
            <Text style={[styles.eyebrow, { color: "#C9C3FF" }]}>RANK UP</Text>
            <Text style={[styles.cue, { textAlign: "left", marginTop: 6 }]}>{rankUpMsg}</Text>
          </GlassCard>
        )}
        <GlassButton
          testID="session-done-close"
          label="Return"
          onPress={onClose}
          style={{ marginTop: spacing.xl, width: "100%" }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  glowWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },
  glow: { flex: 1 },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  muted: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topMeta: { alignItems: "center" },
  topMetaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  topMetaTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  progressWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: "center" },
  stepBody: { alignItems: "center", maxWidth: 320 },
  eyebrow: {
    color: "#C9C3FF",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
  },
  stepTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  stepMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  stepStat: { alignItems: "center", paddingHorizontal: spacing.lg },
  stepStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  stepStatValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  stepStatSep: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.glassBorder,
  },
  cue: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  timerWrap: {
    marginTop: spacing.xxl,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 22,
  },
  timer: {
    color: colors.text,
    fontSize: 58,
    fontWeight: "800",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 4,
  },
  upNext: { marginTop: spacing.xl, width: "100%" },
  upNextLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  upNextText: { color: colors.text, fontSize: 15, fontWeight: "500", marginTop: 4 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  iconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(3,4,7,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: { width: "100%", maxWidth: 320 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  doneCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.success,
    shadowOpacity: 0.7,
    shadowRadius: 28,
  },
  doneTitle: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.lg,
  },
});
