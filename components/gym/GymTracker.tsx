"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildWorkoutSummary,
  createInitialSets,
  createWorkoutSession,
  finalizeWorkout,
  formatDuration,
  getActiveWorkout,
  getAllExerciseStats,
  getCoachFallback,
  getExerciseHistory,
  getExercisePersonalBest,
  getExerciseProgress,
  getExerciseStats,
  getGymOverview,
  getGymThisWeek,
  getLastSessionData,
  getRecentSessions,
  getSessionDurationMs,
  getTodaySplit,
  getWorkouts,
  ROUTINES,
  saveActiveWorkout,
  type ExerciseHistoryEntry,
  type GymExerciseLog,
  type GymSet,
  type GymSplit,
  type WorkoutSession,
  SPLIT_SCHEDULE,
} from "@/lib/gym-store";
import { addBodyMetric, getBodyMetrics, type BodyMetricEntry } from "@/lib/health-store";

type MainTab = "TODAY" | "HISTORY" | "STATS";
type HistoryTab = "SESSIONS" | "EXERCISES";

const MILESTONES = [
  { label: "Bench Press", exercise: "Flat Bench Press", target: 100, unit: "kg" },
  { label: "Squat", exercise: "Barbell Squat", target: 120, unit: "kg" },
  { label: "Deadlift", exercise: "Deadlift", target: 140, unit: "kg" },
  { label: "OHP", exercise: "Overhead Press", target: 60, unit: "kg" },
  { label: "Pull Ups", exercise: "Pull Ups / Lat Pulldown", target: 10, unit: "reps" },
] as const;

function playRestDoneFeedback() {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    navigator.vibrate([150, 100, 150]);
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // Ignore audio failures and keep the workout flow moving.
  }
}

function getProgressToneClass(tone: "up" | "down" | "same") {
  if (tone === "up") return "text-[#10b981]";
  if (tone === "down") return "text-[#ef4444]";
  return "text-[#f5f5f5]";
}

function getMetricCardTone(tone: "gold" | "green" | "blue" | "white") {
  if (tone === "gold") return "border-[#fbbf24]/20 bg-[#151108] text-[#fbbf24]";
  if (tone === "green") return "border-[#10b981]/20 bg-[#07150f] text-[#10b981]";
  if (tone === "blue") return "border-[#3b82f6]/20 bg-[#08121f] text-[#93c5fd]";
  return "border-[#1a1a1a] bg-[#0d0d0d] text-[#e5e5e5]";
}

function getEstimatedReach(metrics: BodyMetricEntry[]): string {
  if (metrics.length < 2) return "Estimated reach: Sep 2026 at current rate";

  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const daysBetween = Math.max(
    1,
    Math.round(
      (new Date(latest.date).getTime() - new Date(first.date).getTime()) / 86400000,
    ),
  );
  const loss = first.weight - latest.weight;
  if (loss <= 0) return "Estimated reach: Sep 2026 at current rate";

  const dailyLoss = loss / daysBetween;
  const targetMidpoint = 83;
  const remaining = latest.weight - targetMidpoint;
  if (remaining <= 0) return "Estimated reach: target already reached";

  const estimatedDays = Math.ceil(remaining / dailyLoss);
  const targetDate = new Date(latest.date);
  targetDate.setDate(targetDate.getDate() + estimatedDays);
  return `Estimated reach: ${targetDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })} at current rate`;
}

