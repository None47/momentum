"use client";

import { useEffect, useState } from "react";
import ParticleBurst from "@/components/effects/ParticleBurst";
import BottomNav from "@/components/layout/BottomNav";
import { getDayNumber, getFormattedDate, getTodayDate, TOTAL_DAYS } from "@/lib/constants";
import { rollReward } from "@/lib/engines/variableReward";
import {
  addScore,
  completeHabit,
  getCompletionsForDate,
  getHabits,
  getStreak,
  updateStreak,
} from "@/lib/store";
import {
  getFocusTask,
  getLibraryCheckIn,
  saveFocusTask,
  saveLibraryCheckIn,
} from "@/lib/today-store";
import type { HabitCategory } from "@/lib/types";

const PRIMARY_IDS = ["body-gym", "grind-coding", "grind-leetcode"] as const;
const LIBRARY_REASONS = [
  "Still in college",
  "Feeling tired",
  "Hostel environment got me",
  "Other reason",
] as const;
const DEFAULT_FOCUS_TASK =
  "Solve Two Sum (#1) on LeetCode. Watch the NeetCode explanation first for 8 minutes, then solve it yourself. This is your only coding task today if you're just starting.";

function getDisplayColor(habitId: string, fallbackCategory: HabitCategory) {
  if (habitId === "body-gym") return "#ef4444";
  if (habitId === "grind-coding" || habitId === "grind-leetcode") return "#3b82f6";
  if (fallbackCategory === "MEDICAL") return "#10b981";
  if (fallbackCategory === "BODY") return "#f97316";
  if (fallbackCategory === "GRIND") return "#3b82f6";
  return "#a855f7";
}

function getSubtitle(habitId: string, scheduledTime: string, location: string) {
  if (habitId === "body-gym") return "5:40 AM · 1 hour";
  if (habitId === "grind-coding") return "3:30 PM · LIBRARY ONLY";
  if (habitId === "grind-leetcode") return "6:00 PM · LIBRARY ONLY";
  return `${scheduledTime} · ${location === "ANYWHERE" ? "FLEXIBLE" : location}`;
}

function shouldShowLibraryPrompt(now = new Date()) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour === 15 && minute >= 15 && minute <= 30;
}

