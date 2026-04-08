"use client";

import { useEffect, useState } from "react";
import {
  CORE_HABITS,
  getCoreHabitConsistencyWindow,
  getCurrentHabitStreak,
  getCurrentShowUpStreak,
  getDaysSinceStart,
  getLongestHabitStreak,
  getLongestShowUpStreak,
  getShowedUpDays,
  getTotalCompletedForHabit,
} from "@/lib/momentum";

interface TrackerState {
  daysSinceStart: number;
  showedUpDays: number;
  currentShowUpStreak: number;
  longestShowUpStreak: number;
  window: ReturnType<typeof getCoreHabitConsistencyWindow>;
  habits: Array<{
    id: string;
    name: string;
    color: string;
    current: number;
    longest: number;
    total: number;
  }>;
}

function getTrackerState(): TrackerState {
  return {
    daysSinceStart: getDaysSinceStart(),
    showedUpDays: getShowedUpDays(),
    currentShowUpStreak: getCurrentShowUpStreak(),
    longestShowUpStreak: getLongestShowUpStreak(),
    window: getCoreHabitConsistencyWindow(14),
    habits: CORE_HABITS.map((habit) => ({
      id: habit.id,
      name: habit.name,
      color: habit.color,
      current: getCurrentHabitStreak(habit.id),
      longest: getLongestHabitStreak(habit.id),
      total: getTotalCompletedForHabit(habit.id),
    })),
  };
}

function formatDayLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getConsistencyMessage(rate: number, streak: number) {
  if (rate >= 85 && streak >= 7) return "You are operating like this is normal now.";
  if (rate >= 65) return "This is real progress, but the misses still break momentum.";
  if (rate >= 40) return "You are showing up sometimes, not reliably yet.";
  return "The tracker shows intent, not consistency yet.";
}

export default function ConsistencyTracker() {
  const [state, setState] = useState<TrackerState | null>(null);

  useEffect(() => {
    const sync = () => setState(getTrackerState());
    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, []);

  if (!state) return null;

  const showRate = Math.round((state.showedUpDays / Math.max(1, state.daysSinceStart)) * 100);
  const recentPerfectDays = state.window.filter((day) => day.allDone).length;
  const weakestHabit = [...state.habits].sort((a, b) => a.total - b.total)[0];

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Consistency rate" value={`${showRate}%`} detail={`${state.showedUpDays} fully locked-in days`} />
        <MetricCard label="Current streak" value={`${state.currentShowUpStreak}d`} detail="Days with all 3 core habits done" />
        <MetricCard label="Best streak" value={`${state.longestShowUpStreak}d`} detail={`${recentPerfectDays}/14 perfect days recently`} />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">READING</p>
        <p className="mt-2 text-[22px] font-semibold text-white">{getConsistencyMessage(showRate, state.currentShowUpStreak)}</p>
        <p className="mt-3 text-[13px] text-white/52">
          Since day one, you have finished all core habits on {state.showedUpDays} of {state.daysSinceStart} tracked days.
          {weakestHabit ? ` ${weakestHabit.name} is the current drag point.` : ""}
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-white/45">LAST 14 DAYS</p>
            <p className="mt-2 text-[18px] font-semibold text-white">How often you actually closed the day</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-white/65">
            {recentPerfectDays} PERFECT
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
          {state.window.map((day) => (
            <div
              key={day.date}
              className={`rounded-[18px] border px-2 py-3 text-center ${
                day.allDone
                  ? "border-emerald-400/25 bg-emerald-500/10"
                  : day.doneCount > 0
                    ? "border-[#fbbf24]/20 bg-[#fbbf24]/8"
                    : "border-white/8 bg-black/20"
              }`}
            >
              <p className="text-[9px] tracking-[0.08em] text-white/40">{formatDayLabel(day.date).split(",")[0].toUpperCase()}</p>
              <p className="mt-2 text-[18px] font-semibold text-white">{day.doneCount}</p>
              <p className="mt-1 text-[10px] text-white/45">/3</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">CORE HABITS</p>
        <div className="mt-4 space-y-3">
          {state.habits.map((habit) => {
            const completionRate = Math.round((habit.total / Math.max(1, state.daysSinceStart)) * 100);

            return (
              <div key={habit.id} className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-semibold text-white">{habit.name}</p>
                    <p className="mt-1 text-[12px] text-white/45">{habit.total} completed days total</p>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                    style={{ color: habit.color, borderColor: `${habit.color}33`, backgroundColor: `${habit.color}14` }}
                  >
                    {completionRate}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${completionRate}%`, backgroundColor: habit.color }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] text-white/52">
                  <span>Current streak {habit.current}d</span>
                  <span>Best {habit.longest}d</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#090909] p-5">
      <p className="text-[11px] tracking-[0.18em] text-white/45">{label.toUpperCase()}</p>
      <p className="mt-2 text-[24px] font-semibold text-white">{value}</p>
      <p className="mt-2 text-[12px] text-white/45">{detail}</p>
    </div>
  );
}
