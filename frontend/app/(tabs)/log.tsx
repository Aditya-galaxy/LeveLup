// Log — nutrition rings (calories/protein/water) + habits.
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStore, todayKey } from "@/src/store/levelup";
import { colors, font, radius, spacing } from "@/src/theme";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export default function LogScreen() {
  const router = useRouter();
  const { state, logMeal, setHabit, completeMission } = useStore();
  const today = todayKey();

  const todayMeals = state.meals.filter((m) => m.date === today);
  const totals = todayMeals.reduce(
    (acc, m) => {
      acc.calories += m.calories;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const habit = state.habits[today] || { date: today };
  const onb = state.profile.onboarding;
  const calT = onb?.calorieTarget ?? 2200;
  const proT = onb?.proteinTarget ?? 140;
  const waterT = onb?.waterTargetMl ?? 3000;

  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [foodName, setFoodName] = useState("");
  const [cals, setCals] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const saveMeal = () => {
    if (!foodName.trim()) return;
    logMeal({
      date: today,
      mealType,
      name: foodName.trim(),
      calories: Number(cals) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    // Auto-complete nutrition mission once protein target reached
    const newProtein = totals.protein + (Number(protein) || 0);
    if (newProtein >= proT) {
      const nm = state.missions.find((m) => m.title.toLowerCase().includes("hydration"));
      // intentionally not auto-completing hydration; just protein gate trigger
      if (nm) completeMission(nm.id);
    }
    setFoodName("");
    setCals("");
    setProtein("");
    setCarbs("");
    setFat("");
    setShowAdd(false);
  };

  const addWater = (ml: number) => {
    setHabit(today, { hydrationMl: (habit.hydrationMl || 0) + ml });
  };

  // Last 30 days month-style strip
  const days30 = useMemo(() => {
    const out: { date: string; status: "done" | "miss" | "rest" | "future" }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const ds = state.completions.some((c) => c.date === k);
      const h = state.habits[k];
      let status: "done" | "miss" | "rest" | "future" = "future";
      if (k <= todayKey()) {
        if (ds) status = "done";
        else if (h?.rest) status = "rest";
        else status = "miss";
      }
      out.push({ date: k, status });
    }
    return out;
  }, [state.completions, state.habits]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Log</Text>
        <Pressable
          testID="log-scan"
          onPress={() => router.push("/food-scan")}
          style={styles.scanBtn}
        >
          <Ionicons name="scan-outline" size={18} color={colors.onSurface} />
          <Text style={styles.scanText}>AI Scan</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {/* Nutrition rings */}
        <View style={styles.row3}>
          <Ring label="CAL" value={totals.calories} target={calT} testID="ring-calories" />
          <Ring label="PROTEIN" value={totals.protein} target={proT} unit="g" testID="ring-protein" />
          <Ring label="WATER" value={habit.hydrationMl || 0} target={waterT} unit="ml" testID="ring-water" />
        </View>

        <View style={styles.waterRow}>
          {[250, 500, 750].map((ml) => (
            <Pressable
              key={ml}
              testID={`water-${ml}`}
              style={styles.waterBtn}
              onPress={() => addWater(ml)}
            >
              <Ionicons name="water-outline" size={16} color={colors.info} />
              <Text style={styles.waterText}>+{ml} ml</Text>
            </Pressable>
          ))}
        </View>

        {/* Meals */}
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Today{`’`}s Meals</Text>
          <Pressable
            testID="log-add-meal"
            onPress={() => setShowAdd(true)}
            style={styles.addBtnSmall}
          >
            <Ionicons name="add" size={18} color={colors.onSurface} />
          </Pressable>
        </View>
        {todayMeals.length === 0 ? (
          <Text style={styles.muted}>No meals logged today.</Text>
        ) : (
          todayMeals.map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{m.name}</Text>
                <Text style={styles.mealMeta}>
                  {m.mealType} · {m.calories} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Habits */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Habits</Text>
        <HabitToggle
          label="Sleep 7+ hours"
          value={!!habit.sleepHours && habit.sleepHours >= 7}
          onToggle={(v) => setHabit(today, { sleepHours: v ? 8 : 5 })}
          testID="habit-sleep"
        />
        <HabitToggle
          label="Read 20 minutes"
          value={!!habit.reading}
          onToggle={(v) => setHabit(today, { reading: v })}
          testID="habit-reading"
        />
        <HabitToggle
          label="Recovery / Mobility"
          value={!!habit.recovery}
          onToggle={(v) => setHabit(today, { recovery: v })}
          testID="habit-recovery"
        />
        <HabitToggle
          label="Rest Day"
          value={!!habit.rest}
          onToggle={(v) => setHabit(today, { rest: v })}
          testID="habit-rest"
        />

        {/* 30-day strip */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Last 30 Days</Text>
        <View style={styles.strip}>
          {days30.map((d) => (
            <View
              key={d.date}
              style={[
                styles.stripDot,
                d.status === "done" && { backgroundColor: colors.success },
                d.status === "miss" && { backgroundColor: colors.error },
                d.status === "rest" && { backgroundColor: colors.onSurfaceTertiary },
                d.status === "future" && {
                  borderColor: colors.borderStrong,
                  borderWidth: 1,
                  backgroundColor: "transparent",
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Log Meal</Text>
            <View style={styles.chipRow}>
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                <Pressable
                  key={t}
                  testID={`meal-type-${t}`}
                  onPress={() => setMealType(t)}
                  style={[styles.chip, mealType === t && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="meal-name"
              value={foodName}
              onChangeText={setFoodName}
              placeholder="Food name"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            <View style={styles.row4}>
              <TextInput
                testID="meal-cals"
                value={cals}
                onChangeText={setCals}
                placeholder="kcal"
                keyboardType="numeric"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                testID="meal-protein"
                value={protein}
                onChangeText={setProtein}
                placeholder="protein g"
                keyboardType="numeric"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                testID="meal-carbs"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="carbs g"
                keyboardType="numeric"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                testID="meal-fat"
                value={fat}
                onChangeText={setFat}
                placeholder="fat g"
                keyboardType="numeric"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={[styles.input, styles.inputSmall]}
              />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
              <Pressable style={styles.btnSecondary} onPress={() => setShowAdd(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="meal-save"
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={saveMeal}
              >
                <Text style={styles.btnPrimaryText}>Save Meal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Ring({
  label,
  value,
  target,
  unit,
  testID,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  testID?: string;
}) {
  const pct = Math.min(1, value / Math.max(target, 1));
  return (
    <View style={styles.ring} testID={testID}>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringValue}>{value}</Text>
      <Text style={styles.ringTarget}>
        / {target}
        {unit || ""}
      </Text>
      <View style={styles.ringBar}>
        <View style={[styles.ringFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

function HabitToggle({
  label,
  value,
  onToggle,
  testID,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => onToggle(!value)}
      style={[styles.habit, value && { borderColor: colors.success }]}
    >
      <Text style={styles.habitLabel}>{label}</Text>
      <View
        style={[
          styles.toggle,
          value && { backgroundColor: colors.success, borderColor: colors.success },
        ]}
      >
        {value && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: "500" },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  scanText: { color: colors.onSurface, fontSize: font.sm, fontWeight: "500" },
  row3: { flexDirection: "row", gap: spacing.sm },
  ring: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  ringLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.2 },
  ringValue: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500", marginTop: 4 },
  ringTarget: { color: colors.onSurfaceTertiary, fontSize: font.sm },
  ringBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceTertiary,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  ringFill: { height: "100%", backgroundColor: colors.brand },
  waterRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  waterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  waterText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  addBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.onSurfaceTertiary, fontSize: font.base },
  mealRow: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  mealName: { color: colors.onSurface, fontSize: font.lg },
  mealMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  habit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  habitLabel: { color: colors.onSurface, fontSize: font.lg },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  stripDot: { width: 16, height: 16, borderRadius: 4, backgroundColor: colors.surfaceTertiary },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
  },
  modalTitle: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500", marginBottom: spacing.md },
  chipRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
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
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  inputSmall: { flex: 1, fontSize: font.base },
  row4: { flexDirection: "row", gap: spacing.sm },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnPrimaryText: { color: colors.onBrand, fontWeight: "500", fontSize: font.lg },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnSecondaryText: { color: colors.onSurfaceSecondary, fontSize: font.lg },
});
