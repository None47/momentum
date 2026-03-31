import { getCurrentPhase, getDayNumber, getDaysToPlacement, DAY_ONE } from "./constants";
import { getLeetCodeCount } from "./store";

export const CORE_HABIT_IDS = ["body-gym", "grind-coding", "grind-leetcode"] as const;

export type CoreHabitId = (typeof CORE_HABIT_IDS)[number];

export interface CoreHabit {
  id: CoreHabitId;
  name: string;
  shortName: string;
  subtitle: string;
  color: string;
  glow: string;
  warningTitle: string;
  warningBody: string;
  skipImpact: string;
}

export interface DailyTaskEntry {
  date: string;
  task: string;
  done: boolean;
  regenerations: number;
}

export const CORE_HABITS: CoreHabit[] = [
  {
    id: "body-gym",
    name: "GYM",
    shortName: "GYM",
    subtitle: "5:40 AM",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.45)",
    warningTitle: "YOUR GYM STREAK DIES TONIGHT.",
    warningBody: "You have 4 hours.",
    skipImpact: "You lose one workout that should have happened today.",
  },
  {
    id: "grind-coding",
    name: "CODING",
    shortName: "CODING",
    subtitle: "LIBRARY ONLY",
    color: "#f4f4f5",
    glow: "rgba(245, 245, 245, 0.35)",
    warningTitle: "YOUR CODING STREAK DIES TONIGHT.",
    warningBody: "Library closes soon.",
    skipImpact: "You lose one day of build time that should have happened today.",
  },
  {
    id: "grind-leetcode",
    name: "LEETCODE",
    shortName: "LC",
    subtitle: "ONE PROBLEM MINIMUM",
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.45)",
    warningTitle: "YOUR LC STREAK DIES TONIGHT.",
    warningBody: "One problem. That's all.",
    skipImpact: "You fall 1 problem behind the 300 problem target.",
  },
];

export const DEFAULT_WHY_TEXT =
  "I want ₹60L because I want to prove that a tier-3 college kid from Hospet can compete with anyone. I want to take care of my family. I want to never feel limited by money again. I have cousins at Apple and Microsoft waiting to refer me — but only if I'm ready. 577 days. No excuses.";

const KEYS = {
  completions: "momentum_completions",
  whyText: "momentum_why_text",
  dailyTask: "momentum_daily_one_thing",
  lastOpenDate: "momentum_last_open_date",
  whyPromptDate: "momentum_why_prompt_date",
  perfectDayDate: "momentum_perfect_day_date",
  doubleXpUntil: "momentum_double_xp_until",
  lockInSessions: "momentum_lock_in_sessions",
  profileMeta: "momentum_profile_meta",
} as const;

interface LockInDayEntry {
  date: string;
  sessions: number;
}

