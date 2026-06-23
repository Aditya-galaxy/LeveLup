// LevelUp persistent store — single AsyncStorage-backed slice.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RankDef,
  MissionTier,
  computeXP,
  rankFromXP,
  missPenalty,
} from "@/src/domain/xp";

const STORAGE_KEY = "levelup.state.v1";

export type StatKey =
  | "Strength"
  | "Intelligence"
  | "Discipline"
  | "Charisma"
  | "Creativity"
  | "Vitality";

export type MissionCategory =
  | "Fitness"
  | "Mind"
  | "Discipline"
  | "Social"
  | "Creativity"
  | "Career"
  | "Health"
  | "Recovery";

export interface Mission {
  id: string;
  title: string;
  tier: MissionTier;
  category: MissionCategory;
  stats: StatKey[];
  pro?: boolean;
  custom?: boolean;
}

export interface Completion {
  id: string;
  missionId: string;
  date: string; // YYYY-MM-DD
  xpAwarded: number;
}

export interface Meal {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HabitLog {
  date: string;
  sleepHours?: number;
  hydrationMl?: number;
  reading?: boolean;
  recovery?: boolean;
  rest?: boolean;
}

export interface OnboardingData {
  goal: string;
  trainingDays: number;
  sessionLength: number;
  equipment: string[];
  literacy: Record<string, string>;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  calorieTarget?: number;
  proteinTarget?: number;
  waterTargetMl?: number;
}

export interface SystemAlert {
  id: string;
  category: string;
  observation: string;
  consequence: string;
  directive: string;
  createdAt: string;
  dismissed?: boolean;
}

export interface AppState {
  onboarded: boolean;
  appUserId: string; // RevenueCat-style id
  pro: boolean;
  profile: {
    name: string;
    avatarUrl?: string;
    onboarding?: OnboardingData;
  };
  xp: number;
  aura: number;
  streakDays: number;
  longestStreak: number;
  lastCompletionDate?: string;
  consecutiveMisses: number;
  penaltyZone: boolean;
  recoveryStreak: number;
  stats: Record<StatKey, number>;
  missions: Mission[];
  completions: Completion[];
  meals: Meal[];
  habits: Record<string, HabitLog>;
  achievements: string[];
  alerts: SystemAlert[];
  workoutPlan?: any;
  totalCompletions: number;
  perfectWeeks: number;
}

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: "m-primary-strength",
    title: "Primary Training: Full Workout",
    tier: "primary",
    category: "Fitness",
    stats: ["Strength", "Discipline"],
  },
  {
    id: "m-secondary-cardio",
    title: "20-Minute Conditioning",
    tier: "secondary",
    category: "Fitness",
    stats: ["Vitality"],
  },
  {
    id: "m-life-hydration",
    title: "Hit Hydration Target",
    tier: "lifestyle",
    category: "Health",
    stats: ["Vitality", "Discipline"],
  },
  {
    id: "m-life-reading",
    title: "Read 20 minutes",
    tier: "lifestyle",
    category: "Mind",
    stats: ["Intelligence"],
  },
  {
    id: "m-life-sleep",
    title: "Sleep 7+ hours",
    tier: "lifestyle",
    category: "Recovery",
    stats: ["Vitality", "Discipline"],
  },
];

const DEFAULT_STATE: AppState = {
  onboarded: false,
  appUserId: `user-${Math.random().toString(36).slice(2, 10)}`,
  pro: false,
  profile: { name: "Hunter" },
  xp: 0,
  aura: 0,
  streakDays: 0,
  longestStreak: 0,
  consecutiveMisses: 0,
  penaltyZone: false,
  recoveryStreak: 0,
  stats: {
    Strength: 5,
    Intelligence: 5,
    Discipline: 5,
    Charisma: 5,
    Creativity: 5,
    Vitality: 5,
  },
  missions: DEFAULT_MISSIONS,
  completions: [],
  meals: [],
  habits: {},
  achievements: [],
  alerts: [],
  totalCompletions: 0,
  perfectWeeks: 0,
};

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

let _state: AppState = DEFAULT_STATE;
let _loaded = false;
const _subs: Set<() => void> = new Set();

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn("persist failed", e);
  }
}

function notify() {
  _subs.forEach((fn) => fn());
}

