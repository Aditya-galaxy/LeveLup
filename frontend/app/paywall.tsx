// Paywall — LevelUp Pro upsell.
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/src/store/levelup";
import { colors, font, radius, spacing } from "@/src/theme";

const PRO_FEATURES = [
  "AI Food Scan — photo → macros estimate",
  "AI Plan Generation — custom periodized programming",
  "Custom missions & directives",
  "Advanced analytics & adherence forensics",
  "Aura Farming, Boss challenges, full workout library",
];

export default function Paywall() {
  const router = useRouter();
  const { state, setPro } = useStore();

  const subscribe = (productId: string) => {
    // Preview-only entitlement flip. In production, RevenueCat purchase + entitlement check.
    console.log("subscribe", productId);
    setPro(true);
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          testID="paywall-close"
          onPress={() => router.back()}
          style={styles.close}
        >
          <Ionicons name="close" size={20} color={colors.onSurface} />
        </Pressable>

        <Text style={styles.eyebrow}>LEVELUP PRO</Text>
        <Text style={styles.headline}>Unlock the AI Coach.</Text>
        <Text style={styles.body}>
          Pro grants access to AI-driven food scans, custom periodized plans,
          custom missions, and full analytics.
        </Text>

        <View style={styles.features}>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Pressable
          testID="paywall-monthly"
          style={[styles.plan, styles.planMonthly]}
          onPress={() => subscribe("com.levelup.pro.monthly")}
        >
          <View>
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planMeta}>com.levelup.pro.monthly</Text>
          </View>
          <Text style={styles.planPrice}>$4.99/mo</Text>
        </Pressable>

        <Pressable
          testID="paywall-annual"
          style={[styles.plan, styles.planAnnual]}
          onPress={() => subscribe("com.levelup.pro.annual")}
        >
          <View>
            <Text style={styles.planTitle}>Annual · 7-day free trial</Text>
            <Text style={styles.planMeta}>com.levelup.pro.annual</Text>
          </View>
          <Text style={styles.planPrice}>$39.99/yr</Text>
        </Pressable>

        <Pressable
          testID="paywall-restore"
          style={styles.linkRow}
          onPress={() => {
            console.log("restore");
          }}
        >
          <Text style={styles.linkText}>Restore purchases</Text>
        </Pressable>

        <Text style={styles.disclosure}>
          Subscriptions auto-renew until cancelled in your App Store account.
          Cancel anytime. Review the Terms of Service and Privacy Policy from
          your Profile.
        </Text>

        {state.pro && (
          <Text style={styles.proStatus}>
            Pro is currently active on this device.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  close: { alignSelf: "flex-end" },
  eyebrow: {
    color: colors.brand,
    fontSize: font.sm,
    letterSpacing: 2,
    fontWeight: "500",
    marginTop: spacing.lg,
  },
  headline: {
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: "500",
    marginTop: spacing.sm,
    lineHeight: 38,
  },
  body: {
    color: colors.onSurfaceSecondary,
    fontSize: font.lg,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  features: { marginTop: spacing.xl, gap: spacing.md },
  feature: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  featureText: { color: colors.onSurfaceSecondary, fontSize: font.base, flex: 1 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  planMonthly: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  planAnnual: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  planTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  planMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  planPrice: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500" },
  linkRow: { alignItems: "center", paddingVertical: spacing.lg },
  linkText: { color: colors.brand, fontSize: font.base },
  disclosure: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    lineHeight: 18,
    textAlign: "center",
  },
  proStatus: {
    color: colors.success,
    fontSize: font.base,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
