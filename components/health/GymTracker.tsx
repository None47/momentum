"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { BodyMetricEntry } from "@/lib/health-store";
import {
  finishActiveWorkout,
  getActiveWorkout,
  getAllExerciseStats,
  getExerciseHistory,
  getExercisePersonalBest,
  getExerciseProgress,
  getExerciseStats,
  getGymOverview,
  getGymThisWeek,
  getLastSessionData,
  getRecentSessions,
  getTodaySplit,
  getWeightCorrelationInsight,
  getWorkouts,
  ROUTINES,
  saveActiveWorkout,
  type ExerciseHistoryEntry,
  type GymExerciseLog,
  type GymSet,
  type GymSplit,
  type WorkoutSession,
} from "@/lib/gym-store";

const STRENGTH_MILESTONES = [
  { label: "Bench Press", exercise: "Flat Bench Press (Barbell)", target: 100, unit: "kg" },
  { label: "Squat", exercise: "Barbell Squat", target: 120, unit: "kg" },
  { label: "Deadlift", exercise: "Deadlift (Barbell)", target: 140, unit: "kg" },
  { label: "Overhead Press", exercise: "Overhead Press (Barbell)", target: 60, unit: "kg" },
  { label: "Pull 10 strict pull ups", exercise: "Pull Ups / Lat Pulldown", target: 10, unit: "reps" },
] as const;

type TrackerTab = "TODAY" | "STATS" | "HISTORY";

interface GymTrackerProps {
  bodyMetrics: BodyMetricEntry[];
}

