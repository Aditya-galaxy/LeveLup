// LevelUp guided session — step generator + helpers.
// Pure functions, no React. Build a step-by-step routine that fits a target
// session length (e.g. 45 min) given a workout day from the AI/deterministic plan.

export type SessionStep =
  | {
      kind: "warmup";
      title: string;
      detail: string;
      duration: number; // seconds
    }
  | {
      kind: "work";
      exerciseName: string;
      setIndex: number; // 1-based
      totalSets: number;
      reps: string;
      cue: string;
      duration: number; // seconds
    }
  | {
      kind: "rest";
      duration: number;
      nextExercise?: string;
      nextSet?: number;
      totalSets?: number;
    }
  | {
      kind: "cooldown";
      title: string;
      detail: string;
      duration: number;
    };

function parseRest(rest: string | number): number {
  if (typeof rest === "number") return Math.max(20, Math.min(300, rest));
  const s = String(rest).toLowerCase().trim();
  const m = s.match(/(\d+)\s*s/);
  if (m) return Math.max(20, Math.min(300, parseInt(m[1])));
  const mm = s.match(/(\d+)\s*m/);
  if (mm) return Math.max(20, Math.min(300, parseInt(mm[1]) * 60));
  const num = parseInt(s);
  if (!isNaN(num)) return Math.max(20, Math.min(300, num));
  return 75;
}

function parseSets(sets: any): number {
  const n = Number(sets);
  if (!isNaN(n) && n > 0 && n < 12) return Math.floor(n);
  return 3;
}

function workDuration(reps: string): number {
  // AMRAP / time-based reps → 45s
  const s = String(reps).toLowerCase();
  if (s.includes("amrap") || s.includes("max")) return 45;
  if (s.includes("min") || s.includes("sec")) {
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1]) * (s.includes("min") ? 60 : 1) : 45;
  }
  // count-based: ~3s per rep, min 30s max 75s
  const m = s.match(/(\d+)/);
  if (m) {
    const reps = parseInt(m[1]);
    return Math.max(30, Math.min(75, reps * 3));
  }
  return 45;
}

export interface SessionInfo {
  steps: SessionStep[];
  totalDurationSec: number;
  workSec: number;
  restSec: number;
}

/**
 * Build a timed routine from a workout day and a target session length (min).
 * Format: 5 min warmup + work-rest blocks per exercise + 5 min cooldown,
 * scaled to fit total target.
 */
export function buildSession(day: any, targetMinutes = 45): SessionInfo {
  const target = Math.max(15, targetMinutes) * 60;

  // Warmup steps (~5 min)
  const warmupRaw: string[] =
    Array.isArray(day?.warmup) && day.warmup.length > 0
      ? day.warmup
      : [
          "5 min general (bike / jog / jump rope)",
          "World's greatest stretch x 5/side",
          "2 activation sets at 50-60% load",
        ];
  const warmupTotal = Math.min(360, Math.max(180, Math.floor(target * 0.12)));
  const perWarmup = Math.floor(warmupTotal / warmupRaw.length);
  const warmup: SessionStep[] = warmupRaw.map((w, i) => ({
    kind: "warmup" as const,
    title: i === 0 ? "Warmup" : `Warmup ${i + 1}`,
    detail: w,
    duration: perWarmup,
  }));

  // Build full work + rest list first, then trim sets to fit budget.
  const exercises: any[] = Array.isArray(day?.exercises) ? day.exercises : [];
  const cooldownTotal = Math.min(300, Math.max(120, Math.floor(target * 0.08)));
  const workBudget = target - warmupTotal - cooldownTotal;

  type WorkBlock = { ex: any; sets: number; restSec: number; workSec: number };
  let blocks: WorkBlock[] = exercises.map((e) => {
    const sets = parseSets(e.sets);
    const rest = parseRest(e.rest);
    const work = workDuration(String(e.reps));
    return { ex: e, sets, restSec: rest, workSec: work };
  });

  // Total work+rest sum
  const blockCost = (b: WorkBlock) =>
    b.sets * b.workSec + Math.max(0, b.sets - 1) * b.restSec;
  let total = blocks.reduce((s, b) => s + blockCost(b), 0);

  // Trim sets if over budget (drop last set from largest block until fits)
  while (total > workBudget && blocks.some((b) => b.sets > 1)) {
    const idx = blocks.reduce(
      (best, b, i) => (b.sets > blocks[best].sets ? i : best),
      0
    );
    blocks[idx].sets -= 1;
    total = blocks.reduce((s, b) => s + blockCost(b), 0);
  }

  // Add a small inter-exercise rest if budget allows
  const interExRest = Math.min(60, Math.floor((workBudget - total) / Math.max(1, blocks.length - 1)));

  const work: SessionStep[] = [];
  blocks.forEach((b, bi) => {
    for (let s = 1; s <= b.sets; s++) {
      work.push({
        kind: "work",
        exerciseName: b.ex.name,
        setIndex: s,
        totalSets: b.sets,
        reps: String(b.ex.reps),
        cue: String(b.ex.cue || ""),
        duration: b.workSec,
      });
      const isLastSetOfBlock = s === b.sets;
      const isLastBlock = bi === blocks.length - 1;
      if (isLastSetOfBlock && !isLastBlock) {
        // Inter-exercise rest
        const next = blocks[bi + 1];
        work.push({
          kind: "rest",
          duration: Math.max(b.restSec, interExRest),
          nextExercise: next.ex.name,
          nextSet: 1,
          totalSets: next.sets,
        });
      } else if (!isLastSetOfBlock) {
        work.push({
          kind: "rest",
          duration: b.restSec,
          nextExercise: b.ex.name,
          nextSet: s + 1,
          totalSets: b.sets,
        });
      }
    }
  });

  // Cooldown
  const cooldown: SessionStep[] = [
    {
      kind: "cooldown",
      title: "Down-regulation",
      detail: "Slow walk + nasal breathing",
      duration: Math.floor(cooldownTotal * 0.6),
    },
    {
      kind: "cooldown",
      title: "Static stretches",
      detail: "Target worked muscles · 30s each",
      duration: cooldownTotal - Math.floor(cooldownTotal * 0.6),
    },
  ];

  const steps = [...warmup, ...work, ...cooldown];
  const totalDuration = steps.reduce((s, st) => s + st.duration, 0);
  const workSec = work
    .filter((s) => s.kind === "work")
    .reduce((s, st) => s + st.duration, 0);
  const restSec = work
    .filter((s) => s.kind === "rest")
    .reduce((s, st) => s + st.duration, 0);

  return { steps, totalDurationSec: totalDuration, workSec, restSec };
}

export function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

/** Day index for today against a plan of N days (mon-based rotation). */
export function todayDayIndex(daysInPlan: number): number {
  const dow = new Date().getDay(); // 0 sun..6 sat
  // Anchor: Monday = day 1 in plan.
  const mondayBased = (dow + 6) % 7; // mon=0..sun=6
  return mondayBased % Math.max(1, daysInPlan);
}
