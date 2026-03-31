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

const FALLBACK_TASK =
  "Solve Two Sum on LeetCode in 45 minutes. Write the brute force solution first, then rewrite it with a hash map. This matters now because you need one clean pattern you can repeat tomorrow.";

function isLockInReady() {
  const now = new Date();
  return now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 30);
}

export default function TodayPage() {
  const todayKey = getTodayKey();
  const yesterdayKey = getYesterdayKey();
  const [, setRefreshKey] = useState(0);
  const [task, setTask] = useState<DailyTaskEntry | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

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
    window.dispatchEvent(new Event("momentum:open-lock-in"));
  }

  const allDone = habits.every((habit) => habit.completed);

  return (
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

      <section className="space-y-4">
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
  );
}
