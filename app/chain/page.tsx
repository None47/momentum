"use client";

import { useSyncExternalStore } from "react";
import { getHabits, getStreak, getHabitCompletionDates, getScore } from "@/lib/store";
import { CATEGORY_COLORS, type HabitCategory } from "@/lib/types";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import ChainCalendar from "@/components/chain/ChainCalendar";

export default function ChainPage() {
  const score = useSyncExternalStore(
    () => () => {},
    () => getScore(),
    () => 0,
  );

  const habits = getHabits();
  const categoryOrder: HabitCategory[] = ["MEDICAL", "BODY", "GRIND", "MIND"];
  const grouped = categoryOrder
    .map((cat) => ({ category: cat, habits: habits.filter((h) => h.category === cat) }))
    .filter((g) => g.habits.length > 0);

  // Calculate medication streak (min streak across all critical habits)
  const medStreaks = habits
    .filter((h) => h.is_critical)
    .map((h) => getStreak(h.id).current);
  const medStreak = medStreaks.length > 0 ? Math.min(...medStreaks) : 0;

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <PhaseIndicator />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">THE CHAIN</h1>
        <p className="text-[10px] text-[#525252] mb-4">Don&apos;t break it.</p>

        <div className="border border-[#ef4444]/20 bg-[#0d0808] rounded-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.15em] text-[#ef4444]/60 uppercase">Medication Streak</span>
            <span className={`text-2xl font-bold tabular-nums ${medStreak >= 7 ? "streak-fire" : "text-[#ef4444]"}`}>
              {medStreak}<span className="text-[10px] text-[#525252] ml-1">days</span>
            </span>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="mb-6">
            <h2 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-3" style={{ color: CATEGORY_COLORS[group.category] }}>
              {group.category}
            </h2>
            {group.habits.map((habit) => {
              const streak = getStreak(habit.id);
              return (
                <div key={habit.id} className="mb-4 border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#e5e5e5]">{habit.icon} {habit.label}</span>
                    <span className={`text-[11px] font-bold tabular-nums ${streak.current >= 7 ? "streak-fire" : "text-[#737373]"}`}>
                      {streak.current}d
                    </span>
                  </div>
                  <ChainCalendar
                    category={habit.category}
                    completedDates={getHabitCompletionDates(habit.id, 28)}
                    currentStreak={streak.current}
                    longestStreak={streak.longest}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
