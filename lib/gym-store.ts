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
  split: GymSplit;
  startTime: number;
  endTime: number | null;
  exercises: GymExerciseLog[];
  totalVolume: number;
  prsHit: number;
  completedExercises: number;
  sessionPr: boolean;
  energyAfter: number;
}

export interface PreviousExerciseSnapshot {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  date: string;
  split: GymSplit;
  sets: GymSet[];
  volume: number;
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
  firstBestReps: number;
  firstSessionVolume: number;
  latestBestWeight: number;
  latestBestReps: number;
  latestSessionVolume: number;
  improvementKg: number;
  improvementPct: number;
}

export interface ExerciseProgress {
  tone: "up" | "down" | "same";
  label: string;
  isNewPr: boolean;
}

export interface GymOverview {
  totalSessions: number;
  totalVolumeKg: number;
  totalVolumeTonnes: number;
  currentStreak: number;
  longestStreak: number;
}

const KEYS = {
  workouts: "momentum_gym_workouts",
  activeWorkout: "momentum_gym_active_workout",
} as const;

export const SPLIT_SCHEDULE = "Mon=PUSH · Tue=PULL · Wed=LEGS · Thu=REST · Fri=PUSH · Sat=PULL · Sun=LEGS";

export const ROUTINES: Record<GymSplit, string[]> = {
  PUSH: [
    "Flat Bench Press",
    "Incline DB Press",
    "Overhead Press",
    "Lateral Raises",
    "Tricep Pushdown",
    "Skull Crushers",
    "Chest Dips",
  ],
  PULL: [
    "Deadlift",
    "Pull Ups / Lat Pulldown",
    "Seated Cable Row",
    "Single Arm DB Row",
    "Face Pulls",
    "Barbell Curl",
    "Hammer Curl",
    "Reverse Curl",
  ],
  LEGS: [
    "Barbell Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Leg Extension",
    "Leg Curl",
    "Standing Calf Raises",
    "Lunges",
    "Hip Thrust",
  ],
  REST: [],
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getIsoDate(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getDatesBetween(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(getIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getUniqueWorkoutDates(): string[] {
  return Array.from(new Set(getWorkouts().map((workout) => workout.date))).sort();
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

function roundWeight(value: number): number {
  return Number(value.toFixed(1));
}

export function getExerciseVolume(sets: GymSet[]): number {
  return sets.reduce((sum, set) => {
    if (!set.completed) return sum;
    return sum + set.weight * set.reps;
  }, 0);
}

export function getTodaySplit(date = new Date()): GymSplit {
  const splitMap: Record<number, GymSplit> = {
    0: "LEGS",
    1: "PUSH",
    2: "PULL",
    3: "LEGS",
    4: "REST",
    5: "PUSH",
    6: "PULL",
  };
  return splitMap[date.getDay()];
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

export function createInitialSets(name: string): GymSet[] {
  const previous = getLastSessionData(name);
  const weight = previous?.weight || 20;
  const reps = previous?.reps || 8;
  return Array.from({ length: 3 }, () => ({
    weight,
    reps,
    completed: false,
  }));
}

export function createWorkoutSession(split: GymSplit): WorkoutSession {
  const actualSplit = split;
  return {
    id: `gym_${Date.now()}`,
    date: getIsoDate(),
    split: actualSplit,
    startTime: Date.now(),
    endTime: null,
    exercises: ROUTINES[actualSplit].map((name, index) => ({
      id: `exercise_${Date.now()}_${index}`,
      name,
      sets: createInitialSets(name),
      volume: 0,
    })),
    totalVolume: 0,
    prsHit: 0,
    completedExercises: 0,
    sessionPr: false,
    energyAfter: 0,
  };
}

export function buildWorkoutSummary(session: WorkoutSession, energyAfter: number): WorkoutSession {
  const history = getWorkouts().filter((workout) => workout.id !== session.id);
  let totalVolume = 0;
  let prsHit = 0;
  let completedExercises = 0;

  const exercises = session.exercises.map((exercise) => {
    const volume = getExerciseVolume(exercise.sets);
    const completedSets = exercise.sets.filter((set) => set.completed);
    const topSet = getTopSet(exercise.sets);

    if (completedSets.length > 0) {
      completedExercises += 1;
    }

    const pastHistory = history
      .flatMap((workout) => workout.exercises.filter((item) => item.name === exercise.name))
      .filter((item) => item.volume > 0);

    const bestPastWeight = Math.max(
      0,
      ...pastHistory.flatMap((entry) =>
        entry.sets.filter((set) => set.completed).map((set) => set.weight),
      ),
    );
    const bestPastRepsAtTopWeight = Math.max(
      0,
      ...pastHistory.flatMap((entry) =>
        entry.sets
          .filter((set) => set.completed && set.weight === bestPastWeight)
          .map((set) => set.reps),
      ),
    );
    const bestPastVolume = Math.max(0, ...pastHistory.map((entry) => entry.volume));

    const hitPr =
      topSet !== null &&
      (topSet.weight > bestPastWeight ||
        (topSet.weight === bestPastWeight && topSet.reps > bestPastRepsAtTopWeight) ||
        volume > bestPastVolume);

    if (hitPr && completedSets.length > 0) {
      prsHit += 1;
    }

    totalVolume += volume;

    return {
      ...exercise,
      volume,
    };
  });

  const highestPastSessionVolume = Math.max(0, ...history.map((workout) => workout.totalVolume));

  return {
    ...session,
    exercises,
    endTime: Date.now(),
    totalVolume,
    prsHit,
    completedExercises,
    sessionPr: totalVolume > highestPastSessionVolume,
    energyAfter,
  };
}

export function finalizeWorkout(session: WorkoutSession) {
  saveWorkout(session);
  saveActiveWorkout(null);
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
  let firstBestReps = 0;
  let firstSessionVolume = 0;
  let latestBestWeight = 0;
  let latestBestReps = 0;
  let latestSessionVolume = 0;

  history.forEach((entry, index) => {
    const topSet = getTopSet(entry.sets);
    const topWeight = topSet?.weight ?? 0;
    const topReps = topSet?.reps ?? 0;

    if (index === 0) {
      firstBestWeight = topWeight;
      firstBestReps = topReps;
      firstSessionVolume = entry.volume;
    }

    latestBestWeight = topWeight;
    latestBestReps = topReps;
    latestSessionVolume = entry.volume;
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

  const improvementKg = roundWeight(latestBestWeight - firstBestWeight);
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
    firstBestReps,
    firstSessionVolume,
    latestBestWeight,
    latestBestReps,
    latestSessionVolume,
    improvementKg,
    improvementPct,
  };
}

export function getAllExerciseStats(): ExerciseStats[] {
  const names = new Set(
    getWorkouts().flatMap((workout) => workout.exercises.map((exercise) => exercise.name)),
  );
  return Array.from(names)
    .map((name) => getExerciseStats(name))
    .sort((a, b) => a.name.localeCompare(b.name));
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

  if (isNewPr) {
    return {
      tone: "up",
      label: "NEW PR",
      isNewPr: true,
    };
  }

  if (currentTopSet.weight > lastSession.weight) {
    return {
      tone: "up",
      label: `↑ +${roundWeight(currentTopSet.weight - lastSession.weight)}kg`,
      isNewPr: false,
    };
  }

  if (currentTopSet.weight < lastSession.weight) {
    return {
      tone: "down",
      label: `↓ -${roundWeight(lastSession.weight - currentTopSet.weight)}kg`,
      isNewPr: false,
    };
  }

  return {
    tone: "same",
    label: currentTopSet.reps === lastSession.reps ? "= Same" : `= ${currentTopSet.reps - lastSession.reps > 0 ? "+" : ""}${currentTopSet.reps - lastSession.reps} reps`,
    isNewPr: false,
  };
}

export function getGymThisWeek(): number {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  monday.setDate(today.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayIso = getIsoDate(monday);
  return getWorkouts().filter((session) => session.date >= mondayIso).length;
}

export function getGymOverview(): GymOverview {
  const workouts = getWorkouts();
  const dates = getUniqueWorkoutDates();
  const totalVolumeKg = workouts.reduce((sum, workout) => sum + workout.totalVolume, 0);

  let longestStreak = 0;
  let currentRun = 0;
  let previousDate: string | null = null;

  dates.forEach((date) => {
    if (!previousDate) {
      currentRun = 1;
    } else {
      const previous = new Date(previousDate);
      const current = new Date(date);
      const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
      currentRun = diffDays === 1 ? currentRun + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = date;
  });

  let currentStreak = 0;
  if (dates.length > 0) {
    const latestLoggedDate = new Date(dates[dates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestDiff = Math.round((today.getTime() - latestLoggedDate.getTime()) / 86400000);

    if (latestDiff <= 1) {
      const dateSet = new Set(dates);
      const startCursor = new Date(latestLoggedDate);
      const historyWindow = getDatesBetween(new Date(dates[0]), startCursor).reverse();
      for (const date of historyWindow) {
        if (!dateSet.has(date)) break;
        currentStreak += 1;
      }
    }
  }

  return {
    totalSessions: workouts.length,
    totalVolumeKg,
    totalVolumeTonnes: totalVolumeKg / 1000,
    currentStreak,
    longestStreak,
  };
}

export function getRecentSessions(limit = 4): WorkoutSession[] {
  return getWorkouts().slice(0, limit);
}

export function getSessionDurationMs(session: WorkoutSession): number {
  const endTime = session.endTime ?? Date.now();
  return Math.max(0, endTime - session.startTime);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getCoachFallback(sessions: WorkoutSession[]): string[] {
  const latest = sessions[0];
  const previous = sessions[1];

  if (!latest) {
    return [
      "You have no saved sessions yet, so there is no trend to coach.",
      "Nothing is stalling because there is no baseline yet.",
      "Start your first workout and log every working set.",
    ];
  }

  const biggestLift = latest.exercises
    .map((exercise) => ({
      name: exercise.name,
      topSet: getTopSet(exercise.sets),
    }))
    .filter((entry) => entry.topSet)
    .sort((a, b) => {
      if ((b.topSet?.weight ?? 0) !== (a.topSet?.weight ?? 0)) {
        return (b.topSet?.weight ?? 0) - (a.topSet?.weight ?? 0);
      }
      return (b.topSet?.reps ?? 0) - (a.topSet?.reps ?? 0);
    })[0];

  const improving =
    latest.prsHit > 0
      ? `Your top-end strength is moving, with ${latest.prsHit} PR${latest.prsHit > 1 ? "s" : ""} in the last block.`
      : biggestLift
        ? `${biggestLift.name} is setting the pace, and your strongest set is holding steady.`
        : "Your consistency is improving because you are finishing logged work instead of guessing.";

  const stalling =
    previous && latest.totalVolume < previous.totalVolume
      ? `Total volume dipped by ${(previous.totalVolume - latest.totalVolume).toLocaleString()}kg versus the prior session, so workload is the main stall point.`
      : previous && latest.completedExercises < previous.completedExercises
        ? "Exercise completion fell from the last session, so session density is stalling."
        : "No major stall is obvious yet, but you need a larger run of sessions to identify one clean bottleneck.";

  const fix =
    latest.exercises.length > 0
      ? `Next session, lock your first compound lift in early and beat your previous top set by 1 rep or 2.5kg.`
      : "Next session, add your planned exercises before you start so the workout has structure.";

  return [improving, stalling, fix];
}
