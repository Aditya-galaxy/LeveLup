// LevelUp onboarding — multi-step in one screen with progress bar.
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, font, radius, spacing } from "@/src/theme";
import { useStore } from "@/src/store/levelup";
import { rankFromXP } from "@/src/domain/xp";

const GOALS = [
  "Build Muscle",
  "Lose Fat",
  "Increase Endurance",
  "Athletic Performance",
  "General Fitness",
  "Mental Mastery",
];

const EQUIPMENT = [
  "Bodyweight only",
  "Dumbbells",
  "Full gym",
  "Resistance bands",
  "Home setup",
];

const FREQ = [3, 4, 5, 6];
const LEN = [30, 45, 60, 90];
const LITERACY_KEYS = ["squat", "hinge", "push", "pull", "carry"];

type Step =
  | "tone"
  | "goal"
  | "literacy"
  | "equipment"
  | "schedule"
  | "stats"
  | "nutrition"
  | "reveal";

const STEPS: Step[] = [
  "tone",
  "goal",
  "literacy",
  "equipment",
  "schedule",
  "stats",
  "nutrition",
  "reveal",
];

export default function Onboarding() {
  const router = useRouter();
  const { state, setState } = useStore();
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const [goal, setGoal] = useState("Build Muscle");
  const [literacy, setLiteracy] = useState<Record<string, string>>({});
  const [equipment, setEquipment] = useState<string[]>(["Bodyweight only"]);
  const [days, setDays] = useState(4);
  const [length, setLength] = useState(45);
  const [time, setTime] = useState<"morning" | "evening">("morning");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [cals, setCals] = useState("");
  const [protein, setProtein] = useState("");
  const [water, setWater] = useState("");

  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const rank = useMemo(() => rankFromXP(state.xp), [state.xp]);

  function finish() {
    setState({
      onboarded: true,
      profile: {
        ...state.profile,
        onboarding: {
          goal,
          trainingDays: days,
          sessionLength: length,
          equipment,
          literacy,
          heightCm: height ? Number(height) : undefined,
          weightKg: weight ? Number(weight) : undefined,
          age: age ? Number(age) : undefined,
          calorieTarget: cals ? Number(cals) : 2200,
          proteinTarget: protein ? Number(protein) : 140,
          waterTargetMl: water ? Number(water) : 3000,
        },
      },
    });
    router.replace("/(tabs)");
  }

  function toggleEquipment(e: string) {
    setEquipment((prev) =>
      prev.includes(e) ? prev.filter((p) => p !== e) : [...prev, e]
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                { backgroundColor: i <= stepIdx ? colors.brand : colors.border },
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "tone" && (
            <View testID="onboarding-tone">
              <Text style={styles.eyebrow}>SYSTEM INITIALIZATION</Text>
              <Text style={styles.headline}>
                You are not starting a fitness app.{"\n"}You are awakening.
              </Text>
              <Text style={styles.muted}>
                The System will analyze your baseline, assign a starting rank,
                and issue your first missions. Operate with intent.
              </Text>
            </View>
          )}

          {step === "goal" && (
            <View testID="onboarding-goal">
              <Text style={styles.eyebrow}>PRIMARY DIRECTIVE</Text>
              <Text style={styles.headline}>Select your goal.</Text>
              <View style={styles.list}>
                {GOALS.map((g) => (
                  <Pressable
                    key={g}
                    testID={`goal-${g}`}
                    onPress={() => setGoal(g)}
                    style={[styles.row, goal === g && styles.rowActive]}
                  >
                    <Text style={styles.rowText}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "literacy" && (
            <View testID="onboarding-literacy">
              <Text style={styles.eyebrow}>MOVEMENT LITERACY</Text>
              <Text style={styles.headline}>Rate each movement.</Text>
              <Text style={styles.muted}>
                Honest answers calibrate your starting plan.
              </Text>
              {LITERACY_KEYS.map((k) => (
                <View key={k} style={styles.literacyRow}>
                  <Text style={styles.literacyLabel}>{k.toUpperCase()}</Text>
                  <View style={styles.segment}>
                    {["new", "ok", "strong"].map((lv) => (
                      <Pressable
                        key={lv}
                        testID={`literacy-${k}-${lv}`}
                        onPress={() => setLiteracy({ ...literacy, [k]: lv })}
                        style={[
                          styles.segmentBtn,
                          literacy[k] === lv && styles.segmentActive,
                        ]}
                      >
                        <Text style={styles.segmentText}>{lv}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {step === "equipment" && (
            <View testID="onboarding-equipment">
              <Text style={styles.eyebrow}>EQUIPMENT</Text>
              <Text style={styles.headline}>What do you have access to?</Text>
              <View style={styles.list}>
                {EQUIPMENT.map((e) => (
                  <Pressable
                    key={e}
                    testID={`equip-${e}`}
                    onPress={() => toggleEquipment(e)}
                    style={[
                      styles.row,
                      equipment.includes(e) && styles.rowActive,
                    ]}
                  >
                    <Text style={styles.rowText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "schedule" && (
            <View testID="onboarding-schedule">
              <Text style={styles.eyebrow}>OPERATING WINDOW</Text>
              <Text style={styles.headline}>Schedule.</Text>
              <Text style={styles.label}>Days per week</Text>
              <View style={styles.chipRow}>
                {FREQ.map((f) => (
                  <Pressable
                    key={f}
                    testID={`days-${f}`}
                    onPress={() => setDays(f)}
                    style={[styles.chip, days === f && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{f}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Session length (min)</Text>
              <View style={styles.chipRow}>
                {LEN.map((f) => (
                  <Pressable
                    key={f}
                    testID={`length-${f}`}
                    onPress={() => setLength(f)}
                    style={[styles.chip, length === f && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{f}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Preferred time</Text>
              <View style={styles.chipRow}>
                {(["morning", "evening"] as const).map((t) => (
                  <Pressable
                    key={t}
                    testID={`time-${t}`}
                    onPress={() => setTime(t)}
                    style={[styles.chip, time === t && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "stats" && (
            <View testID="onboarding-stats">
              <Text style={styles.eyebrow}>BODY METRICS</Text>
              <Text style={styles.headline}>Optional baseline.</Text>
              <Text style={styles.muted}>
                Skip to use conservative defaults.
              </Text>
              <Field label="Height (cm)" value={height} onChange={setHeight} testID="input-height" />
              <Field label="Weight (kg)" value={weight} onChange={setWeight} testID="input-weight" />
              <Field label="Age" value={age} onChange={setAge} testID="input-age" />
            </View>
          )}

          {step === "nutrition" && (
            <View testID="onboarding-nutrition">
              <Text style={styles.eyebrow}>NUTRITION BASELINE</Text>
              <Text style={styles.headline}>Targets (optional).</Text>
              <Field label="Calories / day" value={cals} onChange={setCals} testID="input-cals" />
              <Field label="Protein g / day" value={protein} onChange={setProtein} testID="input-protein" />
              <Field label="Water ml / day" value={water} onChange={setWater} testID="input-water" />
              <Text style={styles.muted}>Defaults: 2200 kcal · 140 g · 3000 ml.</Text>
            </View>
          )}

          {step === "reveal" && (
            <View testID="onboarding-reveal" style={styles.revealBox}>
              <Text style={styles.eyebrow}>SYSTEM ASSESSMENT COMPLETE</Text>
              <Text style={styles.rankCode}>{rank.code}</Text>
              <Text style={styles.rankName}>{rank.code}-Class {rank.name}</Text>
              <Text style={styles.revealMsg}>
                The System has recognized you. Rank assigned: {rank.code}-Class{" "}
                {rank.name}. First mission issued. Begin.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.cta}>
          {stepIdx > 0 && (
            <Pressable
              testID="onboarding-back"
              style={styles.btnSecondary}
              onPress={back}
            >
              <Text style={styles.btnSecondaryText}>Back</Text>
            </Pressable>
          )}
          <Pressable
            testID="onboarding-next"
            style={[styles.btnPrimary, { flex: 1 }]}
            onPress={step === "reveal" ? finish : next}
          >
            <Text style={styles.btnPrimaryText}>
              {step === "reveal" ? "Begin" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={colors.onSurfaceTertiary}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  progressRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  eyebrow: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    letterSpacing: 1.5,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  headline: {
    color: colors.onSurface,
    fontSize: font.xxl,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.onSurfaceTertiary,
    fontSize: font.base,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  list: { marginTop: spacing.sm },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  rowText: { color: colors.onSurface, fontSize: font.lg },
  literacyRow: { marginBottom: spacing.md },
  literacyLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  segmentActive: { backgroundColor: colors.brandTertiary },
  segmentText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: font.base, textTransform: "capitalize" },
  input: {
    color: colors.onSurface,
    fontSize: font.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  cta: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
  },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnPrimaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  btnSecondary: {
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnSecondaryText: { color: colors.onSurfaceSecondary, fontSize: font.lg },
  revealBox: { alignItems: "center", paddingTop: spacing.xxl },
  rankCode: {
    color: colors.brand,
    fontSize: 96,
    fontWeight: "300",
    letterSpacing: -2,
  },
  rankName: {
    color: colors.onSurface,
    fontSize: font.xl,
    fontWeight: "500",
    marginBottom: spacing.lg,
  },
  revealMsg: {
    color: colors.onSurfaceSecondary,
    fontSize: font.lg,
    lineHeight: 26,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});
