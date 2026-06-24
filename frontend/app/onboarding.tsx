// LevelUp onboarding — cinematic glass ceremony.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useStore } from "@/src/store/levelup";
import { rankFromXP } from "@/src/domain/xp";
import { GlassCard, GlassButton, StatusPill, ProgressBar } from "@/src/components/Glass";

const GOALS = [
  "Build Muscle",
  "Lose Fat",
  "Increase Endurance",
  "Athletic Performance",
  "General Fitness",
  "Mental Mastery",
];
const EQUIPMENT = ["Bodyweight only", "Dumbbells", "Full gym", "Resistance bands", "Home setup"];
const FREQ = [3, 4, 5, 6];
const LEN = [30, 45, 60, 90];
const LITERACY_KEYS = ["squat", "hinge", "push", "pull", "carry"];

type Step =
  | "tone" | "goal" | "literacy" | "equipment" | "schedule"
  | "stats" | "nutrition" | "reveal";

const STEPS: Step[] = [
  "tone", "goal", "literacy", "equipment", "schedule", "stats", "nutrition", "reveal",
];

const STEP_TITLES: Record<Step, string> = {
  tone: "Initialization",
  goal: "Directive",
  literacy: "Assessment",
  equipment: "Loadout",
  schedule: "Window",
  stats: "Baseline",
  nutrition: "Targets",
  reveal: "Rank",
};

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

  // Cinematic entrance animation per step
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    fade.setValue(0);
    slide.setValue(16);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepIdx]);

  // Rank badge pulse on reveal
  const pulse = useRef(new Animated.Value(0.9)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (step !== "reveal") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 480, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [step]);

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
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

  const progress = (stepIdx + 1) / STEPS.length;
  const animStyle = {
    opacity: fade,
    transform: [{ translateY: slide }],
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Ambient indigo glow — stronger on tone + reveal */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={
            step === "tone"
              ? ["rgba(83,74,183,0.55)", "rgba(83,74,183,0)"]
              : step === "reveal"
              ? ["rgba(83,74,183,0.65)", "rgba(83,74,183,0)"]
              : ["rgba(83,74,183,0.22)", "rgba(83,74,183,0)"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glow}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top status bar (only after tone) */}
        {step !== "tone" && step !== "reveal" && (
          <View style={styles.topBar}>
            <Pressable onPress={back} hitSlop={12} testID="onboarding-back">
              <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.topMeta}>
              <Text style={styles.topMetaLabel}>STEP {stepIdx + 1} / {STEPS.length}</Text>
              <Text style={styles.topMetaTitle}>{STEP_TITLES[step]}</Text>
            </View>
            <View style={{ width: 22 }} />
          </View>
        )}
        {step !== "tone" && step !== "reveal" && (
          <View style={styles.progressBar}>
            <ProgressBar progress={progress} height={2} />
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={animStyle}>
            {step === "tone" && <ToneScreen />}

            {step === "goal" && (
              <View testID="onboarding-goal">
                <Eyebrow>PRIMARY DIRECTIVE</Eyebrow>
                <ScreenTitle>Select your goal.</ScreenTitle>
                <Text style={styles.muted}>
                  The System will calibrate missions, plans, and macros against
                  this objective.
                </Text>
                <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
                  {GOALS.map((g) => (
                    <SelectableRow
                      key={g}
                      label={g}
                      active={goal === g}
                      testID={`goal-${g}`}
                      onPress={() => setGoal(g)}
                    />
                  ))}
                </View>
              </View>
            )}

            {step === "literacy" && (
              <View testID="onboarding-literacy">
                <Eyebrow>MOVEMENT ASSESSMENT</Eyebrow>
                <ScreenTitle>Rate each movement.</ScreenTitle>
                <Text style={styles.muted}>
                  Honest answers prevent injury and right-size your plan.
                </Text>
                <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                  {LITERACY_KEYS.map((k) => (
                    <GlassCard key={k}>
                      <Text style={styles.literacyLabel}>{k.toUpperCase()}</Text>
                      <View style={styles.segment}>
                        {["new", "ok", "strong"].map((lv) => {
                          const active = literacy[k] === lv;
                          return (
                            <Pressable
                              key={lv}
                              testID={`literacy-${k}-${lv}`}
                              onPress={() => setLiteracy({ ...literacy, [k]: lv })}
                              style={[
                                styles.segmentBtn,
                                active && styles.segmentActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.segmentText,
                                  active && { color: colors.text },
                                ]}
                              >
                                {lv}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </GlassCard>
                  ))}
                </View>
              </View>
            )}

            {step === "equipment" && (
              <View testID="onboarding-equipment">
                <Eyebrow>LOADOUT</Eyebrow>
                <ScreenTitle>What do you have access to?</ScreenTitle>
                <Text style={styles.muted}>
                  Pick everything available. We never prescribe what you can't use.
                </Text>
                <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
                  {EQUIPMENT.map((e) => (
                    <SelectableRow
                      key={e}
                      label={e}
                      active={equipment.includes(e)}
                      testID={`equip-${e}`}
                      onPress={() => toggleEquipment(e)}
                      multi
                    />
                  ))}
                </View>
              </View>
            )}

            {step === "schedule" && (
              <View testID="onboarding-schedule">
                <Eyebrow>OPERATING WINDOW</Eyebrow>
                <ScreenTitle>When do you train?</ScreenTitle>
                <Text style={styles.fieldLabel}>DAYS / WEEK</Text>
                <ChipRow
                  options={FREQ.map(String)}
                  value={String(days)}
                  testIDPrefix="days"
                  onChange={(v) => setDays(Number(v))}
                />
                <Text style={styles.fieldLabel}>SESSION LENGTH (MIN)</Text>
                <ChipRow
                  options={LEN.map(String)}
                  value={String(length)}
                  testIDPrefix="length"
                  onChange={(v) => setLength(Number(v))}
                />
                <Text style={styles.fieldLabel}>PREFERRED TIME</Text>
                <ChipRow
                  options={["morning", "evening"]}
                  value={time}
                  testIDPrefix="time"
                  onChange={(v) => setTime(v as any)}
                />
              </View>
            )}

            {step === "stats" && (
              <View testID="onboarding-stats">
                <Eyebrow>BODY METRICS</Eyebrow>
                <ScreenTitle>Optional baseline.</ScreenTitle>
                <Text style={styles.muted}>
                  Skip to use conservative defaults. You can update these later.
                </Text>
                <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                  <Field label="Height (cm)" value={height} onChange={setHeight} testID="input-height" />
                  <Field label="Weight (kg)" value={weight} onChange={setWeight} testID="input-weight" />
                  <Field label="Age" value={age} onChange={setAge} testID="input-age" />
                </View>
              </View>
            )}

            {step === "nutrition" && (
              <View testID="onboarding-nutrition">
                <Eyebrow>NUTRITION BASELINE</Eyebrow>
                <ScreenTitle>Daily targets.</ScreenTitle>
                <Text style={styles.muted}>
                  Skip and we'll seed sane defaults (2200 kcal · 140 g · 3000 ml).
                </Text>
                <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                  <Field label="Calories / day" value={cals} onChange={setCals} testID="input-cals" />
                  <Field label="Protein g / day" value={protein} onChange={setProtein} testID="input-protein" />
                  <Field label="Water ml / day" value={water} onChange={setWater} testID="input-water" />
                </View>
              </View>
            )}

            {step === "reveal" && (
              <RankRevealScreen rank={rank} pulse={pulse} glowPulse={glowPulse} />
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={[
            styles.cta,
            step === "tone" && styles.ctaTone,
          ]}
        >
          {step !== "tone" && step !== "reveal" && (
            <GlassButton label="Back" variant="ghost" onPress={back} />
          )}
          <GlassButton
            testID="onboarding-next"
            label={
              step === "tone"
                ? "Begin"
                : step === "reveal"
                ? "Enter the System"
                : "Continue"
            }
            onPress={step === "reveal" ? finish : next}
            variant="primary"
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------- sub-components -------- */

function ToneScreen() {
  return (
    <View style={styles.toneWrap} testID="onboarding-tone">
      <View style={styles.toneWordmarkWrap}>
        <Text style={styles.toneWordmark}>LEVELUP</Text>
        <View style={styles.toneWordmarkDot} />
      </View>

      <Text style={styles.toneEyebrow}>SYSTEM INITIALIZATION</Text>

      <Text style={styles.toneHeadline}>
        You are not starting{"\n"}a fitness app.
      </Text>
      <Text style={styles.toneHeadlineAccent}>
        You are awakening.
      </Text>

      <GlassCard elevated style={styles.toneCard}>
        <Text style={styles.toneBody}>
          The System will analyze your baseline, assign a starting rank, and
          issue your first missions.
        </Text>
        <View style={styles.toneDivider} />
        <View style={styles.toneRow}>
          <ToneStep n={1} label="Assess baseline" />
          <ToneStep n={2} label="Assign rank" />
          <ToneStep n={3} label="Issue missions" />
        </View>
      </GlassCard>
    </View>
  );
}

function ToneStep({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.toneStep}>
      <View style={styles.toneStepDot}>
        <Text style={styles.toneStepN}>{n}</Text>
      </View>
      <Text style={styles.toneStepLabel}>{label}</Text>
    </View>
  );
}

function RankRevealScreen({
  rank,
  pulse,
  glowPulse,
}: {
  rank: any;
  pulse: Animated.Value;
  glowPulse: Animated.Value;
}) {
  return (
    <View style={styles.revealWrap} testID="onboarding-reveal">
      <Text style={styles.toneEyebrow}>SYSTEM ASSESSMENT COMPLETE</Text>

      {/* Glowing rank badge */}
      <View style={styles.rankBadgeWrap}>
        <Animated.View
          style={[
            styles.rankBadgeGlow,
            { opacity: glowPulse, transform: [{ scale: pulse }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(83,74,183,0.85)", "rgba(83,74,183,0)"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.rankBadgeOuter,
            { transform: [{ scale: pulse }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(83,74,183,0.55)", "rgba(83,74,183,0.10)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.rankBadgeInner}>
            <Text style={styles.rankBadgeCode}>{rank.code}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={{ alignItems: "center", marginTop: spacing.xl }}>
        <StatusPill label={`${rank.code}-CLASS · HUNTER`} tone="accent" />
        <Text style={styles.revealRankName}>{rank.name}</Text>
      </View>

      <GlassCard elevated style={styles.revealCard} borderColor="rgba(83,74,183,0.55)">
        <Text style={styles.revealMsg}>
          The System has recognized you.{"\n\n"}
          Rank assigned:{" "}
          <Text style={{ color: colors.text, fontWeight: "700" }}>
            {rank.code}-Class {rank.name}
          </Text>
          .{"\n"}First mission issued.{"\n\n"}
          <Text style={{ color: colors.text }}>Begin.</Text>
        </Text>
      </GlassCard>
    </View>
  );
}

function Eyebrow({ children }: { children: any }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}
function ScreenTitle({ children }: { children: any }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

function SelectableRow({
  label,
  active,
  onPress,
  testID,
  multi,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  multi?: boolean;
}) {
  return (
    <Pressable testID={testID} onPress={onPress}>
      <GlassCard
        elevated={active}
        borderColor={active ? "rgba(83,74,183,0.55)" : undefined}
        style={styles.selectableRow}
      >
        <View style={styles.selectableRowInner}>
          <Text style={[styles.selectableText, active && { color: colors.text }]}>
            {label}
          </Text>
          <View
            style={[
              multi ? styles.checkboxSquare : styles.checkboxCircle,
              active && {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              },
            ]}
          >
            {active && (
              <Ionicons name="checkmark" size={14} color={colors.text} />
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function ChipRow({
  options,
  value,
  testIDPrefix,
  onChange,
}: {
  options: string[];
  value: string;
  testIDPrefix: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = String(value) === String(o);
        return (
          <Pressable
            key={o}
            testID={`${testIDPrefix}-${o}`}
            onPress={() => onChange(o)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && { color: colors.text }]}>
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    <GlassCard noHighlight>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  glowWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 520 },
  glow: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  topMetaTitle: { color: colors.text, fontSize: 14, fontWeight: "600", marginTop: 2 },
  progressBar: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },

  scroll: { padding: spacing.lg, paddingBottom: 40, flexGrow: 1 },

  eyebrow: {
    color: "#C9C3FF",
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  /* --- Tone --- */
  toneWrap: { paddingTop: spacing.xxl, alignItems: "flex-start" },
  toneWordmarkWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xxl,
  },
  toneWordmark: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 5,
  },
  toneWordmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  toneEyebrow: {
    color: "#C9C3FF",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  toneHeadline: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 44,
    letterSpacing: -1,
  },
  toneHeadlineAccent: {
    color: "#C9C3FF",
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 44,
    letterSpacing: -1,
    marginTop: 2,
  },
  toneCard: { marginTop: spacing.xxl },
  toneBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  toneDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.lg,
  },
  toneRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  toneStep: { flex: 1, alignItems: "flex-start" },
  toneStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  toneStepN: { color: "#C9C3FF", fontWeight: "700", fontSize: 13 },
  toneStepLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },

  /* --- Reveal --- */
  revealWrap: { alignItems: "center", paddingTop: spacing.xxl },
  rankBadgeWrap: {
    marginTop: spacing.xl,
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: "hidden",
  },
  rankBadgeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: "rgba(83,74,183,0.65)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rankBadgeInner: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeCode: {
    color: colors.text,
    fontSize: 80,
    fontWeight: "800",
    letterSpacing: -3,
    lineHeight: 86,
  },
  revealRankName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  revealCard: { marginTop: spacing.xl, width: "100%" },
  revealMsg: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  /* --- shared form bits --- */
  literacyLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.track,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  segmentActive: { backgroundColor: colors.accentSoft },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: "600", textTransform: "capitalize" },

  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    borderColor: "rgba(83,74,183,0.6)",
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  selectableRow: {},
  selectableRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectableText: { color: colors.textSecondary, fontSize: 16, fontWeight: "500" },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.glassBorderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.glassBorderStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    padding: 0,
    fontVariant: ["tabular-nums"],
  },

  cta: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  ctaTone: { paddingTop: spacing.lg },
});
