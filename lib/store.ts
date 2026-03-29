// ============================================================
// MOMENTUM — LocalStorage Data Store
// Offline-first: all data persisted in localStorage
// ============================================================

import { HABITS, type HardcodedHabit } from "./habits";
import { getTodayDate } from "./constants";

// ── Keys ──────────────────────────────────────────────────────
const KEYS = {
  completions: "momentum_completions",  // Record<date, habitId[]>
  streaks: "momentum_streaks",          // Record<habitId, { current, longest, lastDate }>
  score: "momentum_score",              // number
  leetcodeCount: "momentum_lc_count",   // number
  graceDaysUsed: "momentum_grace",      // number
} as const;

// ── Types ─────────────────────────────────────────────────────
export interface StoredStreak {
  current: number;
  longest: number;
  lastDate: string | null;
}

// ── Helpers ───────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Habits ────────────────────────────────────────────────────
export function getHabits(): HardcodedHabit[] {
  return HABITS;
}

// ── Completions ───────────────────────────────────────────────
export function getCompletionsForDate(date: string): string[] {
  const all = read<Record<string, string[]>>(KEYS.completions, {});
  return all[date] || [];
}

export function isHabitCompletedToday(habitId: string): boolean {
  return getCompletionsForDate(getTodayDate()).includes(habitId);
}

export function completeHabit(habitId: string, date?: string): void {
  const d = date || getTodayDate();
  const all = read<Record<string, string[]>>(KEYS.completions, {});
  if (!all[d]) all[d] = [];
  if (!all[d].includes(habitId)) {
    all[d].push(habitId);
  }
  write(KEYS.completions, all);
}

export function uncompleteHabit(habitId: string, date?: string): void {
  const d = date || getTodayDate();
  const all = read<Record<string, string[]>>(KEYS.completions, {});
  if (all[d]) {
    all[d] = all[d].filter((id) => id !== habitId);
  }
  write(KEYS.completions, all);
}

/** Get all dates a specific habit was completed (last N days) */
export function getHabitCompletionDates(habitId: string, days: number = 28): string[] {
  const all = read<Record<string, string[]>>(KEYS.completions, {});
  const result: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (all[dateStr]?.includes(habitId)) {
      result.push(dateStr);
    }
  }
  return result;
}

// ── Streaks ───────────────────────────────────────────────────
export function getStreak(habitId: string): StoredStreak {
  const all = read<Record<string, StoredStreak>>(KEYS.streaks, {});
  return all[habitId] || { current: 0, longest: 0, lastDate: null };
}

export function getAllStreaks(): Record<string, StoredStreak> {
  return read<Record<string, StoredStreak>>(KEYS.streaks, {});
}

export function updateStreak(habitId: string, date: string): StoredStreak {
  const all = read<Record<string, StoredStreak>>(KEYS.streaks, {});
  const prev = all[habitId] || { current: 0, longest: 0, lastDate: null };

  let newCurrent = 1;
  if (prev.lastDate) {
    const lastDate = new Date(prev.lastDate);
    const today = new Date(date);
    const diff = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    if (diff === 0) {
      // Same day, no change
      return prev;
    } else if (diff === 1) {
      newCurrent = prev.current + 1;
    }
    // diff > 1 → streak resets to 1 (already default)
  }

  const updated: StoredStreak = {
    current: newCurrent,
    longest: Math.max(newCurrent, prev.longest),
    lastDate: date,
  };
  all[habitId] = updated;
  write(KEYS.streaks, all);
  return updated;
}

// ── Score ─────────────────────────────────────────────────────
export function getScore(): number {
  return read<number>(KEYS.score, 0);
}

export function addScore(xp: number): number {
  const current = getScore();
  const newScore = current + xp;
  write(KEYS.score, newScore);
  return newScore;
}

// ── LeetCode ──────────────────────────────────────────────────
export function getLeetCodeCount(): number {
  return read<number>(KEYS.leetcodeCount, 0);
}

export function setLeetCodeCount(count: number): void {
  write(KEYS.leetcodeCount, count);
}

// ── Grace Days ────────────────────────────────────────────────
export function getGraceDaysUsed(): number {
  return read<number>(KEYS.graceDaysUsed, 0);
}