export default function GymTracker({ bodyMetrics }: GymTrackerProps) {
  const [activeTab, setActiveTab] = useState<TrackerTab>("TODAY");
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [summary, setSummary] = useState<WorkoutSession | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(90);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setActiveSession(getActiveWorkout());
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRestTimer((current) => {
        if (current === null) return current;
        return current > 0 ? current - 1 : null;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const todaySplit = useMemo(() => getTodaySplit(), []);
  const gymOverview = useMemo(() => getGymOverview(), [refreshKey]);
  const gymThisWeek = useMemo(() => getGymThisWeek(), [refreshKey]);
  const workouts = useMemo(() => getWorkouts(), [refreshKey]);

  const startWorkout = () => {
    const session: WorkoutSession = {
      id: `gym_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      startTime: Date.now(),
      endTime: null,
      split: todaySplit,
      exercises: ROUTINES[todaySplit].map((name, index) => ({
        id: `ex_${Date.now()}_${index}`,
        name,
        sets: [],
        volume: 0,
      })),
      energyBefore: 3,
      energyAfter: 0,
      totalVolume: 0,
      prsHit: 0,
      completedExercises: 0,
      sessionPr: false,
    };
    saveActiveWorkout(session);
    setActiveSession(session);
    setSummary(null);
  };

  const updateSession = (session: WorkoutSession) => {
    setActiveSession(session);
    saveActiveWorkout(session);
  };

  const finishWorkout = (energyAfter: number) => {
    const finished = finishActiveWorkout(energyAfter);
    setActiveSession(null);
    setSummary(finished);
    setRefreshKey((value) => value + 1);
    setRestTimer(null);
  };

  if (historyExercise) {
    return <ExerciseHistoryView name={historyExercise} onClose={() => setHistoryExercise(null)} />;
  }

  if (summary) {
    return <WorkoutSummaryView summary={summary} onClose={() => setSummary(null)} />;
  }

  if (activeSession) {
    return (
      <ActiveWorkoutView
        session={activeSession}
        onSessionChange={updateSession}
        onFinish={finishWorkout}
        openExerciseHistory={setHistoryExercise}
        restTimer={restTimer}
        restDuration={restDuration}
        setRestDuration={setRestDuration}
        startRest={() => setRestTimer(restDuration)}
        skipRest={() => setRestTimer(null)}
        addRestTime={(seconds) => setRestTimer((current) => (current ?? 0) + seconds)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["TODAY", "STATS", "HISTORY"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-sm border text-[10px] tracking-[0.15em] transition-colors ${
              activeTab === tab
                ? "border-[#e5e5e5] bg-[#1a1a1a] text-[#e5e5e5]"
                : "border-[#1a1a1a] text-[#525252]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "TODAY" && (
        <section className="space-y-4">
          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#525252]">Today&apos;s workout</p>
                <h2 className="mt-1 text-2xl font-bold text-[#e5e5e5]">{todaySplit}</h2>
                <p className="mt-1 text-[10px] text-[#525252]">Mon Push · Tue Pull · Wed Legs · Thu Rest · Fri Push · Sat Pull · Sun Legs</p>
              </div>
              <div className="rounded-sm border border-[#1a1a1a] px-3 py-2 text-right">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[#525252]">Current streak</p>
                <p className="text-xl font-bold text-[#fbbf24] tabular-nums">{gymOverview.currentStreak}d</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <MetricCard label="This week" value={`${gymThisWeek}/5`} tone="blue" />
              <MetricCard label="Sessions logged" value={gymOverview.totalSessions} tone="gold" />
            </div>

            <button
              onClick={startWorkout}
              disabled={todaySplit === "REST"}
              className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#e5e5e5] px-4 py-3 text-[11px] font-bold tracking-[0.15em] text-[#060606] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {todaySplit === "REST" ? "REST DAY" : "START WORKOUT"}
            </button>
          </div>

          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Upcoming exercises</p>
              <span className="text-[9px] text-[#525252]">{ROUTINES[todaySplit].length} total</span>
            </div>
            <div className="space-y-2">
              {ROUTINES[todaySplit].length === 0 ? (
                <p className="py-6 text-center text-[10px] text-[#525252]">Recovery day. Walk, stretch, and come back stronger tomorrow.</p>
              ) : (
                ROUTINES[todaySplit].map((name) => {
                  const stats = getExerciseStats(name);
                  return (
                    <button
                      key={name}
                      onClick={() => setHistoryExercise(name)}
                      className="flex min-h-11 w-full items-center justify-between rounded-sm border border-[#1a1a1a] px-3 py-2 text-left transition-colors hover:border-[#2a2a2a] hover:bg-[#121212]"
                    >
                      <span className="text-[11px] text-[#e5e5e5]">{name}</span>
                      <span className="text-[9px] text-[#525252]">{stats.bestWeight > 0 ? `${stats.bestWeight}kg best` : "No history"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "STATS" && (
        <StatsOverview bodyMetrics={bodyMetrics} refreshKey={refreshKey} />
      )}

      {activeTab === "HISTORY" && (
        <section className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
          {workouts.length === 0 && <p className="p-6 text-center text-[10px] text-[#525252]">No workouts logged yet.</p>}
          {workouts.map((workout) => (
            <div key={workout.id} className="border-b border-[#1a1a1a] p-3 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-[#e5e5e5]">{workout.split} DAY</p>
                  <p className="mt-1 text-[9px] text-[#525252]">
                    {workout.date} · {workout.completedExercises} exercises · {workout.prsHit} PRs
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-[#3b82f6]">{workout.totalVolume.toLocaleString()}kg</p>
                  <p className="text-[9px] text-[#525252]">
                    {workout.endTime ? Math.round((workout.endTime - workout.startTime) / 60000) : 0}m
                  </p>
                </div>
              </div>
              {workout.sessionPr && (
                <p className="mt-2 text-[9px] font-bold tracking-[0.14em] text-[#fbbf24]">SESSION PR — Highest volume ever</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ActiveWorkoutView({
  session,
  onSessionChange,
  onFinish,
  openExerciseHistory,
  restTimer,
  restDuration,
  setRestDuration,
  startRest,
  skipRest,
  addRestTime,
}: {
  session: WorkoutSession;
  onSessionChange: (session: WorkoutSession) => void;
  onFinish: (energyAfter: number) => void;
  openExerciseHistory: (name: string) => void;
  restTimer: number | null;
  restDuration: number;
  setRestDuration: (seconds: number) => void;
  startRest: () => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;
}) {
  const [finishing, setFinishing] = useState(false);
  const [energy, setEnergy] = useState(4);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - session.startTime) / 60000));

  const updateExercise = (exerciseIndex: number, updater: (exercise: GymExerciseLog) => GymExerciseLog) => {
    const updated: WorkoutSession = {
      ...session,
      exercises: session.exercises.map((exercise, index) =>
        index === exerciseIndex ? updater(exercise) : exercise,
      ),
    };
    onSessionChange(updated);
  };

  const addSet = (exerciseIndex: number) => {
    updateExercise(exerciseIndex, (exercise) => {
      const previousSet = exercise.sets.at(-1);
      const lastSession = getLastSessionData(exercise.name);
      return {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            weight: previousSet?.weight ?? lastSession?.weight ?? 20,
            reps: previousSet?.reps ?? lastSession?.reps ?? 8,
            completed: false,
          },
        ],
      };
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof GymSet,
    value: number | boolean,
  ) => {
    updateExercise(exerciseIndex, (exercise) => {
      const sets = exercise.sets.map((set, index) =>
        index === setIndex ? { ...set, [field]: value } : set,
      );
      return { ...exercise, sets };
    });

    if (field === "completed" && value === true) {
      startRest();
    }
  };

  const addCustomExercise = () => {
    if (!customExerciseName.trim()) return;
    onSessionChange({
      ...session,
      exercises: [
        ...session.exercises,
        {
          id: `ex_${Date.now()}`,
          name: customExerciseName.trim(),
          sets: [],
          volume: 0,
        },
      ],
    });
    setCustomExerciseName("");
    setShowCustomInput(false);
  };

  return (
    <div className="relative">
      <div className="mb-4 rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Active workout</p>
            <h2 className="mt-1 text-[15px] font-bold tracking-[0.16em] text-[#e5e5e5]">{session.split} SESSION</h2>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[#525252]">Timer</p>
            <p className="text-xl font-bold text-[#3b82f6] tabular-nums">{elapsedMinutes}m</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] text-[#525252]">Rest timer</span>
          {[60, 90, 120].map((value) => (
            <button
              key={value}
              onClick={() => setRestDuration(value)}
              className={`min-h-11 rounded-sm border px-3 text-[10px] font-bold ${
                restDuration === value
                  ? "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]"
                  : "border-[#1a1a1a] text-[#525252]"
              }`}
            >
              {value}s
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pb-28">
        {session.exercises.map((exercise, exerciseIndex) => {
          const lastSession = getLastSessionData(exercise.name);
          const bestEver = getExercisePersonalBest(exercise.name);
          const progress = getExerciseProgress(exercise.name, exercise.sets);

          return (
            <div key={exercise.id} className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <button
                  onClick={() => openExerciseHistory(exercise.name)}
                  className="text-left"
                >
                  <p className="text-[12px] font-bold text-[#3b82f6]">{exercise.name}</p>
                </button>
                {progress?.isNewPr && (
                  <span className="rounded-sm border border-[#fbbf24]/50 bg-[#fbbf24]/10 px-2 py-1 text-[8px] font-bold tracking-[0.14em] text-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                    NEW PR
                  </span>
                )}
              </div>

              <div className="mb-3 space-y-1">
                <p className="text-[9px] text-[#737373]">
                  Last time:{" "}
                  <span className="text-[#e5e5e5]">
                    {lastSession ? `${lastSession.sets} sets × ${lastSession.weight}kg × ${lastSession.reps} reps` : "No data yet"}
                  </span>
                </p>
                <p className="text-[9px] text-[#737373]">
                  Best ever:{" "}
                  <span className="text-[#e5e5e5]">
                    {bestEver ? `${bestEver.weight}kg × ${bestEver.reps} reps` : "No PR yet"}
                  </span>
                </p>
                {progress && (
                  <p
                    className={`text-[9px] font-bold ${
                      progress.tone === "up"
                        ? "text-[#10b981]"
                        : progress.tone === "down"
                          ? "text-[#ef4444]"
                          : progress.tone === "match"
                            ? "text-[#e5e5e5]"
                            : "text-[#e5e5e5]"
                    }`}
                  >
                    {progress.label}
                    {progress.tone === "up" ? " — PR!" : progress.tone === "down" ? " — deload" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={`${exercise.id}_${setIndex}`}
                    className={`rounded-sm border px-3 py-3 ${set.completed ? "border-[#10b981]/30 bg-[#101914]" : "border-[#1a1a1a] bg-[#090909]"}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#525252]">Set {setIndex + 1}</span>
                      <button
                        onClick={() => updateSet(exerciseIndex, setIndex, "completed", !set.completed)}
                        className={`flex min-h-11 min-w-11 items-center justify-center rounded-sm border px-3 text-[10px] font-bold ${
                          set.completed
                            ? "border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981]"
                            : "border-[#2a2a2a] text-[#737373]"
                        }`}
                      >
                        ✓
                      </button>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <Stepper
                        value={set.weight}
                        unit="kg"
                        step={2.5}
                        min={0}
                        onChange={(value) => updateSet(exerciseIndex, setIndex, "weight", value)}
                      />
                      <span className="text-[11px] font-bold text-[#525252]">×</span>
                      <Stepper
                        value={set.reps}
                        unit="reps"
                        step={1}
                        min={0}
                        onChange={(value) => updateSet(exerciseIndex, setIndex, "reps", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exerciseIndex)}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] px-3 text-[10px] font-bold tracking-[0.14em] text-[#e5e5e5]"
              >
                + ADD SET
              </button>
            </div>
          );
        })}

        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] px-3 text-[10px] font-bold tracking-[0.14em] text-[#e5e5e5]"
          >
            + CUSTOM EXERCISE
          </button>
        ) : (
          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-3">
            <input
              autoFocus
              value={customExerciseName}
              onChange={(event) => setCustomExerciseName(event.target.value)}
              placeholder="Type any exercise name"
              className="w-full rounded-sm border border-[#1a1a1a] bg-[#060606] px-3 py-3 text-[12px] text-[#e5e5e5] placeholder-[#525252] focus:border-[#3b82f6] focus:outline-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={addCustomExercise}
                className="flex min-h-11 items-center justify-center rounded-sm bg-[#3b82f6] text-[10px] font-bold tracking-[0.14em] text-white"
              >
                ADD EXERCISE
              </button>
              <button
                onClick={() => setShowCustomInput(false)}
                className="flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold tracking-[0.14em] text-[#737373]"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>

      {finishing ? (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg border-t border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <p className="mb-3 text-center text-[10px] text-[#525252]">Rate your session energy</p>
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setEnergy(value)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-sm border text-[11px] font-bold ${
                  energy === value
                    ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]"
                    : "border-[#1a1a1a] text-[#525252]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            onClick={() => onFinish(energy)}
            className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#e5e5e5] text-[11px] font-bold tracking-[0.14em] text-[#060606]"
          >
            CONFIRM FINISH
          </button>
          <button
            onClick={() => setFinishing(false)}
            className="mt-2 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold tracking-[0.14em] text-[#737373]"
          >
            KEEP TRAINING
          </button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-14 z-40 mx-auto max-w-lg bg-gradient-to-t from-[#060606] to-transparent p-2">
          <button
            onClick={() => setFinishing(true)}
            className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#ef4444] px-4 text-[11px] font-bold tracking-[0.15em] text-white shadow-lg"
          >
            FINISH WORKOUT
          </button>
        </div>
      )}

      <AnimatePresence>
        {restTimer !== null && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed inset-x-0 top-20 z-50 mx-auto max-w-sm rounded-sm border border-[#ef4444]/30 bg-[#0d0d0d] p-4 text-center shadow-2xl"
          >
            <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.18em] text-[#ef4444]">Rest timer</p>
            <div className="my-2 text-5xl font-bold tabular-nums text-[#e5e5e5]">
              {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, "0")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addRestTime(30)}
                className="flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold text-[#e5e5e5]"
              >
                +30s
              </button>
              <button
                onClick={() => addRestTime(60)}
                className="flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold text-[#e5e5e5]"
              >
                +60s
              </button>
              <button
                onClick={skipRest}
                className="flex min-h-11 items-center justify-center rounded-sm bg-[#ef4444] text-[10px] font-bold text-white"
              >
                SKIP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkoutSummaryView({
  summary,
  onClose,
}: {
  summary: WorkoutSession;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const recentSessions = useMemo(() => getRecentSessions(4), []);
  const durationMinutes = summary.endTime ? Math.round((summary.endTime - summary.startTime) / 60000) : 0;

  const getCoachFeedback = () => {
    const topExercises = summary.exercises
      .filter((exercise) => exercise.volume > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 2)
      .map((exercise) => exercise.name);

    const previousSession = recentSessions[1];
    const comparison =
      previousSession && summary.totalVolume > previousSession.totalVolume
        ? `Volume is up ${summary.totalVolume - previousSession.totalVolume}kg from your previous workout.`
        : previousSession
          ? `Volume is down ${previousSession.totalVolume - summary.totalVolume}kg from your previous workout.`
          : "This is your first logged session.";

    setFeedback(
      [
        `Progressing well: ${topExercises.length > 0 ? topExercises.join(" and ") : "you logged the full session"}.`,
        comparison,
        `Next-session focus: ${summary.prsHit > 0 ? "repeat your strongest top set with cleaner reps before adding weight." : "hold the load steady and add one rep on your first compound exercise."}`,
      ].join(" "),
    );
  };

  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Workout summary</p>
      <h2 className="mt-1 text-[15px] font-bold tracking-[0.18em] text-[#e5e5e5]">SESSION COMPLETE</h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricCard label="Duration" value={`${durationMinutes}m`} tone="white" />
        <MetricCard label="Volume" value={`${summary.totalVolume.toLocaleString()}kg`} tone="blue" />
        <MetricCard label="PRs hit" value={summary.prsHit} tone="gold" />
        <MetricCard label="Exercises done" value={summary.completedExercises} tone="white" />
      </div>

      {summary.sessionPr && (
        <div className="mt-4 rounded-sm border border-[#fbbf24]/30 bg-[#fbbf24]/10 p-3">
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#fbbf24]">SESSION PR — Highest volume ever</p>
        </div>
      )}

      <div className="mt-4 rounded-sm border border-[#1a1a1a] bg-[#090909] p-3">
        <p className="text-[9px] uppercase tracking-[0.16em] text-[#525252]">Energy rating saved</p>
        <p className="mt-1 text-2xl font-bold text-[#e5e5e5]">{summary.energyAfter}/5</p>
      </div>

      <button
        onClick={getCoachFeedback}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 text-[10px] font-bold tracking-[0.14em] text-[#a855f7]"
      >
        AI COACH FEEDBACK
      </button>

      {feedback && (
        <div className="mt-3 rounded-sm border border-[#1a1a1a] bg-[#090909] p-3">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#525252]">Last 4 sessions review</p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#e5e5e5]">{feedback}</p>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-sm bg-[#e5e5e5] text-[10px] font-bold tracking-[0.14em] text-[#060606]"
      >
        DONE
      </button>
    </div>
  );
}

function ExerciseHistoryView({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const history = useMemo(() => getExerciseHistory(name), [name]);
  const stats = useMemo(() => getExerciseStats(name), [name]);

  const chartData = history.map((entry, index) => {
    const topSet = getTopSet(entry.sets);
    return {
      label: `S${index + 1}`,
      weight: topSet?.weight ?? 0,
      volume: entry.volume,
      date: entry.date.slice(5),
    };
  });

  const firstTopSet = history.length > 0 ? getTopSet(history[0].sets) : null;
  const latestTopSet = history.length > 0 ? getTopSet(history[history.length - 1].sets) : null;

  return (
    <div className="space-y-4">
      <button
        onClick={onClose}
        className="flex min-h-11 items-center text-[10px] font-bold tracking-[0.14em] text-[#525252]"
      >
        ← BACK TO GYM
      </button>

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Exercise history</p>
        <h2 className="mt-1 text-[15px] font-bold text-[#3b82f6]">{name}</h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricCard label="Best set ever" value={`${stats.bestWeight}kg × ${stats.bestSetReps}`} tone="gold" />
          <MetricCard label="Total reps ever" value={stats.totalReps} tone="green" />
        </div>
      </div>

      <HistoryChart title="Weight over time" color="#fbbf24" dataKey="weight" data={chartData} />
      <HistoryChart title="Volume over time" color="#3b82f6" dataKey="volume" data={chartData} />

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <p className="text-[9px] uppercase tracking-[0.16em] text-[#525252]">Progress since start</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricCard
            label="First vs latest"
            value={
              firstTopSet && latestTopSet
                ? `${firstTopSet.weight}kg → ${latestTopSet.weight}kg`
                : "Need 2 sessions"
            }
            tone="white"
          />
          <MetricCard
            label="Since start"
            value={`${stats.improvementKg >= 0 ? "+" : ""}${stats.improvementKg}kg (${stats.improvementPct.toFixed(0)}%)`}
            tone={stats.improvementKg >= 0 ? "green" : "red"}
          />
        </div>
      </div>

      <div className="space-y-2">
        {history.map((entry, index) => (
          <HistoryRow key={`${entry.workoutId}_${index}`} entry={entry} index={index} total={history.length} />
        ))}
      </div>
    </div>
  );
}

function StatsOverview({
  bodyMetrics,
  refreshKey,
}: {
  bodyMetrics: BodyMetricEntry[];
  refreshKey: number;
}) {
  const overview = useMemo(() => getGymOverview(), [refreshKey]);
  const allStats = useMemo(() => getAllExerciseStats(), [refreshKey]);
  const workouts = useMemo(() => getWorkouts(), [refreshKey]);
  const correlation = useMemo(() => getWeightCorrelationInsight(bodyMetrics), [bodyMetrics]);

  const weightChartData = useMemo(() => {
    return bodyMetrics.map((metric) => {
      const sessionsThatDay = workouts.filter((workout) => workout.date === metric.date).length;
      return {
        label: metric.date.slice(5),
        weight: metric.weight,
        gymDot: sessionsThatDay > 0 ? metric.weight : null,
        sessions: sessionsThatDay,
      };
    });
  }, [bodyMetrics, workouts]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Total sessions logged" value={overview.totalSessions} tone="blue" />
        <MetricCard label="Total volume lifted" value={`${overview.totalVolumeTonnes}t`} tone="gold" />
        <MetricCard label="Longest gym streak" value={`${overview.maxStreak}d`} tone="white" />
        <MetricCard label="Current gym streak" value={`${overview.currentStreak}d`} tone="green" />
        <MetricCard
          label="Most improved"
          value={
            overview.mostImprovedExercise
              ? `${overview.mostImprovedExercise.name.split(" ")[0]} +${overview.mostImprovedExercise.pct.toFixed(0)}%`
              : "No data"
          }
          tone="green"
        />
        <MetricCard label="Favourite split" value={overview.favSplit} tone="white" />
      </div>

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#525252]">Strength milestones</p>
        <div className="space-y-3">
          {STRENGTH_MILESTONES.map((milestone) => {
            const stats = getExerciseStats(milestone.exercise);
            const current =
              milestone.unit === "reps" ? stats.bestSetReps : stats.bestWeight;
            const progress = milestone.target > 0 ? Math.min(100, (current / milestone.target) * 100) : 0;
            const hit = current >= milestone.target;
            const away = Math.max(0, milestone.target - current);

            return (
              <div key={milestone.label}>
                <div className="mb-1 flex items-end justify-between gap-3">
                  <p className={`text-[10px] font-bold ${hit ? "text-[#fbbf24]" : "text-[#e5e5e5]"}`}>{hit ? "■" : "□"} {milestone.label}</p>
                  <p className="text-[9px] text-[#525252]">
                    current: {current}
                    {milestone.unit} {away > 0 ? `· ${away}${milestone.unit} away` : "· milestone hit"}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div
                    className={`h-full rounded-full ${hit ? "bg-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.55)]" : "bg-[#3b82f6]"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-[#525252]">Body progress</p>
            <h3 className="mt-1 text-[14px] font-bold text-[#e5e5e5]">96kg → 82kg target</h3>
          </div>
          <p className="text-[9px] text-[#525252]">Gym days appear as dots</p>
        </div>
        {weightChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightChartData}>
              <CartesianGrid stroke="#111111" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", fontSize: 10 }}
              />
              <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} />
              <Line
                type="monotone"
                dataKey="gymDot"
                stroke="transparent"
                dot={{ r: 4, fill: "#fbbf24", stroke: "#060606", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#fbbf24" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-[10px] text-[#525252]">Log body metrics to unlock body progress analysis.</p>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-[#e5e5e5]">{correlation}</p>
      </div>

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#525252]">Exercise leaderboard</p>
        <div className="space-y-2">
          {allStats
            .filter((stat) => stat.sessions > 0)
            .sort((a, b) => b.improvementPct - a.improvementPct)
            .slice(0, 5)
            .map((stat) => (
              <div key={stat.name} className="flex items-center justify-between rounded-sm border border-[#1a1a1a] px-3 py-2">
                <div>
                  <p className="text-[10px] font-bold text-[#e5e5e5]">{stat.name}</p>
                  <p className="text-[9px] text-[#525252]">{stat.sessions} sessions · best {stat.bestWeight}kg × {stat.bestSetReps}</p>
                </div>
                <p className={`text-[10px] font-bold ${stat.improvementKg >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                  {stat.improvementKg >= 0 ? "+" : ""}
                  {stat.improvementPct.toFixed(0)}%
                </p>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

function Stepper({
  value,
  unit,
  step,
  min,
  onChange,
}: {
  value: number;
  unit: string;
  step: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#060606] px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[11px] font-bold text-[#e5e5e5]"
        >
          −
        </button>
        <div className="min-w-[72px] text-center">
          <p className="text-[14px] font-bold tabular-nums text-[#e5e5e5]">
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </p>
          <p className="text-[8px] uppercase tracking-[0.14em] text-[#525252]">{unit}</p>
        </div>
        <button
          onClick={() => onChange(Number((value + step).toFixed(1)))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[11px] font-bold text-[#e5e5e5]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "gold" | "green" | "red" | "white";
}) {
  const toneClass =
    tone === "blue"
      ? "text-[#3b82f6]"
      : tone === "gold"
        ? "text-[#fbbf24]"
        : tone === "green"
          ? "text-[#10b981]"
          : tone === "red"
            ? "text-[#ef4444]"
            : "text-[#e5e5e5]";

  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#525252]">{label}</p>
    </div>
  );
}

function HistoryChart({
  title,
  color,
  dataKey,
  data,
}: {
  title: string;
  color: string;
  dataKey: "weight" | "volume";
  data: Array<{ label: string; weight: number; volume: number; date: string }>;
}) {
  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#525252]">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <CartesianGrid stroke="#111111" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", fontSize: 10 }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoryRow({
  entry,
  index,
  total,
}: {
  entry: ExerciseHistoryEntry;
  index: number;
  total: number;
}) {
  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-[#e5e5e5]">Session {index + 1} · {entry.split}</p>
          <p className="mt-1 text-[9px] text-[#525252]">{entry.date} · {entry.volume}kg volume</p>
        </div>
        <p className="text-[9px] text-[#525252]">{index + 1}/{total}</p>
      </div>
      <div className="space-y-1">
        {entry.sets
          .filter((set) => set.completed)
          .map((set, setIndex) => (
            <div key={`${entry.workoutId}_${setIndex}`} className="flex items-center justify-between text-[10px]">
              <span className="text-[#525252]">Set {setIndex + 1}</span>
              <span className="text-[#e5e5e5]">
                {set.weight}kg × {set.reps}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
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
