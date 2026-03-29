import type { BodyMetricEntry } from "@/lib/health-store";

export type GymSplit = "PUSH" | "PULL" | "LEGS" | "REST";

export interface GymSet {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface GymExerciseLog {
  id: string;
  name: string;
  sets: GymSet[];
  volume: number;
}

export interface WorkoutSession {
  id: string;
  date: string;
  startTime: number;
  endTime: number | null;
  split: GymSplit;
  exercises: GymExerciseLog[];
  energyBefore: number;
  energyAfter: number;
  totalVolume: number;
  prsHit: number;
  completedExercises: number;
  sessionPr: boolean;
}

export interface ExerciseStats {
  name: string;
  bestWeight: number;
  bestSetReps: number;
  bestVolume: number;
  totalReps: number;
  totalVolume: number;
  sessions: number;
  firstBestWeight: number;
  latestBestWeight: number;
  firstSessionVol: number;
  latestSessionVol: number;
  improvementKg: number;
  improvementPct: number;
}

export interface PreviousExerciseSnapshot {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
}

export interface ExerciseProgress {
  tone: "up" | "down" | "match" | "flat";
  label: string;
  isNewPr: boolean;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  date: string;
  split: GymSplit;
  sets: GymSet[];
  volume: number;
}

export interface GymOverview {
  totalSessions: number;
  totalVolumeKg: number;
  totalVolumeTonnes: string;
  currentStreak: number;
  maxStreak: number;
  favSplit: GymSplit | "-";
  mostImprovedExercise: {
    name: string;
    pct: number;
    kg: number;
  } | null;
}

const KEYS = {
  workouts: "momentum_gym_workouts",
  activeWorkout: "momentum_gym_active",
} as const;

export const ROUTINES: Record<GymSplit, string[]> = {
  PUSH: [
    "Flat Bench Press (Barbell)",
    "Incline Bench Press (Dumbbell)",
    "Overhead Press (Barbell)",
    "Lateral Raises (Dumbbell)",
    "Tricep Pushdown (Cable)",
    "Skull Crushers (EZ Bar)",
    "Chest Dips",
  ],
  PULL: [
    "Deadlift (Barbell)",
    "Pull Ups / Lat Pulldown",
    "Seated Cable Row",
    "Single Arm Dumbbell Row",
    "Face Pulls (Cable)",
    "Barbell Curl",
    "Hammer Curl (Dumbbell)",
    "Reverse Curl",
  ],
  LEGS: [
    "Barbell Squat",
    "Romanian Deadlift",
    "Leg Press (Machine)",
    "Leg Extension (Machine)",
    "Leg Curl (Machine)",
    "Standing Calf Raises",
    "Lunges (Dumbbell)",
    "Hip Thrust (Barbell)",
  ],
  REST: [],
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function getTopSet(sets: GymSet[]): GymSet | null {
  return (
    sets
      .filter((set) => set.completed)
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        return b.reps - a.reps;
      })[0] ?? null
  );
}

function getExerciseVolume(sets: GymSet[]): number {
  return sets.reduce((sum, set) => {
    if (!set.completed) return sum;
    return sum + set.weight * set.reps;
  }, 0);
}

function getIsoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

function getWorkoutDates(): string[] {
  return Array.from(new Set(getWorkouts().map((workout) => workout.date))).sort();
}

export function getTodaySplit(date = new Date()): GymSplit {
  const map: Record<number, GymSplit> = {
    1: "PUSH",
    2: "PULL",
    3: "LEGS",
    4: "REST",
    5: "PUSH",
    6: "PULL",
    0: "LEGS",
  };
  return map[date.getDay()];
}

export function getWorkouts(): WorkoutSession[] {
  return read<WorkoutSession[]>(KEYS.workouts, []);
}