async function loadOnce() {
  if (_loaded) return;
  _loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _state = { ...DEFAULT_STATE, ...parsed };
    }
  } catch {}
  notify();
}

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _subs.add(fn);
    loadOnce();
    return () => {
      _subs.delete(fn);
    };
  }, []);

  const state = _state;

  const setState = useCallback((patch: Partial<AppState>) => {
    _state = { ..._state, ...patch };
    persist();
    notify();
  }, []);

  const completeMission = useCallback((missionId: string) => {
    const mission = _state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const today = todayKey();
    if (
      _state.completions.some((c) => c.missionId === missionId && c.date === today)
    ) {
      return; // already completed today
    }

    const xpGain = computeXP({
      tier: mission.tier,
      xp: _state.xp,
      streakDays: _state.streakDays,
      penaltyZone: _state.penaltyZone,
    });

    const stats = { ..._state.stats };
    mission.stats.forEach((k) => {
      stats[k] = Math.min(100, stats[k] + (mission.tier === "primary" ? 2 : 1));
    });

    let streak = _state.streakDays;
    if (_state.lastCompletionDate !== today) {
      const yesterday = todayKey(new Date(Date.now() - 86400000));
      streak =
        _state.lastCompletionDate === yesterday ? streak + 1 : 1;
    }

    let aura = _state.aura + (mission.tier === "primary" ? 1 : 0);

    // recovery streak handling
    let recovery = _state.recoveryStreak;
    let penaltyZone = _state.penaltyZone;
    let consecutiveMisses = 0; // reset on completion
    if (penaltyZone) {
      recovery += 1;
      if (recovery >= 5) {
        penaltyZone = false;
        recovery = 0;
      }
    }

    const achievements = new Set(_state.achievements);
    const totalCompletions = _state.totalCompletions + 1;
    if (totalCompletions === 1) achievements.add("First Mission");
    if (streak >= 7) achievements.add("7-Day Streak");
    if (streak >= 30) achievements.add("30-Day Streak");
    if (totalCompletions >= 100) achievements.add("100 Missions");
    if (aura >= 100) achievements.add("Aura 100+");
    achievements.add(`First ${mission.category}`);

    _state = {
      ..._state,
      xp: _state.xp + xpGain,
      aura,
      stats,
      streakDays: streak,
      longestStreak: Math.max(_state.longestStreak, streak),
      lastCompletionDate: today,
      consecutiveMisses,
      penaltyZone,
      recoveryStreak: recovery,
      completions: [
        ..._state.completions,
        {
          id: `c-${Date.now()}`,
          missionId,
          date: today,
          xpAwarded: xpGain,
        },
      ],
      achievements: Array.from(achievements),
      totalCompletions,
    };
    persist();
    notify();
    return xpGain;
  }, []);

  const missMission = useCallback((missionId: string) => {
    const mission = _state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const penalty = missPenalty(mission.tier);
    const consecutive = _state.consecutiveMisses + 1;
    const penaltyZone = consecutive >= 3 ? true : _state.penaltyZone;

    _state = {
      ..._state,
      xp: Math.max(0, _state.xp + penalty),
      consecutiveMisses: consecutive,
      penaltyZone,
      recoveryStreak: penaltyZone ? 0 : _state.recoveryStreak,
      streakDays: 0,
    };
    persist();
    notify();
    return penalty;
  }, []);

  const logMeal = useCallback((meal: Omit<Meal, "id">) => {
    const m: Meal = { ...meal, id: `meal-${Date.now()}` };
    _state = { ..._state, meals: [..._state.meals, m] };
    persist();
    notify();
  }, []);

  const setHabit = useCallback((date: string, patch: Partial<HabitLog>) => {
    const prev = _state.habits[date] || { date };
    _state = {
      ..._state,
      habits: { ..._state.habits, [date]: { ...prev, ...patch, date } },
    };
    persist();
    notify();
  }, []);

  const addAlert = useCallback((a: Omit<SystemAlert, "id" | "createdAt">) => {
    const alert: SystemAlert = {
      ...a,
      id: `a-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    _state = { ..._state, alerts: [alert, ..._state.alerts] };
    persist();
    notify();
  }, []);

  const dismissAlert = useCallback((id: string) => {
    _state = {
      ..._state,
      alerts: _state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    };
    persist();
    notify();
  }, []);

  const setPro = useCallback((pro: boolean) => {
    _state = { ..._state, pro };
    persist();
    notify();
  }, []);

  const addCustomMission = useCallback(
    (m: Omit<Mission, "id" | "custom">) => {
      const mission: Mission = {
        ...m,
        id: `cm-${Date.now()}`,
        custom: true,
      };
      _state = { ..._state, missions: [..._state.missions, mission] };
      persist();
      notify();
    },
    []
  );

  const resetAll = useCallback(async () => {
    _state = { ...DEFAULT_STATE, appUserId: _state.appUserId };
    await AsyncStorage.removeItem(STORAGE_KEY);
    notify();
  }, []);

  const rank: RankDef = useMemo(() => rankFromXP(state.xp), [state.xp]);

  return {
    state,
    rank,
    setState,
    completeMission,
    missMission,
    logMeal,
    setHabit,
    addAlert,
    dismissAlert,
    setPro,
    addCustomMission,
    resetAll,
  };
}

export { DEFAULT_STATE };