export default function GymTracker() {
  const [activeTab, setActiveTab] = useState<MainTab>("TODAY");
  const [historyTab, setHistoryTab] = useState<HistoryTab>("SESSIONS");
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [summary, setSummary] = useState<WorkoutSession | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>([]);
  const [weightDraft, setWeightDraft] = useState(96);
  const [coachLines, setCoachLines] = useState<string[] | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    setActiveWorkout(getActiveWorkout());
    const metrics = getBodyMetrics();
    setBodyMetrics(metrics);
    setWeightDraft(metrics.at(-1)?.weight ?? 96);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRestTimer((current) => {
        if (current === null) return current;
        if (current <= 1) {
          playRestDoneFeedback();
          return null;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const todaySplit = useMemo(() => getTodaySplit(), []);
  const workouts = getWorkouts();
  const overview = getGymOverview();
  const sessionsThisWeek = getGymThisWeek();
  const allExerciseStats = getAllExerciseStats();
  const recentSessions = getRecentSessions(4);

  const logBodyWeight = () => {
    const today = new Date().toISOString().split("T")[0];
    addBodyMetric({
      date: today,
      weight: Number(weightDraft.toFixed(1)),
      energy: bodyMetrics.at(-1)?.energy ?? 3,
      mood: bodyMetrics.at(-1)?.mood ?? 3,
    });
    const metrics = getBodyMetrics();
    setBodyMetrics(metrics);
    setWeightDraft(metrics.at(-1)?.weight ?? weightDraft);
  };

  const startWorkout = (split: GymSplit) => {
    const session = createWorkoutSession(split);
    saveActiveWorkout(session);
    setActiveWorkout(session);
    setSummary(null);
  };

  const updateWorkout = (next: WorkoutSession) => {
    setActiveWorkout(next);
    saveActiveWorkout(next);
  };

  const finishWorkout = (energyAfter: number) => {
    if (!activeWorkout) return;
    setSummary(buildWorkoutSummary(activeWorkout, energyAfter));
  };

  const getCoachFeedback = async () => {
    setCoachLoading(true);
    try {
      const response = await fetch("/api/gym-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessions: recentSessions }),
      });

      if (!response.ok) {
        throw new Error("Coach request failed");
      }

      const data = (await response.json()) as { lines?: string[] };
      setCoachLines(data.lines?.length === 3 ? data.lines : getCoachFallback(recentSessions));
    } catch {
      setCoachLines(getCoachFallback(recentSessions));
    } finally {
      setCoachLoading(false);
    }
  };

  if (selectedExercise) {
    return (
      <ExerciseDetailView
        name={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  if (summary) {
    return (
      <WorkoutSummaryModal
        summary={summary}
        onBack={() => setSummary(null)}
        onSave={(nextSummary) => {
          setSummary(nextSummary);
          finalizeWorkout(nextSummary);
          setActiveWorkout(null);
          setSummary(null);
          setRestTimer(null);
        }}
      />
    );
  }

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        session={activeWorkout}
        onChange={updateWorkout}
        onFinish={finishWorkout}
        onOpenExercise={setSelectedExercise}
        restTimer={restTimer}
        onSkipRest={() => setRestTimer(null)}
        onStartRest={() => setRestTimer(90)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="grid grid-cols-3 gap-1">
        {(["TODAY", "HISTORY", "STATS"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-sm border px-3 py-2 text-[10px] font-bold tracking-[0.18em] ${
              activeTab === tab
                ? "border-[#e5e5e5] bg-[#131313] text-[#e5e5e5]"
                : "border-[#1a1a1a] bg-[#0d0d0d] text-[#525252]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "TODAY" && (
        <section className="space-y-4">
          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Today&apos;s split</p>
            <h2 className="mt-2 text-3xl font-bold text-[#e5e5e5]">{todaySplit}</h2>
            <p className="mt-2 text-[10px] leading-relaxed text-[#737373]">{SPLIT_SCHEDULE}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricCard label="This week" value={`${sessionsThisWeek}/5 sessions`} tone="blue" />
              <MetricCard label="Gym streak" value={`${overview.currentStreak} days`} tone="gold" />
            </div>

            {todaySplit === "REST" && (
              <div className="mt-4 rounded-sm border border-[#1a1a1a] bg-[#090909] p-4">
                <p className="text-[13px] font-bold tracking-[0.08em] text-[#e5e5e5]">
                  REST DAY — Recovery is part of the process.
                </p>
                <p className="mt-2 text-[10px] text-[#737373]">
                  You can still override today and log a full session manually.
                </p>
              </div>
            )}

            <button
              onClick={() => startWorkout(todaySplit)}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-sm bg-[#e5e5e5] px-4 py-3 text-[12px] font-bold tracking-[0.18em] text-[#060606]"
            >
              {todaySplit === "REST" ? "START WORKOUT ANYWAY" : "START WORKOUT"}
            </button>
          </div>

          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Today&apos;s exercises</p>
              <span className="text-[9px] text-[#525252]">
                {ROUTINES[todaySplit].length} planned
              </span>
            </div>
            {ROUTINES[todaySplit].length === 0 ? (
              <p className="text-[11px] text-[#737373]">No exercises loaded for rest day. Override above if you still train.</p>
            ) : (
              <div className="space-y-2">
                {ROUTINES[todaySplit].map((exercise) => {
                  const stats = getExerciseStats(exercise);
                  return (
                    <button
                      key={exercise}
                      onClick={() => setSelectedExercise(exercise)}
                      className="flex min-h-11 w-full items-center justify-between rounded-sm border border-[#1a1a1a] bg-[#090909] px-3 py-2 text-left"
                    >
                      <span className="text-[11px] text-[#e5e5e5]">{exercise}</span>
                      <span className="text-[9px] text-[#525252]">
                        {stats.sessions > 0 ? `${stats.bestWeight}kg × ${stats.bestSetReps}` : "No sessions yet"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "HISTORY" && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-1">
            {(["SESSIONS", "EXERCISES"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setHistoryTab(tab)}
                className={`rounded-sm border px-3 py-2 text-[10px] font-bold tracking-[0.18em] ${
                  historyTab === tab
                    ? "border-[#e5e5e5] bg-[#131313] text-[#e5e5e5]"
                    : "border-[#1a1a1a] bg-[#0d0d0d] text-[#525252]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {historyTab === "SESSIONS" ? (
            workouts.length === 0 ? (
              <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-6 text-center text-[11px] text-[#737373]">
                No sessions yet. Start your first workout above.
              </div>
            ) : (
              <div className="space-y-3">
                {workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4"
                  >
                    <button
                      onClick={() =>
                        setExpandedSessionId((current) =>
                          current === workout.id ? null : workout.id,
                        )
                      }
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-bold text-[#e5e5e5]">
                            {workout.date} · {workout.split}
                          </p>
                          <p className="mt-1 text-[10px] text-[#737373]">
                            {formatDuration(getSessionDurationMs(workout))} · {workout.totalVolume.toLocaleString()} kg · {workout.prsHit} PRs
                          </p>
                        </div>
                        <p className="text-[10px] text-[#fbbf24]">
                          {"★".repeat(workout.energyAfter)}
                          {"☆".repeat(Math.max(0, 5 - workout.energyAfter))}
                        </p>
                      </div>
                    </button>

                    {expandedSessionId === workout.id && (
                      <div className="mt-4 space-y-3 border-t border-[#1a1a1a] pt-4">
                        {workout.exercises.map((exercise) => (
                          <div key={exercise.id} className="rounded-sm border border-[#1a1a1a] bg-[#090909] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[11px] font-bold text-[#e5e5e5]">{exercise.name}</p>
                              <p className="text-[9px] text-[#525252]">{exercise.volume.toLocaleString()} kg</p>
                            </div>
                            <div className="space-y-1">
                              {exercise.sets
                                .filter((set) => set.completed)
                                .map((set, index) => (
                                  <p key={`${exercise.id}_${index}`} className="text-[10px] text-[#737373]">
                                    Set {index + 1}: {set.weight}kg × {set.reps}
                                  </p>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : allExerciseStats.length === 0 ? (
            <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-6 text-center text-[11px] text-[#737373]">
              No sessions yet. Start your first workout above.
            </div>
          ) : (
            <div className="space-y-2">
              {allExerciseStats.map((exercise) => (
                <button
                  key={exercise.name}
                  onClick={() => setSelectedExercise(exercise.name)}
                  className="flex min-h-11 w-full items-center justify-between rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-3 text-left"
                >
                  <div>
                    <p className="text-[11px] font-bold text-[#e5e5e5]">{exercise.name}</p>
                    <p className="mt-1 text-[9px] text-[#525252]">{exercise.sessions} sessions · {exercise.totalReps} reps ever</p>
                  </div>
                  <p className="text-[10px] text-[#737373]">{exercise.bestWeight}kg × {exercise.bestSetReps}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "STATS" && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Total sessions" value={overview.totalSessions} tone="blue" />
            <MetricCard label="Total volume lifted" value={`${overview.totalVolumeTonnes.toFixed(1)} tonnes`} tone="gold" />
            <MetricCard label="Current streak" value={`${overview.currentStreak} days`} tone="green" />
            <MetricCard label="Longest streak" value={`${overview.longestStreak} days`} tone="white" />
          </div>

          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <p className="mb-4 text-[9px] uppercase tracking-[0.18em] text-[#525252]">Strength milestones</p>
            <div className="space-y-4">
              {MILESTONES.map((milestone) => {
                const stats = getExerciseStats(milestone.exercise);
                const current = milestone.unit === "reps" ? stats.bestSetReps : stats.bestWeight;
                const progress = Math.min(100, (current / milestone.target) * 100);
                const away = Math.max(0, milestone.target - current);
                const hit = current >= milestone.target;

                return (
                  <div key={milestone.label}>
                    <div className="mb-1 flex items-end justify-between gap-3">
                      <p className={`text-[11px] font-bold ${hit ? "gold-glow text-[#fbbf24]" : "text-[#e5e5e5]"}`}>
                        {milestone.label}: {current}
                        {milestone.unit} → {milestone.target}
                        {milestone.unit}
                      </p>
                      <p className="text-[9px] text-[#737373]">
                        {away}
                        {milestone.unit} away
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className={`h-full rounded-full ${hit ? "bg-[#fbbf24] shadow-[0_0_16px_rgba(251,191,36,0.55)]" : "bg-[#3b82f6]"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Body weight chart</p>
                <p className="mt-1 text-[11px] text-[#e5e5e5]">96kg → 82kg target</p>
              </div>
              <p className="text-[9px] text-[#737373]">{getEstimatedReach(bodyMetrics)}</p>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] text-[#737373]">Log weight here:</span>
              <MiniStepper value={weightDraft} step={1} min={40} onChange={setWeightDraft} />
              <button
                onClick={logBodyWeight}
                className="ml-auto rounded-sm border border-[#1a1a1a] px-3 py-2 text-[10px] font-bold tracking-[0.16em] text-[#e5e5e5]"
              >
                SAVE
              </button>
            </div>

            {bodyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={bodyMetrics.map((entry) => ({
                    label: entry.date.slice(5),
                    weight: entry.weight,
                    todayWeight:
                      entry.date === bodyMetrics.at(-1)?.date ? entry.weight : null,
                  }))}
                >
                  <CartesianGrid stroke="#111111" vertical={false} />
                  <ReferenceArea y1={82} y2={84} fill="#10b981" fillOpacity={0.08} />
                  <ReferenceLine y={82} stroke="#10b981" strokeDasharray="4 4" />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", fontSize: 10 }} />
                  <Line type="monotone" dataKey="weight" stroke="#e5e5e5" strokeWidth={2} dot={{ r: 2, fill: "#e5e5e5" }} />
                  <Line type="monotone" dataKey="todayWeight" stroke="transparent" dot={{ r: 5, fill: "#ef4444" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-[11px] text-[#737373]">Log your first body-weight entry to unlock the chart.</p>
            )}
          </div>

          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <button
              onClick={getCoachFeedback}
              disabled={coachLoading}
              className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#1d4ed8] px-4 text-[11px] font-bold tracking-[0.16em] text-white disabled:opacity-60"
            >
              {coachLoading ? "LOADING FEEDBACK" : "GET COACH FEEDBACK"}
            </button>

            {coachLines && (
              <div className="mt-4 rounded-sm border border-[#1d4ed8]/30 bg-[#0a1325] p-4">
                {coachLines.map((line, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-[#bfdbfe]">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveWorkoutView({
  session,
  onChange,
  onFinish,
  onOpenExercise,
  restTimer,
  onSkipRest,
  onStartRest,
}: {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
  onFinish: (energyAfter: number) => void;
  onOpenExercise: (exercise: string) => void;
  restTimer: number | null;
  onSkipRest: () => void;
  onStartRest: () => void;
}) {
  const [energy, setEnergy] = useState(3);
  const [showFinish, setShowFinish] = useState(false);
  const [customExercise, setCustomExercise] = useState("");
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - session.startTime);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsedMs(Date.now() - session.startTime), 1000);
    return () => window.clearInterval(interval);
  }, [session.startTime]);

  const elapsed = formatDuration(elapsedMs);

  const updateExercise = (exerciseIndex: number, updater: (exercise: GymExerciseLog) => GymExerciseLog) => {
    onChange({
      ...session,
      exercises: session.exercises.map((exercise, index) =>
        index === exerciseIndex ? updater(exercise) : exercise,
      ),
    });
  };

  const updateSet = (exerciseIndex: number, setIndex: number, updater: (set: GymSet) => GymSet) => {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => (index === setIndex ? updater(set) : set)),
    }));
  };

  const addSet = (exerciseIndex: number) => {
    updateExercise(exerciseIndex, (exercise) => {
      const seed = exercise.sets.at(-1) ?? createInitialSets(exercise.name)[0];
      return {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            weight: seed.weight,
            reps: seed.reps,
            completed: false,
          },
        ],
      };
    });
  };

  const removeExercise = (exerciseId: string) => {
    onChange({
      ...session,
      exercises: session.exercises.filter((exercise) => exercise.id !== exerciseId),
    });
  };

  const addCustomExercise = () => {
    const name = customExercise.trim();
    if (!name) return;
    onChange({
      ...session,
      exercises: [
        ...session.exercises,
        {
          id: `exercise_${Date.now()}`,
          name,
          sets: createInitialSets(name),
          volume: 0,
        },
      ],
    });
    setCustomExercise("");
  };

  return (
    <div className="relative pb-28">
      <div className="sticky top-[57px] z-30 mb-4 rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <p className="text-[12px] font-bold tracking-[0.14em] text-[#e5e5e5]">
          {elapsed} — SESSION IN PROGRESS
        </p>
        <p className="mt-1 text-[10px] text-[#737373]">{session.split} day</p>
      </div>

      <div className="space-y-4">
        {session.exercises.map((exercise, exerciseIndex) => {
          const lastTime = getLastSessionData(exercise.name);
          const bestEver = getExercisePersonalBest(exercise.name);
          const progress = getExerciseProgress(exercise.name, exercise.sets);

          return (
            <div key={exercise.id} className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <button onClick={() => onOpenExercise(exercise.name)} className="text-left">
                    <h3 className="text-[13px] font-bold text-[#e5e5e5]">{exercise.name}</h3>
                  </button>
                  <p className="mt-2 text-[9px] text-[#737373]">
                    LAST TIME:{" "}
                    <span className="text-[#e5e5e5]">
                      {lastTime ? `${lastTime.sets}×${lastTime.reps} @ ${lastTime.weight}kg` : "No data yet"}
                    </span>
                  </p>
                  <p className="mt-1 text-[9px] text-[#737373]">
                    BEST EVER:{" "}
                    <span className="text-[#e5e5e5]">
                      {bestEver ? `${bestEver.weight}kg × ${bestEver.reps} reps` : "No PR yet"}
                    </span>
                  </p>
                  {progress && (
                    <p className={`mt-2 text-[10px] font-bold ${getProgressToneClass(progress.tone)}`}>
                      {progress.label}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {progress?.isNewPr && (
                    <span className="rounded-sm border border-[#fbbf24]/40 bg-[#2a2008] px-2 py-1 text-[8px] font-bold tracking-[0.16em] text-[#fbbf24] shadow-[0_0_16px_rgba(251,191,36,0.35)]">
                      NEW PR
                    </span>
                  )}
                  <button
                    onClick={() => removeExercise(exercise.id)}
                    className="rounded-sm border border-[#1a1a1a] px-2 py-1 text-[9px] tracking-[0.14em] text-[#737373]"
                  >
                    REMOVE
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={`${exercise.id}_${setIndex}`}
                    className={`rounded-sm border px-3 py-3 transition-opacity ${
                      set.completed
                        ? "border-[#2a2a2a] bg-[#0a0a0a] opacity-70"
                        : "border-[#1a1a1a] bg-[#090909]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] text-[#737373]">Set {setIndex + 1}</p>
                      <button
                        onClick={() =>
                          updateSet(exerciseIndex, setIndex, (current) => {
                            const next = { ...current, completed: !current.completed };
                            if (!current.completed && next.completed) onStartRest();
                            return next;
                          })
                        }
                        className={`flex min-h-11 min-w-11 items-center justify-center rounded-sm border text-[12px] font-bold ${
                          set.completed
                            ? "border-[#10b981]/40 bg-[#0d1c16] text-[#10b981]"
                            : "border-[#2a2a2a] text-[#e5e5e5]"
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
                        onChange={(value) =>
                          updateSet(exerciseIndex, setIndex, (current) => ({
                            ...current,
                            weight: value,
                          }))
                        }
                      />
                      <span className="text-[12px] font-bold text-[#525252]">×</span>
                      <Stepper
                        value={set.reps}
                        unit="reps"
                        step={1}
                        min={0}
                        onChange={(value) =>
                          updateSet(exerciseIndex, setIndex, (current) => ({
                            ...current,
                            reps: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exerciseIndex)}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] px-3 text-[10px] font-bold tracking-[0.16em] text-[#e5e5e5]"
              >
                + ADD SET
              </button>
            </div>
          );
        })}

        <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <p className="mb-3 text-[9px] uppercase tracking-[0.18em] text-[#525252]">Add custom exercise</p>
          <div className="flex flex-col gap-2">
            <input
              value={customExercise}
              onChange={(event) => setCustomExercise(event.target.value)}
              placeholder="Custom exercise name"
              className="w-full rounded-sm border border-[#1a1a1a] bg-[#090909] px-3 py-3 text-[12px] text-[#e5e5e5] placeholder-[#525252] outline-none"
            />
            <button
              onClick={addCustomExercise}
              className="flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] px-3 text-[10px] font-bold tracking-[0.16em] text-[#e5e5e5]"
            >
              ADD CUSTOM EXERCISE
            </button>
          </div>
        </div>
      </div>

      {restTimer !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060606]/85 px-4">
          <div className="at-risk-pulse w-full max-w-xs rounded-sm border border-[#ef4444] bg-[#090909] p-6 text-center">
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#ef4444]">REST TIMER</p>
            <p className="mt-3 text-5xl font-bold tabular-nums text-[#e5e5e5]">
              REST: {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, "0")}
            </p>
            <button
              onClick={onSkipRest}
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-sm bg-[#ef4444] text-[10px] font-bold tracking-[0.16em] text-white"
            >
              SKIP
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-14 z-30 mx-auto max-w-lg bg-gradient-to-t from-[#060606] to-transparent p-2">
        {showFinish ? (
          <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <p className="mb-3 text-center text-[10px] text-[#737373]">Rate energy</p>
            <div className="mb-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setEnergy(value)}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-sm border text-[11px] font-bold ${
                    energy === value
                      ? "border-[#e5e5e5] bg-[#131313] text-[#e5e5e5]"
                      : "border-[#1a1a1a] text-[#525252]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              onClick={() => onFinish(energy)}
              className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#e5e5e5] text-[11px] font-bold tracking-[0.18em] text-[#060606]"
            >
              REVIEW SUMMARY
            </button>
            <button
              onClick={() => setShowFinish(false)}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold tracking-[0.16em] text-[#737373]"
            >
              KEEP TRAINING
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFinish(true)}
            className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#ef4444] px-4 text-[11px] font-bold tracking-[0.18em] text-white"
          >
            FINISH WORKOUT
          </button>
        )}
      </div>
    </div>
  );
}

function WorkoutSummaryModal({
  summary,
  onBack,
  onSave,
}: {
  summary: WorkoutSession;
  onBack: () => void;
  onSave: (summary: WorkoutSession) => void;
}) {
  const [energy, setEnergy] = useState(summary.energyAfter || 3);

  const updatedSummary = {
    ...summary,
    energyAfter: energy,
  };

  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#525252]">Workout summary</p>
      <h2 className="mt-1 text-[15px] font-bold tracking-[0.18em] text-[#e5e5e5]">SAVE THIS SESSION</h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricCard label="Duration" value={formatDuration(getSessionDurationMs(updatedSummary))} tone="white" />
        <MetricCard label="Total volume" value={`${updatedSummary.totalVolume.toLocaleString()} kg`} tone="blue" />
        <MetricCard label="PRs today" value={`${updatedSummary.prsHit} new PRs`} tone="gold" />
        <MetricCard label="Exercises" value={`${updatedSummary.completedExercises} completed`} tone="green" />
      </div>

      {updatedSummary.sessionPr && (
        <div className="mt-4 rounded-sm border border-[#fbbf24]/40 bg-[#2a2008] p-3 text-[10px] font-bold tracking-[0.16em] text-[#fbbf24] shadow-[0_0_16px_rgba(251,191,36,0.25)]">
          SESSION PR — HIGHEST VOLUME EVER
        </div>
      )}

      <div className="mt-4 rounded-sm border border-[#1a1a1a] bg-[#090909] p-4">
        <p className="text-[10px] text-[#737373]">Rate energy</p>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setEnergy(value)}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-full border ${
                energy === value
                  ? "border-[#e5e5e5] bg-[#131313] text-[#e5e5e5]"
                  : "border-[#1a1a1a] text-[#525252]"
              }`}
            >
              ○
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(updatedSummary)}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-sm bg-[#e5e5e5] text-[11px] font-bold tracking-[0.18em] text-[#060606]"
      >
        SAVE WORKOUT
      </button>
      <button
        onClick={onBack}
        className="mt-2 flex min-h-11 w-full items-center justify-center rounded-sm border border-[#1a1a1a] text-[10px] font-bold tracking-[0.16em] text-[#737373]"
      >
        BACK
      </button>
    </div>
  );
}

function ExerciseDetailView({
  name,
  onBack,
}: {
  name: string;
  onBack: () => void;
}) {
  const history = useMemo(() => getExerciseHistory(name), [name]);
  const stats = useMemo(() => getExerciseStats(name), [name]);

  const chartData = history.map((entry, index) => {
    const topSet = entry.sets
      .filter((set) => set.completed)
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        return b.reps - a.reps;
      })[0];

    return {
      label: `S${index + 1}`,
      weight: topSet?.weight ?? 0,
      volume: entry.volume,
      date: entry.date.slice(5),
    };
  });

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex min-h-11 items-center text-[10px] font-bold tracking-[0.16em] text-[#737373]"
      >
        ← BACK
      </button>

      <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <h2 className="text-[15px] font-bold text-[#e5e5e5]">{name}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricCard label="Best set ever" value={`${stats.bestWeight}kg × ${stats.bestSetReps} reps`} tone="gold" />
          <MetricCard label="First session" value={`${stats.firstBestWeight}kg × ${stats.firstBestReps} reps`} tone="white" />
          <MetricCard
            label="Progress"
            value={`${stats.improvementKg >= 0 ? "+" : ""}${stats.improvementKg}kg (${stats.improvementPct.toFixed(0)}%) since you started`}
            tone={stats.improvementKg >= 0 ? "green" : "white"}
          />
          <MetricCard label="Total reps ever done" value={stats.totalReps} tone="blue" />
        </div>
      </div>

      <ChartCard title="Max weight over time" data={chartData} dataKey="weight" color="#fbbf24" />
      <ChartCard title="Total volume over time" data={chartData} dataKey="volume" color="#3b82f6" />

      <div className="space-y-3">
        {history.map((entry) => (
          <ExerciseSessionRow key={`${entry.workoutId}_${entry.date}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ExerciseSessionRow({ entry }: { entry: ExerciseHistoryEntry }) {
  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#e5e5e5]">
          {entry.date} · {entry.split}
        </p>
        <p className="text-[9px] text-[#525252]">{entry.volume.toLocaleString()} kg</p>
      </div>
      {entry.sets
        .filter((set) => set.completed)
        .map((set, index) => (
          <p key={index} className="text-[10px] text-[#737373]">
            Set {index + 1}: {set.weight}kg × {set.reps}
          </p>
        ))}
    </div>
  );
}

function ChartCard({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
}) {
  return (
    <div className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#525252]">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid stroke="#111111" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", fontSize: 10 }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[14px] font-bold text-[#e5e5e5]"
        >
          −
        </button>
        <div className="min-w-[70px] text-center">
          <p className="text-[14px] font-bold tabular-nums text-[#e5e5e5]">
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </p>
          <p className="text-[8px] uppercase tracking-[0.14em] text-[#525252]">{unit}</p>
        </div>
        <button
          onClick={() => onChange(Number((value + step).toFixed(1)))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[14px] font-bold text-[#e5e5e5]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MiniStepper({
  value,
  step,
  min,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[14px] font-bold text-[#e5e5e5]"
      >
        −
      </button>
      <span className="min-w-[56px] text-center text-[14px] font-bold tabular-nums text-[#e5e5e5]">
        {value}
      </span>
      <button
        onClick={() => onChange(value + step)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[#1a1a1a] text-[14px] font-bold text-[#e5e5e5]"
      >
        +
      </button>
      <span className="text-[10px] text-[#737373]">kg</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: "gold" | "green" | "blue" | "white";
}) {
  return (
    <div className={`rounded-sm border p-3 ${getMetricCardTone(tone)}`}>
      <p className="text-[8px] uppercase tracking-[0.16em] text-[#737373]">{label}</p>
      <p className="mt-2 text-[14px] font-bold leading-tight">{value}</p>
    </div>
  );
}