interface ProfileMeta {
  projects: number;
  cgpa: number;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

export function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function getTodayKey() {
  return formatDateKey(new Date());
}

export function getYesterdayKey() {
  return addDays(getTodayKey(), -1);
}

function getCompletionMap() {
  return readStorage<Record<string, string[]>>(KEYS.completions, {});
}

export function getCoreCompletions(dateKey: string) {
  const all = getCompletionMap();
  const completed = new Set(all[dateKey] ?? []);
  return CORE_HABITS.map((habit) => ({
    ...habit,
    completed: completed.has(habit.id),
  }));
}

export function isHabitDoneOnDate(habitId: CoreHabitId, dateKey: string) {
  const all = getCompletionMap();
  return Boolean(all[dateKey]?.includes(habitId));
}

export function areAllCoreHabitsDone(dateKey: string) {
  return CORE_HABIT_IDS.every((habitId) => isHabitDoneOnDate(habitId, dateKey));
}

export function getCurrentHabitStreak(habitId: CoreHabitId, fromDate = getTodayKey()) {
  let streak = 0;
  let cursor = fromDate;

  while (cursor >= formatDateKey(DAY_ONE) && isHabitDoneOnDate(habitId, cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getLongestHabitStreak(habitId: CoreHabitId) {
  let longest = 0;
  let current = 0;
  let cursor = formatDateKey(DAY_ONE);
  const today = getTodayKey();

  while (cursor <= today) {
    if (isHabitDoneOnDate(habitId, cursor)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
    cursor = addDays(cursor, 1);
  }

  return longest;
}

export function getTotalCompletedForHabit(habitId: CoreHabitId) {
  let total = 0;
  let cursor = formatDateKey(DAY_ONE);
  const today = getTodayKey();

  while (cursor <= today) {
    if (isHabitDoneOnDate(habitId, cursor)) {
      total += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return total;
}

export function getConsecutiveMisses(habitId: CoreHabitId, referenceDate = getTodayKey()) {
  let misses = 0;
  let cursor = addDays(referenceDate, -1);

  while (cursor >= formatDateKey(DAY_ONE) && !isHabitDoneOnDate(habitId, cursor)) {
    misses += 1;
    cursor = addDays(cursor, -1);
  }

  return misses;
}

export function getShowedUpDays() {
  let total = 0;
  let cursor = formatDateKey(DAY_ONE);
  const today = getTodayKey();

  while (cursor <= today) {
    if (areAllCoreHabitsDone(cursor)) {
      total += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return total;
}

export function getDaysSinceStart() {
  const today = parseDateKey(getTodayKey()).getTime();
  const start = parseDateKey(formatDateKey(DAY_ONE)).getTime();
  return Math.max(1, Math.floor((today - start) / 86400000) + 1);
}

export function getIdentityMirrorState() {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const lastOpenDate = readStorage<string | null>(KEYS.lastOpenDate, null);
  const isFirstOpenToday = lastOpenDate !== today;

  return {
    today,
    isFirstOpenToday,
    showedUpYesterday: areAllCoreHabitsDone(yesterday),
    missedYesterday: !areAllCoreHabitsDone(yesterday),
    yesterdayShowUpStreak: getShowedUpDaysUntil(yesterday),
    daysUntilTarget: getDaysToPlacement(),
  };
}

function getShowedUpDaysUntil(dateKey: string) {
  let total = 0;
  let cursor = formatDateKey(DAY_ONE);

  while (cursor <= dateKey) {
    if (areAllCoreHabitsDone(cursor)) {
      total += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return total;
}

export function markAppOpened(dateKey = getTodayKey()) {
  writeStorage(KEYS.lastOpenDate, dateKey);
}

export function shouldPromptWhy() {
  const today = getTodayKey();
  const lastPromptDate = readStorage<string | null>(KEYS.whyPromptDate, null);
  if (lastPromptDate === today) return false;
  return CORE_HABIT_IDS.some((habitId) => getConsecutiveMisses(habitId, today) >= 3);
}

export function markWhyPromptSeen(dateKey = getTodayKey()) {
  writeStorage(KEYS.whyPromptDate, dateKey);
}

export function getComebackHabit() {
  return CORE_HABITS.find((habit) => getConsecutiveMisses(habit.id) >= 2) ?? null;
}

export function activateComebackMode() {
  const until = Date.now() + 48 * 60 * 60 * 1000;
  writeStorage(KEYS.doubleXpUntil, until);
  markAppOpened();
}

export function hasActiveDoubleXp() {
  return Date.now() < readStorage<number>(KEYS.doubleXpUntil, 0);
}

export function getWhyText() {
  return readStorage<string>(KEYS.whyText, DEFAULT_WHY_TEXT);
}

export function saveWhyText(value: string) {
  writeStorage(KEYS.whyText, value);
}

export function getDailyTask(dateKey = getTodayKey()) {
  const all = readStorage<Record<string, DailyTaskEntry>>(KEYS.dailyTask, {});
  return all[dateKey] ?? null;
}

export function saveDailyTask(task: DailyTaskEntry) {
  const all = readStorage<Record<string, DailyTaskEntry>>(KEYS.dailyTask, {});
  all[task.date] = task;
  writeStorage(KEYS.dailyTask, all);
}

export function getLockInSessions(dateKey = getTodayKey()) {
  const all = readStorage<Record<string, LockInDayEntry>>(KEYS.lockInSessions, {});
  return all[dateKey]?.sessions ?? 0;
}

export function addLockInSession(dateKey = getTodayKey()) {
  const all = readStorage<Record<string, LockInDayEntry>>(KEYS.lockInSessions, {});
  const current = all[dateKey]?.sessions ?? 0;
  all[dateKey] = { date: dateKey, sessions: current + 1 };
  writeStorage(KEYS.lockInSessions, all);
  return all[dateKey].sessions;
}

export function getWeeklyLockInSessions() {
  let total = 0;
  let cursor = getTodayKey();

  for (let index = 0; index < 7; index += 1) {
    total += getLockInSessions(cursor);
    cursor = addDays(cursor, -1);
  }

  return total;
}

export function markPerfectDayShown(dateKey = getTodayKey()) {
  writeStorage(KEYS.perfectDayDate, dateKey);
}

export function hasShownPerfectDay(dateKey = getTodayKey()) {
  return readStorage<string | null>(KEYS.perfectDayDate, null) === dateKey;
}

export function getProfileMeta() {
  return readStorage<ProfileMeta>(KEYS.profileMeta, { projects: 0, cgpa: 0 });
}

export function getReferralStatus() {
  const lc = getLeetCodeCount();
  const profile = getProfileMeta();
  const unlocked = lc >= 300 && profile.projects >= 5 && profile.cgpa >= 7.0;

  return {
    lc,
    lcTarget: 300,
    projects: profile.projects,
    projectsTarget: 5,
    cgpa: profile.cgpa,
    cgpaTarget: 7.0,
    unlocked,
    readinessPct: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (Math.min(lc / 300, 1) + Math.min(profile.projects / 5, 1) + Math.min(profile.cgpa / 7, 1)) *
            (100 / 3),
        ),
      ),
    ),
  };
}

export function getStatsSummary() {
  const days = getDaysSinceStart();
  const showedUp = getShowedUpDays();
  const completionRate = days > 0 ? Math.round((showedUp / days) * 100) : 0;
  const phase = getCurrentPhase();

  return {
    dayNumber: getDayNumber(),
    daysRemaining: getDaysToPlacement(),
    showedUp,
    days,
    completionRate,
    phase: phase.label,
  };
}
