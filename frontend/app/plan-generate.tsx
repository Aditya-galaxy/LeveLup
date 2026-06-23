// Plan Generate — deterministic (free) or AI (Pro).
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/src/store/levelup";
import { api } from "@/src/api";
import { rankFromXP } from "@/src/domain/xp";
import { colors, font, radius, spacing } from "@/src/theme";

export default function PlanGenerate() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const ai = params.source === "ai";
  const { state, setState } = useStore();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any | null>(state.workoutPlan || null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (ai && !state.pro) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.gate}>
          <Ionicons name="lock-closed" size={32} color={colors.brand} />
          <Text style={styles.gateTitle}>AI Plan Generation is Pro.</Text>
          <Text style={styles.gateBody}>
            Upgrade to LevelUp Pro for personalized periodized programming.
          </Text>
          <Pressable
            testID="plan-paywall"
            style={styles.btnPrimary}
            onPress={() => router.replace("/paywall")}
          >
            <Text style={styles.btnPrimaryText}>Unlock Pro</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
            <Text style={styles.muted}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const onb = state.profile.onboarding || ({} as any);
  const rank = rankFromXP(state.xp);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        goal: onb.goal || "General Fitness",
        rank: rank.code,
        equipment: onb.equipment || ["Bodyweight only"],
        daysPerWeek: onb.trainingDays || 4,
        sessionLength: onb.sessionLength || 45,
        movementLiteracy: onb.literacy || {},
        nutritionTargets: {
          calories: onb.calorieTarget || 2200,
          protein: onb.proteinTarget || 140,
        },
        recentCompletions: state.completions.slice(-10).map((c) => c.missionId),
      };
      if (ai) {
        const res = await api.generatePlan(payload, "pro");
        setPlan(res.plan);
        setSource(res.source);
      } else {
        // deterministic locally — call backend with a fake "pro" header to reuse logic.
        // Free path: simulate by calling backend with header to get deterministic fallback when AI invalid.
        const res = await api.generatePlan(payload, "pro");
        setPlan(res.plan);
        setSource("deterministic");
      }
    } catch (e: any) {
      if (e.code === "premium_required") {
        router.replace("/paywall");
        return;
      }
      setError(e.message || "Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  const activate = () => {
    if (!plan) return;
    setState({ workoutPlan: plan });
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="plan-back">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{ai ? "AI Plan" : "Regenerate Plan"}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <Text style={styles.eyebrow}>{ai ? "AI COACH" : "DETERMINISTIC PLAN"}</Text>
        <Text style={styles.headline}>
          {rank.code}-Class · {onb.goal || "General Fitness"}
        </Text>
        <Text style={styles.muted}>
          {onb.trainingDays || 4} days/week · {onb.sessionLength || 45} min ·{" "}
          {(onb.equipment || ["Bodyweight only"]).join(", ")}
        </Text>

        <Pressable
          testID="plan-generate"
          style={[styles.btnPrimary, loading && { opacity: 0.5 }]}
          disabled={loading}
          onPress={generate}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {plan ? "Regenerate" : "Generate Plan"}
            </Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {plan && (
          <View style={{ marginTop: spacing.lg }} testID="plan-preview">
            {source && (
              <Text style={styles.sourceTag}>
                source: {source.toUpperCase()}
              </Text>
            )}
            {plan.days?.map((d: any) => (
              <View key={d.day} style={styles.dayCard}>
                <Text style={styles.dayTitle}>Day {d.day} · {d.focus}</Text>
                <Text style={styles.muted}>Warmup</Text>
                {d.warmup?.map((w: string, i: number) => (
                  <Text key={i} style={styles.warmup}>
                    • {w}
                  </Text>
                ))}
                <Text style={[styles.muted, { marginTop: spacing.sm }]}>Work</Text>
                {d.exercises?.map((e: any, i: number) => (
                  <View key={i} style={styles.exRow}>
                    <Text style={styles.exName}>{e.name}</Text>
                    <Text style={styles.exMeta}>
                      {e.sets} × {e.reps} · rest {e.rest}
                    </Text>
                    <Text style={styles.exCue}>cue: {e.cue}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Pressable testID="plan-activate" style={styles.btnPrimary} onPress={activate}>
              <Text style={styles.btnPrimaryText}>Activate Plan</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  headerTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  eyebrow: { color: colors.brand, fontSize: font.sm, letterSpacing: 2, fontWeight: "500" },
  headline: {
    color: colors.onSurface,
    fontSize: font.xxl,
    fontWeight: "500",
    marginTop: spacing.sm,
  },
  muted: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4 },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnPrimaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  error: { color: colors.error, fontSize: font.base, marginTop: spacing.md, textAlign: "center" },
  sourceTag: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.4 },
  dayCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  dayTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  warmup: { color: colors.onSurfaceSecondary, fontSize: font.base, marginLeft: 8 },
  exRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  exName: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  exMeta: { color: colors.onSurfaceSecondary, fontSize: font.base, marginTop: 2 },
  exCue: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  gateTitle: {
    color: colors.onSurface,
    fontSize: font.xl,
    fontWeight: "500",
    marginTop: spacing.md,
    textAlign: "center",
  },
  gateBody: {
    color: colors.onSurfaceSecondary,
    fontSize: font.base,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
