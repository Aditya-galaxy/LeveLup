// LevelUp design tokens — slick black glassmorphism.
// Source: artifacts/tokens.json + DESIGN.md.

export const colors = {
  // Canvas
  bgDeep: "#030407",
  bg: "#06070A",
  surface: "#101116",
  elevated: "#171923",
  card: "#12141B",

  // Glass (over near-black canvas)
  glass: "rgba(255,255,255,0.055)",
  glassElevated: "rgba(255,255,255,0.085)",
  glassBorder: "rgba(255,255,255,0.12)",
  glassBorderStrong: "rgba(255,255,255,0.22)",
  innerHighlight: "rgba(255,255,255,0.18)",

  // Type
  text: "#FFFFFF",
  textSecondary: "#A3A7B3",
  textMuted: "#6D7280",

  // Accent
  accent: "#534AB7",
  accentSoft: "rgba(83,74,183,0.18)",
  accentGlow: "rgba(83,74,183,0.35)",

  // Semantic
  success: "#1D9E75",
  successSoft: "rgba(29,158,117,0.18)",
  danger: "#E5484D",
  dangerSoft: "rgba(229,72,77,0.18)",
  warning: "#F5A524",

  // Tracks
  track: "rgba(255,255,255,0.06)",
  border: "#2A2D38",

  // --- Backwards-compat aliases (legacy screens) ---
  surface: "#06070A",
  onSurface: "#FFFFFF",
  surfaceSecondary: "rgba(255,255,255,0.055)",
  onSurfaceSecondary: "#FFFFFF",
  surfaceTertiary: "rgba(255,255,255,0.085)",
  onSurfaceTertiary: "#A3A7B3",
  brand: "#534AB7",
  brandSecondary: "#3E378A",
  brandTertiary: "rgba(83,74,183,0.18)",
  onBrand: "#0B0C12",
  borderStrong: "rgba(255,255,255,0.22)",
  divider: "rgba(255,255,255,0.06)",
  info: "#477CE6",
  error: "#E5484D",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const font = {
  caption: 12,
  body: 15,
  headline: 17,
  cardTitle: 20,
  title: 24,
  display: 34,
  metric: 28,
  // legacy aliases
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: "700" as const,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 21 },
  bodyMedium: { fontSize: 15, fontWeight: "500" as const, lineHeight: 21 },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  metric: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
};