export default function TodayPage() {
  const today = getTodayDate();
  const habits = getHabits();
  const medicationHabits = habits.filter((habit) => habit.category === "MEDICAL");
  const primaryHabits = PRIMARY_IDS.map((id) => habits.find((habit) => habit.id === id)).filter(
    Boolean,
  );
  const secondaryHabits = habits.filter(
    (habit) => !PRIMARY_IDS.includes(habit.id as (typeof PRIMARY_IDS)[number]) && habit.category !== "MEDICAL",
  );

  const [mounted, setMounted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [medicationsExpanded, setMedicationsExpanded] = useState(false);
  const [focusTask, setFocusTask] = useState(DEFAULT_FOCUS_TASK);
  const [focusLoading, setFocusLoading] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(false);
  const [particleCategory, setParticleCategory] = useState<HabitCategory>("GRIND");
  const [particleColor, setParticleColor] = useState("#3b82f6");
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
  const [libraryCheckInDone, setLibraryCheckInDone] = useState(false);
  const [showLibraryReasons, setShowLibraryReasons] = useState(false);
  const [moreChecksExpanded, setMoreChecksExpanded] = useState(false);

  useEffect(() => {
    const completions = new Set(getCompletionsForDate(today));
    const streakData: Record<string, number> = {};
    habits.forEach((habit) => {
      streakData[habit.id] = getStreak(habit.id).current;
    });

    const savedTask = getFocusTask(today);
    if (savedTask) {
      setFocusTask(savedTask);
    } else {
      saveFocusTask(DEFAULT_FOCUS_TASK, today);
    }

    const libraryEntry = getLibraryCheckIn(today);
    setCompletedIds(completions);
    setStreaks(streakData);
    setLibraryCheckInDone(Boolean(libraryEntry));
    setMounted(true);
  }, [habits, today]);

  useEffect(() => {
    const medsDone = medicationHabits.every((habit) => completedIds.has(habit.id));
    if (medsDone) {
      setMedicationsExpanded(false);
    }
  }, [completedIds, medicationHabits]);

  const handleComplete = (
    habitId: string,
    category: HabitCategory,
    color: string,
    x: number,
    y: number,
  ) => {
    if (completedIds.has(habitId)) return;

    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const reward = rollReward(habit.xp_value);
    completeHabit(habitId, today);
    const streak = updateStreak(habitId, today);
    addScore(habit.xp_value * reward.multiplier);

    setCompletedIds((prev) => new Set([...prev, habitId]));
    setStreaks((prev) => ({ ...prev, [habitId]: streak.current }));
    setParticleCategory(category);
    setParticleColor(color);
    setParticlePosition({ x, y });
    setParticleTrigger(false);
    window.setTimeout(() => setParticleTrigger(true), 20);
  };

  const generateFocusTask = async () => {
    setFocusLoading(true);
    try {
      const response = await fetch("/api/daily-focus", { method: "POST" });
      const data = (await response.json()) as { task?: string };
      const nextTask = data.task?.trim() || DEFAULT_FOCUS_TASK;
      setFocusTask(nextTask);
      saveFocusTask(nextTask, today);
    } catch {
      setFocusTask(DEFAULT_FOCUS_TASK);
      saveFocusTask(DEFAULT_FOCUS_TASK, today);
    } finally {
      setFocusLoading(false);
    }
  };

  const saveLibraryStatus = (present: boolean, reason: string | null) => {
    saveLibraryCheckIn({
      date: today,
      present,
      reason,
    });
    setLibraryCheckInDone(true);
    setShowLibraryReasons(false);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-[11px] tracking-[0.3em] text-[#525252]">MOMENTUM</span>
      </div>
    );
  }

  const primaryCompleted = primaryHabits.filter((habit) => habit && completedIds.has(habit.id)).length;
  const medsCompleted = medicationHabits.filter((habit) => completedIds.has(habit.id)).length;
  const medsDone = medsCompleted === medicationHabits.length;
  const showLibraryBanner = shouldShowLibraryPrompt() && !libraryCheckInDone;

  return (
    <div className="min-h-screen bg-[#060606] pb-24">
      <ParticleBurst
        trigger={particleTrigger}
        category={particleCategory}
        colorOverride={particleColor}
        x={particlePosition.x}
        y={particlePosition.y}
      />

      <main className="mx-auto max-w-lg px-4 pt-4">
        <section className="mb-5 border-b border-[#111111] pb-4">
          <div className="flex items-center justify-between text-[11px] tracking-[0.18em] text-[#6a6a6a]">
            <span>
              DAY {getDayNumber()} / {TOTAL_DAYS}
            </span>
            <span>₹60L</span>
          </div>
          <h1 className="mt-3 text-center text-[26px] font-bold tracking-[0.35em] text-[#f5f5f5]">
            MOMENTUM
          </h1>
          <p className="mt-2 text-center text-[10px] tracking-[0.2em] text-[#525252]">
            {getFormattedDate()}
          </p>
          <div className="mt-4 flex gap-2">
            {PRIMARY_IDS.map((id) => {
              const done = completedIds.has(id);
              return (
                <div key={id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#141414]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${done ? "bg-[#f5f5f5]" : "bg-transparent"}`}
                    style={{ width: done ? "100%" : "0%" }}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[10px] tracking-[0.16em] text-[#6a6a6a]">
            {primaryCompleted}/3
          </p>
        </section>

        {showLibraryBanner && (
          <section className="mb-4 rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5f5f5]">
              3:30 PM — ARE YOU IN THE LIBRARY?
            </p>
            {!showLibraryReasons ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => saveLibraryStatus(true, null)}
                  className="flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] bg-[#101010] px-3 text-[10px] font-bold tracking-[0.14em] text-[#f5f5f5]"
                >
                  YES, I&apos;M HERE
                </button>
                <button
                  onClick={() => setShowLibraryReasons(true)}
                  className="flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] bg-[#101010] px-3 text-[10px] font-bold tracking-[0.14em] text-[#f5f5f5]"
                >
                  NOT YET
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-[#737373]">Why not?</p>
                {LIBRARY_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => saveLibraryStatus(false, reason)}
                    className="flex min-h-11 w-full items-center rounded-sm border border-[#1a1a1a] bg-[#101010] px-3 text-left text-[10px] tracking-[0.14em] text-[#e5e5e5]"
                  >
                    <span className="mr-3 text-[#737373]">□</span>
                    {reason}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className={`mb-4 rounded-sm border p-4 transition-colors ${medsDone ? "border-[#10b981]/30 bg-[#07150f]" : "border-[#1a1a1a] bg-[#0d0d0d]"}`}>
          <button
            onClick={() => setMedicationsExpanded((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <span className={`text-[14px] ${medsDone ? "text-[#10b981]" : "text-[#737373]"}`}>○</span>
              <div>
                <p className={`text-[12px] font-bold tracking-[0.16em] ${medsDone ? "text-[#10b981]" : "text-[#e5e5e5]"}`}>
                  {medsDone ? "MEDS DONE ✓" : "MEDICATIONS"}
                </p>
                <p className="mt-1 text-[10px] text-[#6a6a6a]">
                  {medsCompleted}/{medicationHabits.length} taken
                </p>
              </div>
            </div>
            <span className={`text-[16px] ${medsDone ? "text-[#10b981]" : "text-[#e5e5e5]"}`}>
              {medicationsExpanded ? "↓" : "→"}
            </span>
          </button>

          {medicationsExpanded && !medsDone && (
            <div className="mt-4 space-y-2">
              {medicationHabits.map((habit) => {
                const color = getDisplayColor(habit.id, habit.category);
                const isCompleted = completedIds.has(habit.id);
                return (
                  <button
                    key={habit.id}
                    onClick={(event) =>
                      handleComplete(
                        habit.id,
                        habit.category,
                        color,
                        event.clientX,
                        event.clientY,
                      )
                    }
                    className={`flex min-h-11 w-full items-center justify-between rounded-sm border px-3 py-2 text-left ${
                      isCompleted
                        ? "border-[#10b981]/20 bg-[#0a1711] text-[#10b981]"
                        : "border-[#1a1a1a] bg-[#090909] text-[#e5e5e5]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[13px]">{habit.icon}</span>
                      <div>
                        <p className={`text-[11px] font-bold ${isCompleted ? "line-through opacity-70" : ""}`}>
                          {habit.label}
                        </p>
                        <p className="mt-1 text-[9px] text-[#6a6a6a]">{habit.scheduled_time}</p>
                      </div>
                    </div>
                    <span className="text-[10px] tabular-nums text-[#6a6a6a]">
                      [{streaks[habit.id] ?? 0}d]
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          {primaryHabits.map((habit) => {
            if (!habit) return null;
            const color = getDisplayColor(habit.id, habit.category);
            const isCompleted = completedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                onClick={(event) =>
                  handleComplete(
                    habit.id,
                    habit.category,
                    color,
                    event.clientX,
                    event.clientY,
                  )
                }
                className={`flex min-h-20 w-full items-center gap-4 rounded-sm border border-[#1a1a1a] px-4 py-4 text-left transition-all ${
                  isCompleted
                    ? "bg-[#0a0a0a] opacity-60"
                    : "bg-[#101010]"
                }`}
                style={{ borderLeftWidth: 4, borderLeftColor: color }}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 text-[18px] font-bold"
                  style={{
                    borderColor: isCompleted ? color : "#3a3a3a",
                    backgroundColor: isCompleted ? color : "transparent",
                    color: isCompleted ? "#060606" : "#f5f5f5",
                  }}
                >
                  {isCompleted ? "✓" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] text-[#bdbdbd]">{habit.icon}</span>
                    <h2 className={`text-[18px] font-bold ${isCompleted ? "line-through text-[#6a6a6a]" : "text-[#f5f5f5]"}`}>
                      {habit.label.replace(" (1 hour)", "").replace(" (2 problems min)", "")}
                    </h2>
                  </div>
                  <p className="mt-2 text-[11px] tracking-[0.08em] text-[#6a6a6a]">
                    {getSubtitle(habit.id, habit.scheduled_time, habit.location_required)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-bold tabular-nums text-[#f5f5f5]">
                    [{streaks[habit.id] ?? 0}d]
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        <section className="mt-4 rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <p className="text-[10px] tracking-[0.18em] text-[#737373]">TODAY&apos;S FOCUS</p>
          <p className="mt-4 text-[13px] leading-7 text-[#e5e5e5]">{focusTask}</p>
          <button
            onClick={generateFocusTask}
            disabled={focusLoading}
            className="mt-4 flex min-h-11 items-center justify-center rounded-sm border border-[#1a1a1a] px-4 text-[10px] font-bold tracking-[0.16em] text-[#f5f5f5] disabled:opacity-60"
          >
            {focusLoading ? "GENERATING" : "GENERATE NEW TASK"}
          </button>
        </section>

        <section className="mt-4 rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <button
            onClick={() => setMoreChecksExpanded((current) => !current)}
            className="flex w-full items-center justify-between text-left"
          >
            <p className="text-[10px] tracking-[0.18em] text-[#737373]">MORE CHECKS</p>
            <span className="text-[14px] text-[#e5e5e5]">{moreChecksExpanded ? "↓" : "→"}</span>
          </button>
          {moreChecksExpanded && (
            <div className="mt-3 space-y-2">
              {secondaryHabits.map((habit) => {
                const color = getDisplayColor(habit.id, habit.category);
                const isCompleted = completedIds.has(habit.id);
                return (
                  <button
                    key={habit.id}
                    onClick={(event) =>
                      handleComplete(
                        habit.id,
                        habit.category,
                        color,
                        event.clientX,
                        event.clientY,
                      )
                    }
                    className={`flex min-h-11 w-full items-center gap-3 rounded-sm border px-3 py-3 text-left ${
                      isCompleted
                        ? "border-[#1a1a1a] bg-[#0a0a0a] opacity-60"
                        : "border-[#1a1a1a] bg-[#090909]"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border text-[12px]"
                      style={{
                        borderColor: isCompleted ? color : "#3a3a3a",
                        backgroundColor: isCompleted ? color : "transparent",
                        color: isCompleted ? "#060606" : "#f5f5f5",
                      }}
                    >
                      {isCompleted ? "✓" : ""}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#bdbdbd]">{habit.icon}</span>
                        <p className={`text-[12px] font-medium ${isCompleted ? "line-through text-[#6a6a6a]" : "text-[#e5e5e5]"}`}>
                          {habit.label}
                        </p>
                      </div>
                      <p className="mt-1 text-[9px] text-[#6a6a6a]">
                        {getSubtitle(habit.id, habit.scheduled_time, habit.location_required)}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-[#f5f5f5]">
                      [{streaks[habit.id] ?? 0}d]
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
