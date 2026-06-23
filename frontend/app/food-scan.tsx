// AI Food Scan — Pro gated photo → estimate → confirm/edit → log.
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useStore, todayKey } from "@/src/store/levelup";
import { api } from "@/src/api";
import { colors, font, radius, spacing } from "@/src/theme";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface Estimate {
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingEstimate: string;
  confidence: number;
  disclaimer: string;
}

export default function FoodScan() {
  const router = useRouter();
  const { state, logMeal } = useStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [est, setEst] = useState<Estimate | null>(null);

  if (!state.pro) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.gateBox}>
          <Ionicons name="lock-closed" size={32} color={colors.brand} />
          <Text style={styles.gateTitle}>AI Food Scan is a Pro feature.</Text>
          <Text style={styles.gateBody}>
            Upgrade to LevelUp Pro to estimate macros from a single photo of
            your meal.
          </Text>
          <Pressable
            testID="food-scan-paywall"
            style={styles.btnPrimary}
            onPress={() => router.replace("/paywall")}
          >
            <Text style={styles.btnPrimaryText}>Unlock Pro</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
            <Text style={styles.linkText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPhotoUri(a.uri);
      setPhotoFile({
        uri: a.uri,
        name: a.fileName || "meal.jpg",
        type: a.mimeType || "image/jpeg",
      });
      setEst(null);
      setError(null);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera permission denied.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPhotoUri(a.uri);
      setPhotoFile({
        uri: a.uri,
        name: a.fileName || "meal.jpg",
        type: a.mimeType || "image/jpeg",
      });
      setEst(null);
      setError(null);
    }
  };

  const analyze = async () => {
    if (!photoFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeImage(photoFile, mealType, "pro");
      setEst(res);
    } catch (e: any) {
      if (e.code === "premium_required") {
        router.replace("/paywall");
        return;
      }
      setError(e.message || "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  const confirmLog = () => {
    if (!est) return;
    logMeal({
      date: todayKey(),
      mealType,
      name: est.items.join(", ") || "Scanned meal",
      calories: est.calories,
      protein: est.protein,
      carbs: est.carbs,
      fat: est.fat,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="food-scan-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Food Scan</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={48} color={colors.onSurfaceTertiary} />
            <Text style={styles.muted}>Take or select a photo of your meal.</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable testID="food-scan-camera" style={styles.iconBtn} onPress={pickFromCamera}>
            <Ionicons name="camera" size={18} color={colors.onSurface} />
            <Text style={styles.iconBtnText}>Camera</Text>
          </Pressable>
          <Pressable testID="food-scan-library" style={styles.iconBtn} onPress={pickFromLibrary}>
            <Ionicons name="image" size={18} color={colors.onSurface} />
            <Text style={styles.iconBtnText}>Library</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Meal type</Text>
        <View style={styles.chipRow}>
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
            <Pressable
              key={t}
              testID={`food-meal-type-${t}`}
              onPress={() => setMealType(t)}
              style={[styles.chip, mealType === t && styles.chipActive]}
            >
              <Text style={styles.chipText}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="food-scan-analyze"
          disabled={!photoFile || loading}
          onPress={analyze}
          style={[styles.btnPrimary, (!photoFile || loading) && { opacity: 0.5 }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.btnPrimaryText}>Analyze with AI Coach</Text>
          )}
        </Pressable>

        {error && (
          <Text style={styles.error} testID="food-scan-error">
            {error}
          </Text>
        )}

        {est && (
          <View style={styles.estCard} testID="food-scan-estimate">
            <Text style={styles.estTitle}>Estimate</Text>
            <Text style={styles.estDisclaimer}>{est.disclaimer}</Text>
            <Text style={styles.estItems}>{est.items.join(", ")}</Text>
            <Text style={styles.estMeta}>
              Serving: {est.servingEstimate} · Confidence{" "}
              {Math.round(est.confidence * 100)}%
            </Text>
            <View style={styles.row4}>
              <Editable label="kcal" value={est.calories} onChange={(v) => setEst({ ...est, calories: v })} testID="est-cals" />
              <Editable label="protein" value={est.protein} onChange={(v) => setEst({ ...est, protein: v })} testID="est-protein" />
              <Editable label="carbs" value={est.carbs} onChange={(v) => setEst({ ...est, carbs: v })} testID="est-carbs" />
              <Editable label="fat" value={est.fat} onChange={(v) => setEst({ ...est, fat: v })} testID="est-fat" />
            </View>
            <Pressable testID="food-scan-confirm" style={styles.btnPrimary} onPress={confirmLog}>
              <Text style={styles.btnPrimaryText}>Confirm & Log Meal</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Editable({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  testID?: string;
}) {
  return (
    <View style={styles.editable}>
      <Text style={styles.editableLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={String(value)}
        onChangeText={(t) => onChange(Number(t) || 0)}
        keyboardType="numeric"
        style={styles.editableInput}
      />
    </View>
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
  preview: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  placeholder: {
    height: 240,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  muted: { color: colors.onSurfaceTertiary, fontSize: font.base },
  iconBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: font.sm,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md,
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
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnPrimaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  error: { color: colors.error, fontSize: font.base, marginTop: spacing.md, textAlign: "center" },
  estCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
  },
  estTitle: { color: colors.onSurface, fontSize: font.xl, fontWeight: "500" },
  estDisclaimer: { color: colors.warning, fontSize: font.sm, marginTop: 4 },
  estItems: { color: colors.onSurface, fontSize: font.lg, marginTop: spacing.md },
  estMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 4 },
  row4: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  editable: { flex: 1 },
  editableLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.2 },
  editableInput: {
    color: colors.onSurface,
    fontSize: font.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    marginTop: 4,
    borderColor: colors.border,
    borderWidth: 1,
  },
  gateBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
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
  linkText: { color: colors.onSurfaceTertiary, fontSize: font.base },
});