export function saveWorkout(session: WorkoutSession) {
  const all = getWorkouts();
  const index = all.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    all[index] = session;
  } else {
    all.push(session);
  }
  all.sort((a, b) => b.startTime - a.startTime);
  write(KEYS.workouts, all);
}

export function getActiveWorkout(): WorkoutSession | null {
  return read<WorkoutSession | null>(KEYS.activeWorkout, null);
}

export function saveActiveWorkout(session: WorkoutSession | null) {
  write(KEYS.activeWorkout, session);
}

export function finishActiveWorkout(energyAfter: number): WorkoutSession | null {
  const active = getActiveWorkout();
  if (!active) return null;

  const history = getWorkouts();
  let totalVolume = 0;
  let prsHit = 0;
  let completedExercises = 0;

  const exercises = active.exercises.map((exercise) => {
    const volume = getExerciseVolume(exercise.sets);
    const completedSets = exercise.sets.filter((set) => set.completed);
    const topSet = getTopSet(exercise.sets);
    const pastLogs = history
      .flatMap((workout) => workout.exercises.filter((item) => item.name === exercise.name))
      .filter((item) => item.volume > 0);

    const bestPastWeight = Math.max(
      0,
      ...pastLogs.flatMap((item) =>
        item.sets.filter((set) => set.completed).map((set) => set.weight),
      ),
    );
    const bestPastVolume = Math.max(0, ...pastLogs.map((item) => item.volume));

    const hitPr =
      (topSet !== null && topSet.weight > bestPastWeight) ||
      (volume > 0 && volume > bestPastVolume);

    if (completedSets.length > 0) {
      completedExercises += 1;
    }
    if (hitPr) {
      prsHit += 1;
    }

    totalVolume += volume;
    return { ...exercise, volume };
  });

  const highestPastSessionVolume = Math.max(0, ...history.map((item) => item.totalVolume));
  const finished: WorkoutSession = {
    ...active,
    exercises,
    endTime: Date.now(),
    energyAfter,
    totalVolume,
    prsHit,
    completedExercises,
    sessionPr: totalVolume > 0 && totalVolume > highestPastSessionVolume,
  };

  saveWorkout(finished);
  saveActiveWorkout(null);
  return finished;
}

export function getExerciseHistory(name: string): ExerciseHistoryEntry[] {
  return getWorkouts()
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.name === name && exercise.volume > 0)
        .map((exercise) => ({
          workoutId: workout.id,
          date: workout.date,
          split: workout.split,
          sets: exercise.sets,
          volume: exercise.volume,
        })),
    );
}

export function getExerciseStats(name: string): ExerciseStats {
  const history = getExerciseHistory(name);
  let bestWeight = 0;
  let bestSetReps = 0;
  let bestVolume = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let firstBestWeight = 0;
  let latestBestWeight = 0;
  let firstSessionVol = 0;
  let latestSessionVol = 0;

  history.forEach((entry, index) => {
    const topSet = getTopSet(entry.sets);
    const topWeight = topSet?.weight ?? 0;
    const topReps = topSet?.reps ?? 0;
    if (index === 0) {
      firstBestWeight = topWeight;
      firstSessionVol = entry.volume;
    }
    latestBestWeight = topWeight;
    latestSessionVol = entry.volume;
    bestVolume = Math.max(bestVolume, entry.volume);
    totalVolume += entry.volume;

    entry.sets.forEach((set) => {
      if (!set.completed) return;
      totalReps += set.reps;
      if (set.weight > bestWeight || (set.weight === bestWeight && set.reps > bestSetReps)) {
        bestWeight = set.weight;
        bestSetReps = set.reps;
      }
    });
  });

  const improvementKg = latestBestWeight - firstBestWeight;
  const improvementPct = firstBestWeight > 0 ? (improvementKg / firstBestWeight) * 100 : 0;

  return {
    name,
    bestWeight,
    bestSetReps,
    bestVolume,
    totalReps,
    totalVolume,
    sessions: history.length,
    firstBestWeight,
    latestBestWeight,
    firstSessionVol,
    latestSessionVol,
    improvementKg,
    improvementPct,
  };
}

