// Profile — avatar, rank, level, total XP, Aura, longest streak, achievements, settings.
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/src/store/levelup";
import { rankFromXP, levelFromXP } from "@/src/domain/xp";
import { colors, font, radius, spacing } from "@/src/theme";
import { requestNotificationPermissions, scheduleDailyReminders } from "@/src/notifications";

const ALL_ACHIEVEMENTS = [
  "First Mission",
  "7-Day Streak",
  "30-Day Streak",
  "100 Missions",
  "Aura 100+",
  "Perfect Week",
  "First Rank-Up",
];

export default function Profile() {
  const router = useRouter();
  const { state, setPro, resetAll } = useStore();
  const rank = rankFromXP(state.xp);
  const level = levelFromXP(state.xp);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.hero}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{state.profile.name[0]}</Text>
          </View>
          <Text style={styles.name}>{state.profile.name}</Text>
          <Text style={styles.subline}>
            {rank.code}-Class {rank.name} · Level {level}
          </Text>
          {state.pro && (
            <View style={styles.proPill}>
              <Text style={styles.proText}>LEVELUP PRO</Text>
            </View>
          )}
        </View>

        <View style={styles.row3}>
          <Tile label="TOTAL XP" value={state.xp} />
          <Tile label="AURA" value={state.aura} />
          <Tile label="LONGEST STREAK" value={`${state.longestStreak}d`} />
        </View>

        <Text style={styles.section}>Achievements</Text>
        <View style={styles.achGrid}>
          {ALL_ACHIEVEMENTS.map((a) => {
            const unlocked = state.achievements.includes(a);
            return (
              <View
                key={a}
                style={[styles.ach, unlocked && { borderColor: colors.brand }]}
              >
                <Ionicons
                  name={unlocked ? "trophy" : "trophy-outline"}
                  size={20}
                  color={unlocked ? colors.brand : colors.onSurfaceTertiary}
                />
                <Text
                  style={[styles.achText, unlocked && { color: colors.onSurface }]}
                >
                  {a}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Plan</Text>
        <Pressable
          testID="profile-plan-deterministic"
          style={styles.action}
          onPress={() => router.push("/plan-generate?source=deterministic")}
        >
          <Text style={styles.actionText}>Regenerate plan (free)</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>
        <Pressable
          testID="profile-plan-ai"
          style={styles.action}
          onPress={() => router.push("/plan-generate?source=ai")}
        >
          <Text style={styles.actionText}>AI-generate plan</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </Pressable>

        <Text style={styles.section}>Subscription</Text>
        <Pressable
          testID="profile-upgrade"
          style={styles.action}
          onPress={() => router.push("/paywall")}
        >
          <Text style={styles.actionText}>
            {state.pro ? "Manage LevelUp Pro" : "Upgrade to LevelUp Pro"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>
        <Pressable
          testID="profile-toggle-pro"
          style={styles.action}
          onPress={() => setPro(!state.pro)}
        >
          <Text style={styles.actionText}>
            (Preview only) Pro: {state.pro ? "ON" : "OFF"}
          </Text>
          <Ionicons name="swap-horizontal" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        <Text style={styles.section}>Notifications</Text>
        <Pressable
          testID="profile-enable-notifications"
          style={styles.action}
          onPress={async () => {
            const ok = await requestNotificationPermissions();
            if (ok) await scheduleDailyReminders();
          }}
        >
          <Text style={styles.actionText}>
            Enable System Alerts (8pm & 9pm)
          </Text>
          <Ionicons name="notifications-outline" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        <Text style={styles.section}>Legal</Text>
        <Pressable style={styles.action}>
          <Text style={styles.actionText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={16} color={colors.onSurfaceTertiary} />
        </Pressable>
        <Pressable style={styles.action}>
          <Text style={styles.actionText}>Terms of Service</Text>
          <Ionicons name="open-outline" size={16} color={colors.onSurfaceTertiary} />
        </Pressable>

        <Pressable
          testID="profile-reset"
          style={[styles.action, { borderColor: colors.error }]}
          onPress={resetAll}
        >
          <Text style={[styles.actionText, { color: colors.error }]}>
            Reset all data
          </Text>
        </Pressable>
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
  hero: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.onSurface, fontSize: 40, fontWeight: "500" },
  name: { color: colors.onSurface, fontSize: font.xxl, fontWeight: "500" },
  subline: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4 },
  proPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  proText: { color: colors.onBrand, fontSize: 10, letterSpacing: 1.6 },
  row3: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 },
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  achGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  ach: {
    width: "31%",
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    gap: 6,
  },
  achText: { color: colors.onSurfaceTertiary, fontSize: 11, textAlign: "center" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionText: { color: colors.onSurface, fontSize: font.lg },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
  },
  proBadgeText: { color: colors.onBrand, fontSize: 10, letterSpacing: 1.2 },
});
