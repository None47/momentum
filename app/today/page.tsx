"use client";

import { useEffect, useState } from "react";
import { getCurrentPhase, getDayNumber } from "@/lib/constants";
import { completeHabit, getLeetCodeCount } from "@/lib/store";
import {
  areAllCoreHabitsDone,
  DailyTaskEntry,
  getCoreCompletions,
  getCurrentHabitStreak,
  getDailyTask,
  getTodayKey,
  getYesterdayKey,
  hasShownPerfectDay,
  markPerfectDayShown,
  saveDailyTask,
} from "@/lib/momentum";
import {
  completeStarterAttempt,
  createStarterAttempt,
  dismissPatternWarning,
  getDueEnergySlot,
  getLowEnergyPlan,
  getStarterStats,
  getStarterStep,
  getTodayPatternWarning,
  markStarterConverted,
  saveEnergyCheckin,
  type EnergySlot,
  type StarterAttempt,
  type StarterCategory,
} from "@/lib/executive-store";
import {
  formatDurationLabel,
  getActiveTimer,
  getCurrentWeekPlan,
  getDailyTimerSummary,
  getDueProblemReviews,
  getNextWeekStart,
  getTwoWeekTimerInsight,
  getUpcomingWeekPlan,
  getWeeklyPlanActuals,
  getWeeklyTimerSummary,
  saveWeeklyPlan,
  shouldPromptWeeklyPlan,
  startTimer,
  stopTimer,
  type ActiveTimerEntry,
  type TimerCategory,
  type TimerFocus,
  type WeeklyPlanEntry,
} from "@/lib/research-store";

const FALLBACK_TASK =
  "Solve Two Sum on LeetCode in 45 minutes. Write the brute force solution first, then rewrite it with a hash map. This matters now because you need one clean pattern you can repeat tomorrow.";

const WEEKLY_FOCUS_OPTIONS = ["Arrays", "Strings", "Two Pointers", "Sliding Window", "Trees", "Graphs", "DP", "Backtracking"];

function isLockInReady() {
  const now = new Date();
  return now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 30);
}