export function getAllExerciseStats(): ExerciseStats[] {
  const names = new Set(
    getWorkouts().flatMap((workout) => workout.exercises.map((exercise) => exercise.name)),
  );
  return Array.from(names).map((name) => getExerciseStats(name));
}

export function getLastSessionData(name: string): PreviousExerciseSnapshot | null {
  const match = getExerciseHistory(name).at(-1);
  if (!match) return null;
  const topSet = getTopSet(match.sets);
  return {
    date: match.date,
    weight: topSet?.weight ?? 0,
    reps: topSet?.reps ?? 0,
    sets: match.sets.filter((set) => set.completed).length,
    volume: match.volume,
  };
}

export function getExercisePersonalBest(name: string): PreviousExerciseSnapshot | null {
  const history = getExerciseHistory(name);
  if (history.length === 0) return null;

  let best: PreviousExerciseSnapshot | null = null;
  history.forEach((entry) => {
    const topSet = getTopSet(entry.sets);
    if (!topSet) return;

    const snapshot: PreviousExerciseSnapshot = {
      date: entry.date,
      weight: topSet.weight,
      reps: topSet.reps,
      sets: entry.sets.filter((set) => set.completed).length,
      volume: entry.volume,
    };

    if (
      best === null ||
      snapshot.weight > best.weight ||
      (snapshot.weight === best.weight && snapshot.reps > best.reps)
    ) {
      best = snapshot;
    }
  });

  return best;
}

export function getExerciseProgress(name: string, currentSets: GymSet[]): ExerciseProgress | null {
  const lastSession = getLastSessionData(name);
  const currentTopSet = getTopSet(currentSets);
  if (!lastSession || !currentTopSet) return null;

  const bestEver = getExercisePersonalBest(name);
  const isNewPr =
    bestEver !== null &&
    (currentTopSet.weight > bestEver.weight ||
      (currentTopSet.weight === bestEver.weight && currentTopSet.reps > bestEver.reps));

  if (currentTopSet.weight > lastSession.weight) {
    return {
      tone: "up",
      label: `↑ +${currentTopSet.weight - lastSession.weight}kg from last session`,
      isNewPr,
    };
  }

  if (currentTopSet.weight === lastSession.weight && currentTopSet.reps > lastSession.reps) {
    return {
      tone: "up",
      label: `→ Same weight, +${currentTopSet.reps - lastSession.reps} reps`,
      isNewPr,
    };
  }

  if (currentTopSet.weight < lastSession.weight) {
    return {
      tone: "down",
      label: `↓ -${lastSession.weight - currentTopSet.weight}kg from last session`,
      isNewPr,
    };
  }

  if (currentTopSet.reps === lastSession.reps) {
    return {
      tone: "match",
      label: "= Matched last session",
      isNewPr,
    };
  }

  return {
    tone: "flat",
    label: `→ ${currentTopSet.reps - lastSession.reps} rep change at same weight`,
    isNewPr,
  };
}

export function getGymThisWeek(): number {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - diffToMonday);
  const mondayIso = monday.toISOString().split("T")[0];
  return getWorkouts().filter((session) => session.date >= mondayIso).length;
}

