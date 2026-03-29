"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTodayDate, getTimeGreeting, getFormattedDate, QUOTES } from "@/lib/constants";
import { rollReward } from "@/lib/engines/variableReward";
import { getHabits, getCompletionsForDate, completeHabit, getStreak, updateStreak, addScore, getScore, getHabitCompletionDates, getLeetCodeCount } from "@/lib/store";
import type { HabitCategory } from "@/lib/types";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import MedicalAlert from "@/components/today/MedicalAlert";
import HabitRow from "@/components/today/HabitRow";
import GrindCounter from "@/components/today/GrindCounter";
import PerfectDayBanner from "@/components/today/PerfectDayBanner";
import ParticleBurst from "@/components/effects/ParticleBurst";
import XPToast from "@/components/effects/XPToast";

export default function TodayPage() {
  const today = getTodayDate();
  const habits = getHabits();

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [streaks, setStreaks] = useState<Record<string, { current: number; longest: number }>>({});
  const [mounted, setMounted] = useState(false);

  // Effects
  const [particleTrigger, setParticleTrigger] = useState(false);
  const [particleCategory, setParticleCategory] = useState<HabitCategory>("GRIND");
  const [toastXP, setToastXP] = useState(0);
  const [toastBonus, setToastBonus] = useState<string | null>(null);
  const [toastColor, setToastColor] = useState("#ffffff");
  const [toastShow, setToastShow] = useState(false);

  // Quote rotation
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    quoteTimerRef.current = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 6000);
    return () => {
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    };
  }, []);

  // Load from localStorage on mount
  const loadData = useCallback(() => {
    const completed = getCompletionsForDate(today);
    setCompletedIds(new Set(completed));
    setScore(getScore());

    const streakData: Record<string, { current: number; longest: number }> = {};
    habits.forEach((h) => {
      const s = getStreak(h.id);
      streakData[h.id] = { current: s.current, longest: s.longest };
    });
    setStreaks(streakData);
  }, [today, habits]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const handleComplete = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const reward = rollReward(habit.xp_value);
    const xpEarned = habit.xp_value * reward.multiplier;

    // Trigger effects
    setParticleCategory(habit.category);
    setParticleTrigger(false);
    setTimeout(() => setParticleTrigger(true), 10);
    setToastXP(xpEarned);
    setToastBonus(reward.bonusType);
    setToastColor(reward.color);
    setToastShow(false);
    setTimeout(() => setToastShow(true), 50);

    // Persist to localStorage
    completeHabit(habitId, today);
    const newStreak = updateStreak(habitId, today);
    const newScore = addScore(xpEarned);

    // Update state
    setCompletedIds((prev) => new Set([...prev, habitId]));
    setScore(newScore);
    setStreaks((prev) => ({
      ...prev,
      [habitId]: { current: newStreak.current, longest: newStreak.longest },
    }));
  };

  // Computed
  const totalHabits = habits.length;
  const completedCount = completedIds.size;
  const isPerfectDay = totalHabits > 0 && completedCount === totalHabits;
  const progressPct = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

  // Group by category
  const categoryOrder: HabitCategory[] = ["MEDICAL", "BODY", "GRIND", "MIND"];
  const groupedHabits = categoryOrder
    .map((cat) => ({ category: cat, habits: habits.filter((h) => h.category === cat) }))
    .filter((g) => g.habits.length > 0);

  // Missed medical
  const missedMeds = habits
    .filter((h) => h.is_critical && !completedIds.has(h.id))
    .map((h) => h.label);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-[11px] text-[#525252] tracking-widest">MOMENTUM</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <PhaseIndicator />

      <ParticleBurst trigger={particleTrigger} category={particleCategory} />
      <XPToast xp={toastXP} bonusLabel={toastBonus} color={toastColor} show={toastShow} />

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Greeting + Date */}
        <div className="mb-4">
          <h1 className="text-base font-medium text-[#e5e5e5]">
            {getTimeGreeting()}
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-[#525252] mt-1">
            {getFormattedDate()}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-[#ef4444] via-[#3b82f6] to-[#a855f7] transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Medical Alert */}
        <MedicalAlert missedMeds={missedMeds} />

        {/* Habits */}
        {groupedHabits.map((group) => (
          <div key={group.category} className="mb-2">
            {group.habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                streak={streaks[habit.id] || { current: 0, longest: 0 }}
                isCompleted={completedIds.has(habit.id)}
                onComplete={handleComplete}
                completions28d={getHabitCompletionDates(habit.id, 28)}
              />
            ))}
          </div>
        ))}

        {isPerfectDay && <PerfectDayBanner />}

        <GrindCounter
          solvedToday={0}
          totalSolved={getLeetCodeCount()}
          targetTotal={750}
          nextMilestone="100 LeetCode Easy"
          nextMilestoneTarget={100}
        />

        {/* Rotating quote */}
        <div className="mt-8 mb-4 text-center transition-opacity duration-1000">
          <p className="text-[10px] text-[#525252] italic leading-relaxed max-w-xs mx-auto">
            &ldquo;{QUOTES[quoteIndex]}&rdquo;
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