function formatRunningTimer(activeTimer: ActiveTimerEntry | null, nowMs: number) {
  if (!activeTimer) return "00:00:00";
  const totalSeconds = Math.max(0, Math.floor((nowMs - activeTimer.startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function TodayPage() {
  const todayKey = getTodayKey();
  const yesterdayKey = getYesterdayKey();
  const [, setRefreshKey] = useState(0);
  const [task, setTask] = useState<DailyTaskEntry | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimerEntry | null>(null);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [timerStopOpen, setTimerStopOpen] = useState(false);
  const [reviewDueCount, setReviewDueCount] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanEntry | null>(null);
  const [weeklyPlanOpen, setWeeklyPlanOpen] = useState(false);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterCategory, setStarterCategory] = useState<StarterCategory>("CODING");
  const [starterAttempt, setStarterAttempt] = useState<StarterAttempt | null>(null);
  const [starterMessage, setStarterMessage] = useState("");
  const [energySlot, setEnergySlot] = useState<EnergySlot | null>(null);
  const [patternWarning, setPatternWarning] = useState<{ id: string; label: string } | null>(null);
  const [weeklyForm, setWeeklyForm] = useState({
    lcDelta: 0,
    libraryAdherence: "MOST_DAYS" as "YES" | "MOST_DAYS" | "NO",
    note: "",
    lcProblems: 8,
    codingSessions: 4,
    focusSkill: "Arrays",
    blockers: [] as string[],
    otherBlocker: "",
  });

  const habits = getCoreCompletions(todayKey).map((habit) => ({
    ...habit,
    streak: habit.completed
      ? getCurrentHabitStreak(habit.id, todayKey)
      : getCurrentHabitStreak(habit.id, yesterdayKey),
  }));

  useEffect(() => {
    const stored = getDailyTask(todayKey);
    if (stored) {
      setTask(stored);
      return;
    }

    const seededTask: DailyTaskEntry = {
      date: todayKey,
      task: FALLBACK_TASK,
      done: false,
      regenerations: 0,
    };

    saveDailyTask(seededTask);
    setTask(seededTask);
  }, [todayKey]);

  useEffect(() => {
    const syncResearch = () => {
      setActiveTimer(getActiveTimer());
      setReviewDueCount(getDueProblemReviews().length);
      setWeeklyPlan(getCurrentWeekPlan());
      setEnergySlot(getDueEnergySlot());
      setPatternWarning(getTodayPatternWarning());
      if (shouldPromptWeeklyPlan()) {
        setWeeklyPlanOpen(true);
      }
    };

    syncResearch();
    window.addEventListener("momentum:data-changed", syncResearch);
    return () => window.removeEventListener("momentum:data-changed", syncResearch);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function generateTask(regenerate = false) {
    if (regenerate && (task?.regenerations ?? 0) >= 2) return;

    setLoadingTask(true);
    setTaskError(null);

    try {
      const response = await fetch("/api/daily-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayNumber: getDayNumber(),
          phase: getCurrentPhase().label,
          lcCount: getLeetCodeCount(),
          focusArea: "Python basics and DSA",
          previousTask: task?.task ?? null,
          regenerate,
        }),
      });

      const data = (await response.json()) as { task?: string };
      const nextTask: DailyTaskEntry = {
        date: todayKey,
        task: data.task?.trim() || FALLBACK_TASK,
        done: false,
        regenerations: regenerate ? (task?.regenerations ?? 0) + 1 : task?.regenerations ?? 0,
      };

      saveDailyTask(nextTask);
      setTask(nextTask);
    } catch {
      setTaskError("Could not generate a different task.");
    } finally {
      setLoadingTask(false);
    }
  }

  function handleHabitComplete(habitId: string) {
    if (completingId || habits.find((habit) => habit.id === habitId)?.completed) return;

    setCompletingId(habitId);
    completeHabit(habitId, todayKey);
    if ("vibrate" in navigator) {
      navigator.vibrate(35);
    }

    setRefreshKey((value) => value + 1);
    window.dispatchEvent(new Event("momentum:data-changed"));

    if (areAllCoreHabitsDone(todayKey) && !hasShownPerfectDay(todayKey)) {
      markPerfectDayShown(todayKey);
      window.dispatchEvent(new Event("momentum:perfect-day"));
    }

    window.setTimeout(() => setCompletingId(null), 300);
  }

  function handleTaskDone() {
    if (!task) return;
    const nextTask = { ...task, done: !task.done };
    saveDailyTask(nextTask);
    setTask(nextTask);
    window.dispatchEvent(new Event("momentum:data-changed"));
  }

  function openLockIn() {
    markStarterConverted("CODING");
    window.dispatchEvent(new Event("momentum:open-lock-in"));
  }

  function goToRoadmap(anchor: "review" | "cards") {
    window.location.href = `/roadmap#${anchor}`;
  }

  function handleStartTimer(category: TimerCategory) {
    if (activeTimer) return;
    startTimer(category);
    if (category === "CODING") markStarterConverted("CODING");
    if (category === "LEETCODE") markStarterConverted("LEETCODE");
    setActiveTimer(getActiveTimer());
  }

  function handleStopTimer(focus: TimerFocus) {
    stopTimer(focus);
    setTimerStopOpen(false);
    setActiveTimer(getActiveTimer());
  }

  async function handleGenerateWeeklyPlan() {
    setWeeklyPlanLoading(true);
    try {
      const response = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review: {
            lcDelta: weeklyForm.lcDelta,
            libraryAdherence: weeklyForm.libraryAdherence,
            note: weeklyForm.note,
          },
          targets: {
            lcProblems: weeklyForm.lcProblems,
            codingSessions: weeklyForm.codingSessions,
            focusSkill: weeklyForm.focusSkill,
          },
          blockers: weeklyForm.blockers,
          otherBlocker: weeklyForm.otherBlocker,
        }),
      });

      const data = (await response.json()) as { plan?: string[] };
      const plan: WeeklyPlanEntry = {
        weekStart: getNextWeekStart(),
        createdAt: new Date().toISOString(),
        review: {
          lcDelta: weeklyForm.lcDelta,
          libraryAdherence: weeklyForm.libraryAdherence,
          note: weeklyForm.note,
        },
        targets: {
          lcProblems: weeklyForm.lcProblems,
          codingSessions: weeklyForm.codingSessions,
          focusSkill: weeklyForm.focusSkill,
        },
        blockers: weeklyForm.blockers,
        otherBlocker: weeklyForm.otherBlocker,
        generatedPlan: data.plan?.length ? data.plan : [],
      };

      saveWeeklyPlan(plan);
      setWeeklyPlan(getUpcomingWeekPlan() ?? getCurrentWeekPlan());
      setWeeklyPlanOpen(false);
    } finally {
      setWeeklyPlanLoading(false);
    }
  }

  const allDone = habits.every((habit) => habit.completed);
  const todayTimerSummary = getDailyTimerSummary();
  const weeklyTimerSummary = getWeeklyTimerSummary();
  const twoWeekInsight = getTwoWeekTimerInsight();
  const displayedWeeklyPlan = weeklyPlan ?? getUpcomingWeekPlan();
  const planActuals = displayedWeeklyPlan ? getWeeklyPlanActuals(displayedWeeklyPlan.weekStart) : null;
  const starterStats = getStarterStats();
  const lowEnergyPlan = getLowEnergyPlan();

  return (
    <>
      <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[12px] tracking-[0.18em] text-white/45">TODAY</p>
            <p className="mt-2 text-[15px] text-white/65">
              {allDone ? "Nothing else matters now." : "3 cards. Show up."}
            </p>
          </div>
          <button
            onClick={openLockIn}
            disabled={!isLockInReady()}
            className={`rounded-full border px-4 py-2 text-[12px] font-semibold tracking-[0.12em] ${
              isLockInReady()
                ? "border-white/15 bg-white text-black"
                : "border-white/10 bg-transparent text-white/35"
            }`}
          >
            ◉ LOCK IN
          </button>
        </div>

        {shouldPromptWeeklyPlan() && (
          <section className="mb-4 rounded-[28px] border border-[#fbbf24]/20 bg-[#120f06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.16em] text-[#fbbf24]">PLAN NEXT WEEK</p>
                <p className="mt-2 text-[14px] leading-6 text-white/80">Sunday 9 PM. Five minutes now saves a week of drift.</p>
              </div>
              <button
                type="button"
                onClick={() => setWeeklyPlanOpen(true)}
                className="rounded-full border border-[#fbbf24]/25 bg-[#fbbf24] px-4 py-2 text-[11px] font-semibold text-black"
              >
                OPEN
              </button>
            </div>
          </section>
        )}

        <section className="rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-[0.18em] text-white/45">TIMER</p>
              <p className="mt-3 text-[26px] font-semibold text-white">
                {activeTimer ? `${activeTimer.category}: ${formatRunningTimer(activeTimer, timerNow)}` : "TRACK REAL WORK"}
              </p>
              <p className="mt-2 text-[13px] text-white/52">
                Honest data only. No rounding. No imaginary hours.
              </p>
            </div>
            {activeTimer ? (
              <button
                type="button"
                onClick={() => setTimerStopOpen(true)}
                className="rounded-full border border-[#ef4444]/25 bg-[#2a1010] px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#ffb4b4]"
              >
                STOP
              </button>
            ) : (
              <div className="grid gap-2">
                {(["CODING", "LEETCODE", "LEARNING"] as const).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleStartTimer(category)}
                    className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-white"
                  >
                    START {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">ACTUAL CODING TODAY</p>
              <p className="mt-2 text-[20px] font-semibold text-white">{formatDurationLabel(todayTimerSummary.CODING)}</p>
              <p className="mt-1 text-[12px] text-white/45">Target: 2hr</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">WEEKLY HONEST HOURS</p>
              <p className="mt-2 text-[20px] font-semibold text-white">{formatDurationLabel(weeklyTimerSummary.CODING)}</p>
              <p className="mt-1 text-[12px] text-white/45">Target: 14hr / week</p>
            </div>
          </div>

          <div className="mt-3 rounded-[24px] border border-white/8 bg-black/20 p-4 text-[13px] leading-6 text-white/68">
            CODING: {formatDurationLabel(weeklyTimerSummary.CODING)} · LEETCODE: {formatDurationLabel(weeklyTimerSummary.LEETCODE)} · LEARNING: {formatDurationLabel(weeklyTimerSummary.LEARNING)}
          </div>

          {twoWeekInsight && (
            <div className="mt-3 rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">2 WEEK INSIGHT</p>
              <p className="mt-2 text-[13px] leading-6 text-white/72">
                You spend {twoWeekInsight.learningPct}% of your time learning and {twoWeekInsight.codingPct}% actually coding. Flip this ratio to make faster progress.
              </p>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.18em] text-white/45">REVIEW DUE</p>
              <p className="mt-3 text-[22px] font-semibold text-white">◈ REVIEW DUE: {reviewDueCount} problems need review</p>
            </div>
            <button
              type="button"
              onClick={() => goToRoadmap("review")}
              className={`rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.12em] ${reviewDueCount > 0 ? "border-white/15 bg-white text-black" : "border-white/10 bg-black/20 text-white/55"}`}
            >
              OPEN
            </button>
          </div>
        </section>

        {energySlot && (
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[12px] tracking-[0.18em] text-white/45">ENERGY CHECK-IN</p>
            <p className="mt-3 text-[18px] font-semibold text-white">Energy right now? 1-5</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => {
                    saveEnergyCheckin(energySlot, rating);
                    setEnergySlot(getDueEnergySlot());
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[14px] font-semibold text-white"
                >
                  {rating}
                </button>
              ))}
            </div>
          </section>
        )}

        {lowEnergyPlan && (
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[12px] tracking-[0.18em] text-white/45">LOW ENERGY TODAY</p>
            <p className="mt-3 text-[14px] leading-7 text-white/72">Modified plan. Half a session beats no session.</p>
            <div className="mt-4 space-y-2">
              {lowEnergyPlan.map((item) => (
                <p key={item} className="text-[14px] text-white">→ {item}</p>
              ))}
            </div>
          </section>
        )}

        {displayedWeeklyPlan && (
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[12px] tracking-[0.18em] text-white/45">THIS WEEK&apos;S FOCUS</p>
            <p className="mt-3 text-[20px] font-semibold text-white">{displayedWeeklyPlan.targets.focusSkill}</p>
            <div className="mt-4 space-y-2 text-[13px] leading-6 text-white/72">
              {displayedWeeklyPlan.generatedPlan.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {planActuals && (
              <p className="mt-4 text-[13px] text-[#fbbf24]">
                Plan vs actual: {displayedWeeklyPlan.targets.lcProblems} LC planned. Solved {planActuals.lcSolved}. {displayedWeeklyPlan.targets.lcProblems > 0 ? Math.round((planActuals.lcSolved / displayedWeeklyPlan.targets.lcProblems) * 100) : 0}% hit rate.
              </p>
            )}
          </section>
        )}

        <section className="mt-5 space-y-4">
          {habits.map((habit) => {
            const streakClass =
              habit.streak >= 7
                ? "text-[28px] text-[#fbbf24] drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]"
                : habit.streak >= 1
                  ? "text-[22px] text-white"
                  : "text-[16px] text-white/35";

            return (
              <button
                key={habit.id}
                onClick={() => handleHabitComplete(habit.id)}
                className="flex min-h-[116px] w-full items-center gap-4 rounded-[30px] border border-white/8 px-5 py-5 text-left transition duration-300"
                style={{
                  backgroundColor: habit.completed ? `${habit.color}0d` : "#0d0d0d",
                  boxShadow:
                    habit.completed || completingId === habit.id
                      ? `0 0 0 1px ${habit.color}22, 0 0 34px ${habit.glow}`
                      : "none",
                }}
              >
                <div
                  className="flex h-[60px] w-[60px] items-center justify-center rounded-full border transition duration-300"
                  style={{
                    borderColor: habit.completed ? habit.color : "rgba(255,255,255,0.24)",
                    backgroundColor: habit.completed ? habit.color : "transparent",
                    boxShadow: habit.completed ? `0 0 24px ${habit.glow}` : "none",
                  }}
                >
                  <div
                    className={`h-[18px] w-[18px] rounded-full ${habit.completed ? "bg-black" : "bg-transparent"}`}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-[22px] font-semibold tracking-[0.08em] text-white">{habit.name}</p>
                  <p className="mt-2 text-[13px] tracking-[0.12em] text-white/45">{habit.subtitle}</p>
                </div>

                <div className="min-w-[72px] text-right">
                  <p className={streakClass}>{habit.streak}</p>
                  <p className="mt-1 text-[11px] tracking-[0.16em] text-white/35">DAYS</p>
                </div>
              </button>
            );
          })}
        </section>

        {patternWarning && (
          <section className="mt-4 rounded-[28px] border border-white/8 bg-[#0b0b0b] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] leading-6 text-white/62">{patternWarning.label}</p>
              <button
                type="button"
                onClick={() => {
                  dismissPatternWarning(patternWarning.id);
                  setPatternWarning(null);
                }}
                className="text-[11px] text-white/35"
              >
                DISMISS
              </button>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.18em] text-white/45">2-MINUTE STARTER</p>
              <p className="mt-3 text-[16px] text-white">Can&apos;t start? Lower the bar until motion is possible.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const attempt = createStarterAttempt("CODING");
                setStarterCategory("CODING");
                setStarterAttempt(attempt);
                setStarterMessage(getStarterStep("CODING"));
                setStarterOpen(true);
              }}
              className="rounded-full border border-white/12 bg-white px-4 py-2 text-[11px] font-semibold text-black"
            >
              CAN&apos;T START?
            </button>
          </div>
          <p className="mt-4 text-[13px] text-white/52">
            This week: {starterStats.started} sessions started with the 2-minute starter. {starterStats.converted} became full sessions.
          </p>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[12px] tracking-[0.18em] text-white/45">TODAY&apos;S ONE THING</p>
          <p className="mt-4 text-[17px] leading-8 text-white">{task?.task ?? FALLBACK_TASK}</p>
          {taskError && <p className="mt-3 text-[13px] text-[#ff8d8d]">{taskError}</p>}
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleTaskDone}
              className={`rounded-full border px-4 py-2 text-[12px] font-semibold tracking-[0.12em] ${
                task?.done
                  ? "border-[#fbbf24]/40 bg-[#1d1606] text-[#fbbf24]"
                  : "border-white/12 bg-white text-black"
              }`}
            >
              DONE
            </button>
            <button
              onClick={() => generateTask(true)}
              disabled={loadingTask || (task?.regenerations ?? 0) >= 2}
              className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold tracking-[0.12em] text-white disabled:text-white/30"
            >
              {loadingTask ? "LOADING" : "DIFFERENT TASK"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-white/35">
            {(task?.regenerations ?? 0)}/2 regenerations used.
          </p>
        </section>
      </main>

      {timerStopOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">FOCUS CHECK</p>
            <p className="mt-3 text-[20px] font-semibold text-white">Were you actually focused?</p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => handleStopTimer("full")} className="rounded-[20px] border border-white/10 bg-white px-4 py-3 text-[12px] font-semibold text-black">YES — full time counts</button>
              <button type="button" onClick={() => handleStopTimer("partial")} className="rounded-[20px] border border-[#fbbf24]/25 bg-[#fbbf24]/10 px-4 py-3 text-[12px] font-semibold text-[#fbbf24]">PARTIALLY — count half</button>
              <button type="button" onClick={() => handleStopTimer("none")} className="rounded-[20px] border border-[#ef4444]/25 bg-[#2a1010] px-4 py-3 text-[12px] font-semibold text-[#ffb4b4]">NO — distracted, don&apos;t count it</button>
            </div>
            <button type="button" onClick={() => setTimerStopOpen(false)} className="mt-3 w-full text-[12px] text-white/45">Cancel</button>
          </div>
        </div>
      )}

      {starterOpen && starterAttempt && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">YOU DON&apos;T HAVE TO DO THE WHOLE THING</p>
            <p className="mt-3 text-[20px] font-semibold text-white">Just do this one thing right now.</p>
            <div className="mt-4 space-y-2">
              {(["LEETCODE", "CODING", "GYM"] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const attempt = createStarterAttempt(category);
                    setStarterCategory(category);
                    setStarterAttempt(attempt);
                    setStarterMessage(getStarterStep(category));
                  }}
                  className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${starterCategory === category ? "border-white/14 bg-white text-black" : "border-white/10 bg-black/20 text-white/55"}`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="mt-5 whitespace-pre-line text-[15px] leading-8 text-white/78">{starterMessage}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  completeStarterAttempt(starterAttempt.id);
                  if (starterCategory === "CODING") {
                    markStarterConverted("CODING");
                    handleStartTimer("CODING");
                  }
                  if (starterCategory === "LEETCODE") {
                    markStarterConverted("LEETCODE");
                    goToRoadmap("review");
                  }
                  if (starterCategory === "GYM") {
                    window.location.href = "/gym";
                  }
                  setStarterOpen(false);
                }}
                className="rounded-[20px] border border-white/10 bg-white px-4 py-3 text-[12px] font-semibold text-black"
              >
                I DID IT
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch("/api/starter-step", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ category: starterCategory }),
                  });
                  const data = (await response.json()) as { step?: string };
                  setStarterMessage(data.step ?? starterMessage);
                }}
                className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white"
              >
                STILL CAN&apos;T
              </button>
            </div>
          </div>
        </div>
      )}

      {weeklyPlanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-8">
          <div className="mx-auto max-w-lg rounded-[32px] border border-white/10 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-[#fbbf24]">PLAN NEXT WEEK</p>
            <p className="mt-3 text-[24px] font-semibold text-white">Sunday night. Five minutes.</p>

            <section className="mt-6">
              <p className="text-[11px] tracking-[0.16em] text-white/40">STEP 1 · LAST WEEK REVIEW</p>
              <label className="mt-3 block text-[13px] text-white/72">
                How many LC problems did you solve?
                <input value={weeklyForm.lcDelta} onChange={(event) => setWeeklyForm((current) => ({ ...current, lcDelta: Number(event.target.value) || 0 }))} className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white" />
              </label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["YES", "MOST_DAYS", "NO"] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setWeeklyForm((current) => ({ ...current, libraryAdherence: value }))} className={`rounded-[18px] border px-3 py-3 text-[11px] font-semibold ${weeklyForm.libraryAdherence === value ? "border-white/14 bg-white text-black" : "border-white/10 bg-black/20 text-white/55"}`}>
                    {value.replace("_", " ")}
                  </button>
                ))}
              </div>
              <textarea value={weeklyForm.note} onChange={(event) => setWeeklyForm((current) => ({ ...current, note: event.target.value }))} rows={3} placeholder="One honest sentence about last week." className="mt-3 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25" />
            </section>

            <section className="mt-6">
              <p className="text-[11px] tracking-[0.16em] text-white/40">STEP 2 · NEXT WEEK TARGETS</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-[13px] text-white/72">
                  LC target
                  <input value={weeklyForm.lcProblems} onChange={(event) => setWeeklyForm((current) => ({ ...current, lcProblems: Number(event.target.value) || 0 }))} className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white" />
                </label>
                <label className="text-[13px] text-white/72">
                  Coding sessions
                  <input value={weeklyForm.codingSessions} onChange={(event) => setWeeklyForm((current) => ({ ...current, codingSessions: Number(event.target.value) || 0 }))} className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white" />
                </label>
              </div>
              <select value={weeklyForm.focusSkill} onChange={(event) => setWeeklyForm((current) => ({ ...current, focusSkill: event.target.value }))} className="mt-3 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white">
                {WEEKLY_FOCUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </section>

            <section className="mt-6">
              <p className="text-[11px] tracking-[0.16em] text-white/40">STEP 3 · POTENTIAL BLOCKERS</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["Hostel environment", "College exams/assignments", "Low energy / health"].map((blocker) => {
                  const selected = weeklyForm.blockers.includes(blocker);
                  return (
                    <button key={blocker} type="button" onClick={() => setWeeklyForm((current) => ({ ...current, blockers: selected ? current.blockers.filter((item) => item !== blocker) : [...current.blockers, blocker] }))} className={`rounded-[18px] border px-3 py-3 text-[11px] font-semibold ${selected ? "border-[#fbbf24]/25 bg-[#fbbf24]/10 text-[#fbbf24]" : "border-white/10 bg-black/20 text-white/55"}`}>
                      {blocker}
                    </button>
                  );
                })}
              </div>
              <input value={weeklyForm.otherBlocker} onChange={(event) => setWeeklyForm((current) => ({ ...current, otherBlocker: event.target.value }))} placeholder="Other blocker" className="mt-3 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25" />
            </section>

            <div className="mt-6 grid gap-2">
              <button type="button" onClick={handleGenerateWeeklyPlan} disabled={weeklyPlanLoading} className="rounded-[22px] border border-white/15 bg-white px-4 py-3 text-[12px] font-semibold text-black disabled:opacity-50">
                {weeklyPlanLoading ? "GENERATING PLAN" : "GENERATE WEEK PLAN"}
              </button>
              <button type="button" onClick={() => setWeeklyPlanOpen(false)} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white/55">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