export function getGymOverview(): GymOverview {
  const workouts = getWorkouts();
  const totalSessions = workouts.length;
  const totalVolumeKg = workouts.reduce((sum, workout) => sum + workout.totalVolume, 0);

  const dates = getWorkoutDates();
  let maxStreak = 0;
  let tempStreak = 0;

  dates.forEach((date, index) => {
    if (index === 0) {
      tempStreak = 1;
      maxStreak = 1;
      return;
    }

    const previous = new Date(dates[index - 1]).getTime();
    const current = new Date(date).getTime();
    const diffDays = Math.round((current - previous) / 86400000);
    tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    maxStreak = Math.max(maxStreak, tempStreak);
  });

  let currentStreak = 0;
  let cursor = new Date();
  const dateSet = new Set(dates);
  const hasToday = dateSet.has(getIsoDate(0));
  const hasYesterday = dateSet.has(getIsoDate(-1));

  if (hasToday || hasYesterday) {
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(cursor.toISOString().split("T")[0])) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const splitCounts = workouts.reduce<Record<GymSplit, number>>(
    (acc, workout) => {
      acc[workout.split] += 1;
      return acc;
    },
    { PUSH: 0, PULL: 0, LEGS: 0, REST: 0 },
  );

  const favSplit =
    (Object.entries(splitCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as GymSplit | undefined) ?? "-";

  const mostImprovedExercise =
    getAllExerciseStats()
      .filter((stat) => stat.sessions >= 2 && stat.firstBestWeight > 0)
      .sort((a, b) => b.improvementPct - a.improvementPct)[0] ?? null;

  return {
    totalSessions,
    totalVolumeKg,
    totalVolumeTonnes: (totalVolumeKg / 1000).toFixed(1),
    currentStreak,
    maxStreak,
    favSplit,
    mostImprovedExercise: mostImprovedExercise
      ? {
          name: mostImprovedExercise.name,
          pct: mostImprovedExercise.improvementPct,
          kg: mostImprovedExercise.improvementKg,
        }
      : null,
  };
}

export function getRecentSessions(limit = 4): WorkoutSession[] {
  return getWorkouts().slice(0, limit);
}

export function getWeightCorrelationInsight(metrics: BodyMetricEntry[]): string {
  if (metrics.length < 2) {
    return "Log a few weigh-ins to see how gym frequency affects weight loss.";
  }

  const weeklySessions = getWorkouts().reduce<Record<string, number>>((acc, workout) => {
    const date = new Date(workout.date);
    const monday = new Date(date);
    const diffToMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
    monday.setDate(date.getDate() - diffToMonday);
    const key = monday.toISOString().split("T")[0];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const weighInsByWeek = metrics.reduce<Record<string, BodyMetricEntry[]>>((acc, metric) => {
    const date = new Date(metric.date);
    const monday = new Date(date);
    const diffToMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
    monday.setDate(date.getDate() - diffToMonday);
    const key = monday.toISOString().split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(metric);
    acc[key].sort((a, b) => a.date.localeCompare(b.date));
    return acc;
  }, {});

  let fiveDayWeeks = 0;
  let fiveDayLoss = 0;
  let lowerWeeks = 0;
  let lowerLoss = 0;

  Object.entries(weighInsByWeek).forEach(([week, weighIns]) => {
    if (weighIns.length < 2) return;
    const delta = weighIns[0].weight - weighIns[weighIns.length - 1].weight;
    if ((weeklySessions[week] || 0) >= 5) {
      fiveDayWeeks += 1;
      fiveDayLoss += delta;
    } else {
      lowerWeeks += 1;
      lowerLoss += delta;
    }
  });

  if (fiveDayWeeks === 0) {
    return "Hit one full 5-session week to unlock a clean weight-loss correlation.";
  }

  const fiveDayAvg = fiveDayLoss / fiveDayWeeks;
  if (lowerWeeks === 0) {
    return `Your 5-session weeks are averaging ${fiveDayAvg.toFixed(1)}kg of weight change.`;
  }

  const lowerAvg = lowerLoss / lowerWeeks;
  if (fiveDayAvg > lowerAvg) {
    return `Your weight drops faster on weeks with 5 gym sessions: ${fiveDayAvg.toFixed(1)}kg vs ${lowerAvg.toFixed(1)}kg.`;
  }

  return `Your recent lower-frequency weeks are dropping ${lowerAvg.toFixed(1)}kg vs ${fiveDayAvg.toFixed(1)}kg on 5-session weeks.`;
}
