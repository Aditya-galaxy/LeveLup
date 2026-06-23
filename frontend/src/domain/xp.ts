// LevelUp domain logic — pure & testable.
// XP, ranks, levels, streak bonuses, miss penalties.

export type RankCode = "E" | "D" | "C" | "B" | "A" | "S";

export interface RankDef {
  code: RankCode;
  name: string;
  min: number;
  max: number;
  multiplier: number;
}

export const RANKS: RankDef[] = [
  { code: "E", name: "Awakened", min: 0, max: 999, multiplier: 1.0 },
  { code: "D", name: "Iron Hunter", min: 1000, max: 2999, multiplier: 1.25 },
  { code: "C", name: "Steel Hunter", min: 3000, max: 5999, multiplier: 1.5 },
  { code: "B", name: "Void Hunter", min: 6000, max: 9999, multiplier: 1.75 },
  { code: "A", name: "Elite Hunter", min: 10000, max: 19999, multiplier: 2.0 },
  { code: "S", name: "Apex Hunter", min: 20000, max: Infinity, multiplier: 2.5 },
];

export function rankFromXP(xp: number): RankDef {
  for (const r of RANKS) if (xp >= r.min && xp <= r.max) return r;
  return RANKS[RANKS.length - 1];
}

/**
 * Sub-levels 1–10 per rank, each ~15% harder.
 * Returns 1..10.
 */
export function levelFromXP(xp: number): number {
  const r = rankFromXP(xp);
  if (!isFinite(r.max)) {
    // S-class: every 5000 xp past 20000 is one sub-level, capped at 10.
    return Math.min(10, 1 + Math.floor((xp - r.min) / 5000));
  }
  const rangeXP = r.max - r.min + 1;
  // 10 escalating thresholds with ratio 1.15
  const ratios: number[] = [];
  let acc = 0;
  for (let i = 0; i < 10; i++) {
    const w = Math.pow(1.15, i);
    acc += w;
    ratios.push(acc);
  }
  const total = ratios[ratios.length - 1];
  const into = xp - r.min;
  const target = (into / rangeXP) * total;
  for (let i = 0; i < 10; i++) if (target < ratios[i]) return i + 1;
  return 10;
}

/** XP progress within current rank, 0..1 */
export function rankProgress(xp: number): number {
  const r = rankFromXP(xp);
  if (!isFinite(r.max)) {
    const over = Math.min(1, (xp - r.min) / 50000);
    return over;
  }
  return Math.min(1, Math.max(0, (xp - r.min) / (r.max - r.min)));
}

/**
 * Apply streak bonus to base XP.
 * 7 day +10%, 30 day +20%.
 */
export function streakBonus(streakDays: number): number {
  if (streakDays >= 30) return 1.2;
  if (streakDays >= 7) return 1.1;
  return 1.0;
}

/** Penalty Zone multiplier: 0.5x if active. */
export function penaltyMultiplier(active: boolean): number {
  return active ? 0.5 : 1.0;
}

export type MissionTier = "primary" | "secondary" | "lifestyle";

export function baseXP(tier: MissionTier): number {
  switch (tier) {
    case "primary":
      return 150;
    case "secondary":
      return 60;
    case "lifestyle":
      return 35;
  }
}

export function missPenalty(tier: MissionTier): number {
  switch (tier) {
    case "primary":
      return -75;
    case "secondary":
      return -50;
    case "lifestyle":
      return -25;
  }
}

/**
 * Compute final XP for a completion.
 * xp = base * rankMultiplier * streakBonus * penaltyMultiplier
 */
export function computeXP(opts: {
  tier: MissionTier;
  xp: number; // current total xp -> rank lookup
  streakDays: number;
  penaltyZone: boolean;
}): number {
  const r = rankFromXP(opts.xp);
  const base = baseXP(opts.tier);
  const final =
    base *
    r.multiplier *
    streakBonus(opts.streakDays) *
    penaltyMultiplier(opts.penaltyZone);
  return Math.round(final);
}

export interface RankUpResult {
  ranked: boolean;
  from?: RankDef;
  to?: RankDef;
}

export function checkRankUp(prevXP: number, nextXP: number): RankUpResult {
  const a = rankFromXP(prevXP);
  const b = rankFromXP(nextXP);
  return a.code !== b.code ? { ranked: true, from: a, to: b } : { ranked: false };
}

export const RANK_UP_MESSAGE = (from: string, to: RankDef) =>
  `RANK UP. ${from} → ${to.code}-Class ${to.name}. New mission tier active. The System acknowledges your progression. Continue.`;
