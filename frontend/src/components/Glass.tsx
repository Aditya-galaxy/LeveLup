// LevelUp Glass primitives — frosted dark cards over near-black canvas.
import { ReactNode } from "react";
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, typography } from "@/src/theme";

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  intensity?: number;
  borderColor?: string;
  testID?: string;
  noHighlight?: boolean;
}

/**
 * Frosted glass card.
 * - Uses BlurView on iOS for native frosted feel.
 * - Falls back to translucent fill on Android/web with a subtle inner highlight.
 */
export function GlassCard({
  children,
  style,
  elevated,
  intensity = 30,
  borderColor,
  testID,
  noHighlight,
}: GlassCardProps) {
  const fill = elevated ? colors.glassElevated : colors.glass;
  const border = borderColor || colors.glassBorder;
  const r = elevated ? radius.xl : radius.lg;

  const supportsBlur = Platform.OS === "ios" || Platform.OS === "android";

  return (
    <View
      testID={testID}
      style={[
        styles.cardBase,
        { borderRadius: r, borderColor: border, backgroundColor: fill },
        style,
      ]}
    >
      {supportsBlur && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
      )}
      {/* Inner top highlight to mimic glass refraction */}
      {!noHighlight && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.innerHighlight, "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.35 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r, opacity: 0.7 }]}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

interface PrimaryButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "ghost" | "danger";
  fullWidth?: boolean;
  small?: boolean;
}

export function GlassButton({
  label,
  loading,
  style,
  variant = "primary",
  fullWidth,
  small,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        variant === "primary" && styles.btnPrimary,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        fullWidth && { width: "100%" },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {variant === "primary" && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.innerHighlight, "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.md, opacity: 0.6 }]}
        />
      )}
      <Text
        style={[
          styles.btnText,
          variant === "primary" && { color: "#0B0C12" },
          variant === "ghost" && { color: colors.text },
          variant === "danger" && { color: colors.danger },
          small && { fontSize: 14 },
        ]}
      >
        {loading ? "…" : label}
      </Text>
    </Pressable>
  );
}

interface PillProps {
  label: string;
  tone?: "neutral" | "accent" | "success" | "danger" | "warning";
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tone = "neutral", small, style }: PillProps) {
  const map = {
    neutral: { bg: colors.glass, border: colors.glassBorder, text: colors.textSecondary },
    accent: { bg: colors.accentSoft, border: "rgba(83,74,183,0.45)", text: "#C9C3FF" },
    success: { bg: colors.successSoft, border: "rgba(29,158,117,0.45)", text: "#7DEABF" },
    danger: { bg: colors.dangerSoft, border: "rgba(229,72,77,0.45)", text: "#FFB1B3" },
    warning: { bg: "rgba(245,165,36,0.18)", border: "rgba(245,165,36,0.45)", text: "#FFD080" },
  }[tone];
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: map.bg, borderColor: map.border },
        small && { paddingVertical: 3, paddingHorizontal: 8 },
        style,
      ]}
    >
      <Text style={[styles.pillText, { color: map.text }, small && { fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

interface ProgressBarProps {
  progress: number; // 0..1
  height?: number;
  color?: string;
  testID?: string;
}

export function ProgressBar({ progress, height = 6, color = colors.accent, testID }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      testID={testID}
      style={[styles.progressBar, { height, borderRadius: height / 2 }]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.max(2, pct * 100)}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.55,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: colors.glass,
  },
  content: { padding: spacing.lg },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  btnSmall: { paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  btnPrimary: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  btnGhost: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
  },
  btnDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(229,72,77,0.45)",
  },
  btnText: { ...typography.headline, color: colors.text },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  progressBar: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.track,
  },
  progressFill: {},
});
