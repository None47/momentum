// ============================================================
// Streak Engine
// Manages streak calculations, at-risk detection, grace days
// ============================================================

import type { Streak } from "../types";

/**
 * Check if a habit is "at risk" — incomplete and past 7 PM IST
 */
export function isAtRisk(
  streak: Streak,
  isCompletedToday: boolean,
  currentHour: number = new Date().getHours()
): boolean {
  if (isCompletedToday) return false;
  if (streak.current_streak === 0) return false;
  return currentHour >= 19; // 7 PM
}

/**
 * Calculate what the new streak should be after a completion
 */
export function calculateNewStreak(
  streak: Streak,
  completionDate: string
): { currentStreak: number; longestStreak: number } {
  const today = completionDate;
  const lastDate = streak.last_completed_date;

  if (!lastDate) {
    // First ever completion
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, streak.longest_streak),
    };
  }

  const lastDateObj = new Date(lastDate);
  const todayObj = new Date(today);
  const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / 86400000);

  if (diffDays === 0) {
    // Same day — no change
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
    };
  }

  if (diffDays === 1) {
    // Consecutive day — increment
    const newStreak = streak.current_streak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longest_streak),
    };
  }

  // Missed days — streak resets to 1
  return {
    currentStreak: 1,
    longestStreak: streak.longest_streak,
  };
}

/**
 * Check if user has been away for 2+ days (triggers COMEBACK mode)
 */
export function shouldShowComeback(lastCompletionDate: string | null): boolean {
  if (!lastCompletionDate) return false;
  const last = new Date(lastCompletionDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
  return diffDays >= 2;
}

/**
 * Check if grace day can be used (max 1 per month)
 */
export function canUseGraceDay(graceDaysUsed: number): boolean {
  return graceDaysUsed < 1;
}

/**
 * Get streak display info
 */
export function getStreakDisplay(streak: Streak, isCompletedToday: boolean): {
  count: number;
  isHot: boolean; // 7+ days
  isAtRisk: boolean;
  label: string;
} {
  const currentHour = new Date().getHours();
  const atRisk = isAtRisk(streak, isCompletedToday, currentHour);

  return {
    count: streak.current_streak,
    isHot: streak.current_streak >= 7,
    isAtRisk: atRisk,
    label: streak.current_streak > 0 ? `${streak.current_streak}d` : "—",
  };
}
