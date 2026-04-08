"use client";

import { useEffect, useState } from "react";
import { getEnergyInsight, getPatternReport } from "@/lib/executive-store";
import { getLibraryInsight } from "@/lib/today-store";
import {
  CORE_HABITS,
  getCurrentHabitStreak,
  getDaysSinceStart,
  getShowedUpDays,
  getTotalCompletedForHabit,
} from "@/lib/momentum";
import { getLeetCodeCount, getScore } from "@/lib/store";
import { getWeeklySleepSummary } from "@/lib/sleep-store";
import { getMoodScore } from "@/lib/today-mission-store";

interface DashboardState {
  score: number;
  leetCodeCount: number;
  showedUpDays: number;
  daysSinceStart: number;
  streaks: Array<{
    id: string;
    name: string;
    current: number;
    total: number;
    color: string;
  }>;
  sleep: ReturnType<typeof getWeeklySleepSummary>;
  energy: ReturnType<typeof getEnergyInsight>;
  library: ReturnType<typeof getLibraryInsight>;
  mood: number | null;
  patternReport: string[];
}

function getDashboardState(): DashboardState {
  return {
    score: getScore(),
    leetCodeCount: getLeetCodeCount(),
    showedUpDays: getShowedUpDays(),
    daysSinceStart: getDaysSinceStart(),
    streaks: CORE_HABITS.map((habit) => ({
      id: habit.id,
      name: habit.name,
      current: getCurrentHabitStreak(habit.id),
      total: getTotalCompletedForHabit(habit.id),
      color: habit.color,
    })),
    sleep: getWeeklySleepSummary(),
    energy: getEnergyInsight(),
    library: getLibraryInsight(),
    mood: getMoodScore(),
    patternReport: getPatternReport(),
  };
}

export default function StatsDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);

  useEffect(() => {
    const sync = () => setState(getDashboardState());
    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, []);

  if (!state) return null;

  const showRate = Math.round((state.showedUpDays / Math.max(1, state.daysSinceStart)) * 100);
  const sleepProgress = Math.round((state.sleep.actual / Math.max(1, state.sleep.target)) * 100);
  const averageMoodLabel = state.mood === null ? "Not logged" : `${state.mood}/5 today`;

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Momentum score" value={state.score.toLocaleString()} detail="Total XP banked locally" />
        <MetricCard label="Show-up rate" value={`${showRate}%`} detail={`${state.showedUpDays}/${state.daysSinceStart} complete days`} />
        <MetricCard label="LeetCode count" value={String(state.leetCodeCount)} detail="Problems tracked so far" />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">CORE STREAKS</p>
        <div className="mt-4 space-y-3">
          {state.streaks.map((habit) => (
            <div key={habit.id} className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-semibold text-white">{habit.name}</p>
                  <p className="mt-1 text-[12px] text-white/45">{habit.total} completed days total</p>
                </div>
                <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${habit.color}22`, color: habit.color }}>
                  {habit.current} day streak
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">SLEEP THIS WEEK</p>
          <p className="mt-2 text-[22px] font-semibold text-white">{state.sleep.actual} / {state.sleep.target} hrs</p>
          <p className="mt-2 text-[12px] text-white/45">
            {state.sleep.loggedDays} days logged. {state.sleep.debt > 0 ? `${state.sleep.debt} hours short.` : "Target met."}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-[#fbbf24]" style={{ width: `${Math.min(100, sleepProgress)}%` }} />
          </div>
          {state.sleep.performance && (
            <p className="mt-4 text-[12px] text-white/55">
              Sleep-debt weeks reduced solve consistency by {state.sleep.performance.drop}% in your tracked history.
            </p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">ENERGY + MOOD</p>
          <p className="mt-2 text-[22px] font-semibold text-white">{state.energy.bestTime}</p>
          <p className="mt-2 text-[12px] text-white/45">{averageMoodLabel}</p>
          <div className="mt-4 space-y-2">
            {state.energy.slots.map((slot) => (
              <div key={slot.slot} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                <span className="text-[12px] text-white/65">{slot.slot}</span>
                <span className="text-[12px] font-semibold text-white">
                  {slot.count === 0 ? "No data" : `${slot.avg.toFixed(1)}/5`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">LIBRARY ACCOUNTABILITY</p>
          <p className="mt-2 text-[22px] font-semibold text-white">{state.library.skipped} skips in 30 days</p>
          <p className="mt-2 text-[12px] text-white/45">
            {state.library.topReason
              ? `Top miss reason: ${state.library.topReason[0]} (${state.library.topReason[1]}x)`
              : "No skip reasons logged yet."}
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">PATTERN REPORT</p>
          <div className="mt-3 space-y-2">
            {state.patternReport.length > 0 ? (
              state.patternReport.map((line) => (
                <div key={line} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-[12px] text-white/70">
                  {line}
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-[12px] text-white/45">
                Not enough history for a pattern warning yet.
              </div>
            )}
          </div>
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
