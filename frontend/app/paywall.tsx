// Paywall — glass premium plan cards.
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useStore } from "@/src/store/levelup";
import { GlassCard, GlassButton, StatusPill } from "@/src/components/Glass";
import { colors, radius, spacing, typography } from "@/src/theme";

const PRO_FEATURES = [
  { icon: "scan-outline", title: "AI Food Scan", body: "Photo → macros estimate in seconds." },
  { icon: "construct-outline", title: "AI Plan Generation", body: "Periodized programming from your AI Coach." },
  { icon: "options-outline", title: "Custom Missions", body: "Define your own directives." },
  { icon: "analytics-outline", title: "Advanced Analytics", body: "Adherence forensics and trend depth." },
  { icon: "trophy-outline", title: "Aura Farming & Bosses", body: "Full workout library and weekly challenges." },
];

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const fromOnboarding = params.source === "onboarding";
  const { state, setPro } = useStore();

  // FOMO countdown: 24h from first paywall view, persisted via state.
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!fromOnboarding) return;
    const start = Date.now();
    const end = start + 24 * 60 * 60 * 1000;
    const id = setInterval(() => {
      setRemaining(Math.max(0, end - Date.now()));
    }, 1000);
    setRemaining(end - start);
    return () => clearInterval(id);
  }, [fromOnboarding]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  };

  const subscribe = (productId: string) => {
    console.log("subscribe", productId);
    setPro(true);
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Ambient glow */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={["rgba(83,74,183,0.42)", "rgba(83,74,183,0)"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {fromOnboarding && (
          <View style={styles.fomoBanner} testID="paywall-fomo">
            <View style={styles.fomoDot} />
            <Text style={styles.fomoLabel}>FIRST-MISSION BONUS</Text>
            <Text style={styles.fomoText}>
              7-day Pro trial · expires in{" "}
              <Text style={styles.fomoTimer}>{fmt(remaining)}</Text>
            </Text>
          </View>
        )}
        <View style={styles.headerRow}>
          <StatusPill label="LEVELUP PRO" tone="accent" />
          <Pressable
            testID="paywall-close"
            onPress={() => router.back()}
            style={styles.close}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.headline}>Unlock the full system.</Text>
        <Text style={styles.body}>
          AI-driven food scans, custom periodized plans, and the full mission
          library. Cancel anytime.
        </Text>

        {/* Annual hero plan */}
        <Pressable
          testID="paywall-annual"
          onPress={() => subscribe("com.levelup.pro.annual")}
        >
          <GlassCard
            elevated
            style={styles.heroPlan}
            borderColor="rgba(83,74,183,0.6)"
          >
            <LinearGradient
              colors={["rgba(83,74,183,0.22)", "rgba(83,74,183,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.planTopRow}>
              <StatusPill label="BEST VALUE · 7-DAY FREE TRIAL" tone="accent" small />
              <Text style={styles.savings}>Save 33%</Text>
            </View>
            <Text style={styles.planTitle}>Annual</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceMain}>$39.99</Text>
              <Text style={styles.priceUnit}>/year</Text>
            </View>
            <Text style={styles.planMeta}>~$3.33/month · billed yearly</Text>
            <View style={styles.planCTA}>
              <Text style={styles.planCTAText}>Start free trial</Text>
              <Ionicons name="arrow-forward" size={16} color="#0B0C12" />
            </View>
          </GlassCard>
        </Pressable>

        {/* Monthly */}
        <Pressable
          testID="paywall-monthly"
          onPress={() => subscribe("com.levelup.pro.monthly")}
        >
          <GlassCard style={styles.monthlyPlan}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={styles.monthlyTitle}>Monthly</Text>
                <Text style={styles.planMeta}>com.levelup.pro.monthly</Text>
              </View>
              <Text style={styles.monthlyPrice}>$4.99<Text style={styles.monthlyUnit}>/mo</Text></Text>
            </View>
          </GlassCard>
        </Pressable>

        {/* Features */}
        <Text style={styles.sectionTitle}>What you unlock</Text>
        <GlassCard style={{ marginTop: spacing.md }}>
          {PRO_FEATURES.map((f, i) => (
            <View
              key={f.title}
              style={[
                styles.featureRow,
                i !== PRO_FEATURES.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.glassBorder,
                },
              ]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color="#C9C3FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        <Pressable
          testID="paywall-restore"
          style={styles.linkRow}
          onPress={() => console.log("restore")}
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>

        <Text style={styles.disclosure}>
          Subscriptions auto-renew until cancelled in your App Store account.
          Cancel anytime.{"  "}
          <Text style={styles.legalLink}>Terms</Text>
          {"  ·  "}
          <Text style={styles.legalLink}>Privacy</Text>
        </Text>

        {state.pro && (
          <Text style={styles.proStatus}>
            Pro is currently active on this device.
          </Text>
        )}

        <GlassButton
          label="Continue free"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  glowWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 380 },
  glow: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  close: { padding: 4 },
  headline: {
    ...typography.display,
    color: colors.text,
    marginTop: spacing.xl,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  heroPlan: { marginTop: spacing.xl, overflow: "hidden" },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savings: {
    color: "#7DEABF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  planTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  priceMain: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  priceUnit: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 6,
  },
  planMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  planCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  planCTAText: { color: "#0B0C12", fontWeight: "700", fontSize: 16 },
  monthlyPlan: { marginTop: spacing.md },
  monthlyTitle: { color: colors.text, fontSize: 17, fontWeight: "600" },
  monthlyPrice: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  monthlyUnit: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  featureBody: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  linkRow: { alignItems: "center", paddingVertical: spacing.lg },
  restoreText: { color: "#C9C3FF", fontSize: 14, fontWeight: "500" },
  disclosure: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  legalLink: { color: colors.textSecondary, textDecorationLine: "underline" },
  proStatus: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.lg,
  },
  fomoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(83,74,183,0.45)",
    borderWidth: 1,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  fomoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9C3FF",
    shadowColor: "#C9C3FF",
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  fomoLabel: {
    color: "#C9C3FF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  fomoText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  fomoTimer: {
    color: colors.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
