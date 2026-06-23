// Analytics — stat bars + XP per day strip.
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/src/store/levelup";
import { colors, font, radius, spacing } from "@/src/theme";

export default function Analytics() {
  const { state } = useStore();

  const xpByDay = useMemo(() => {
    const map: Record<string, number> = {};
    state.completions.forEach((c) => {
      map[c.date] = (map[c.date] || 0) + c.xpAwarded;
    });
    const days: { date: string; xp: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      days.push({ date: k, xp: map[k] || 0 });
    }
    return days;
  }, [state.completions]);

  const maxXP = Math.max(100, ...xpByDay.map((d) => d.xp));

  const completionRate = (() => {
    const last7 = xpByDay.slice(-7);
    const active = last7.filter((d) => d.xp > 0).length;
    return Math.round((active / 7) * 100);
  })();

  const statKeys = Object.keys(state.stats) as (keyof typeof state.stats)[];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.row}>
          <Tile label="TOTAL XP" value={state.xp} />
          <Tile label="AURA" value={state.aura} />
          <Tile label="ADHERENCE" value={`${completionRate}%`} />
        </View>

        <Text style={styles.section}>XP — Last 14 Days</Text>
        <View style={styles.chart}>
          {xpByDay.map((d, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: 4 + (d.xp / maxXP) * 100,
                  backgroundColor: d.xp > 0 ? colors.brand : colors.surfaceTertiary,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.section}>Stats</Text>
        {statKeys.map((k) => (
          <View key={k as string} style={styles.statRow}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statName}>{k as string}</Text>
              <Text style={styles.statValue}>{state.stats[k]}/100</Text>
            </View>
            <View style={styles.statBar}>
              <View
                style={[
                  styles.statFill,
                  { width: `${state.stats[k]}%` },
                ]}
              />
            </View>
          </View>
        ))}

        <Text style={styles.section}>System Log</Text>
        {state.alerts.length === 0 ? (
          <Text style={styles.muted}>No system alerts in history.</Text>
        ) : (
          state.alerts.map((a) => (
            <View key={a.id} style={styles.alertRow}>
              <Text style={styles.alertHeader}>
                SYSTEM ALERT · {a.category.toUpperCase()}
              </Text>
              <Text style={styles.alertBody}>
                {a.observation}. {a.consequence}. {a.directive}.
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: "500" },
  row: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tileLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.2 },
  tileValue: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500", marginTop: 4 },
  section: {
    color: colors.onSurface,
    fontSize: font.lg,
    fontWeight: "500",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 120,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bar: { flex: 1, borderRadius: 2, minHeight: 4 },
  statRow: { marginBottom: spacing.md },
  statLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statName: { color: colors.onSurfaceSecondary, fontSize: font.base },
  statValue: { color: colors.onSurfaceTertiary, fontSize: font.sm },
  statBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  statFill: { height: "100%", backgroundColor: colors.brand },
  alertRow: {
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  alertHeader: { color: colors.brand, fontSize: font.sm, letterSpacing: 1.2 },
  alertBody: { color: colors.onSurfaceSecondary, marginTop: 4, fontSize: font.base, lineHeight: 20 },
  muted: { color: colors.onSurfaceTertiary, fontSize: font.base },
});
