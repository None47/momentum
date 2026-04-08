import { getCoreCompletions, getTodayKey, addDays } from "./momentum";

const KEYS = {
  sleepLogs: "momentum_sleep_logs",
  sleepTips: "momentum_sleep_tips",
} as const;

export type SleepHoursOption = 4 | 5 | 6 | 7 | 8 | 9;

export interface SleepLogEntry {
  date: string;
  hours: SleepHoursOption;
}

export interface SleepTipEntry {
  weekStart: string;
  generatedAt: string;
  tip: string;
}

export interface SleepCorrelationPoint {
  date: string;
  hours: number;
  habitsCompleted: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("momentum:data-changed"));
}

function getWeekStart(dateKey = getTodayKey()) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}

export function getSleepLogs() {
  return read<SleepLogEntry[]>(KEYS.sleepLogs, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function getSleepLog(date = getTodayKey()) {
  return getSleepLogs().find((entry) => entry.date === date) ?? null;
}

export function saveSleepLog(hours: SleepHoursOption, date = getTodayKey()) {
  const all = getSleepLogs().filter((entry) => entry.date !== date);
  all.push({ date, hours });
  write(KEYS.sleepLogs, all);
  emitChange();
}

export function shouldShowMorningSleepCheckIn(now = new Date()) {
  const atOrAfterSix = now.getHours() >= 6;
  return atOrAfterSix && getSleepLog() === null;
}

export function getCognitionSummary(hours: number) {
  if (hours <= 4) {
    return {
      label: "IMPAIRED",
      symbol: "◇",
      short: "Skip hard LC today. Do review problems only.",
      detail: "IMPAIRED — Skip hard LC today. Do review problems only.",
    };
  }
  if (hours === 5) {
    return {
      label: "BELOW OPTIMAL",
      symbol: "◇",
      short: "Easy problems only. No system design study.",
      detail: "BELOW OPTIMAL — Easy problems only. No system design study.",
    };
  }
  if (hours === 6) {
    return {
      label: "SUB-OPTIMAL",
      symbol: "◇",
      short: "You'll solve 20% slower.",
      detail: "SUB-OPTIMAL — You'll solve 20% slower.",
    };
  }
  if (hours === 7) {
    return {
      label: "PEAK",
      symbol: "◆",
      short: "Best window for hard problems.",
      detail: "PEAK — Best window for hard problems.",
    };
  }
  if (hours === 8) {
    return {
      label: "OPTIMAL",
      symbol: "◆",
      short: "Schedule hardest topics now.",
      detail: "OPTIMAL — Schedule hardest topics now.",
    };
  }
  return {
    label: "OVER-SLEPT",
    symbol: "◇",
    short: "May feel groggy. Light warm-up first.",
    detail: "OVER-SLEPT — May feel groggy. Light warm-up first.",
  };
}

export function getTodayCognitionCard() {
  const sleep = getSleepLog();
  if (!sleep) return null;
  const summary = getCognitionSummary(sleep.hours);
  const line =
    summary.label === "PEAK" || summary.label === "OPTIMAL"
      ? `TODAY'S COGNITION: ${summary.label} ${summary.symbol} ${sleep.hours}${sleep.hours >= 9 ? "+" : ""}hrs slept`
      : `TODAY'S COGNITION: ${summary.label} ${summary.symbol} ${sleep.hours}${sleep.hours >= 9 ? "+" : ""}hrs slept Adjust plan: ${summary.short.replace(/\.$/, "").toLowerCase()}.`;
  return { ...summary, hours: sleep.hours, line };
}

export function getWeeklySleepSummary(referenceDate = getTodayKey()) {
  const weekStart = getWeekStart(referenceDate);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const logs = getSleepLogs().filter((entry) => dates.includes(entry.date));
  const actual = logs.reduce((sum, entry) => sum + entry.hours, 0);
  const debt = Math.max(0, 49 - actual);
  const debtWeeks = logs.length === 7 ? getHistoricalDebtPerformance() : null;
  return {
    weekStart,
    actual,
    debt,
    loggedDays: logs.length,
    target: 49,
    performance: debtWeeks,
  };
}

function getHistoricalDebtPerformance() {
  const logs = getSleepLogs();
  if (logs.length < 14) return null;

  const weekMap = new Map<string, SleepLogEntry[]>();
  for (const log of logs) {
    const weekStart = getWeekStart(log.date);
    const current = weekMap.get(weekStart) ?? [];
    current.push(log);
    weekMap.set(weekStart, current);
  }

  const debtWeeks: number[] = [];
  const restWeeks: number[] = [];
  for (const [weekStart, entries] of weekMap.entries()) {
    const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const actual = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const solveDays = dates.filter((date) => getCoreCompletions(date).find((habit) => habit.id === "grind-leetcode")?.completed).length;
    const solveRate = Math.round((solveDays / 7) * 100);
    if (actual < 49) debtWeeks.push(solveRate);
    else restWeeks.push(solveRate);
  }

  if (debtWeeks.length === 0 || restWeeks.length === 0) return null;
  const debtAvg = Math.round(debtWeeks.reduce((sum, value) => sum + value, 0) / debtWeeks.length);
  const restAvg = Math.round(restWeeks.reduce((sum, value) => sum + value, 0) / restWeeks.length);
  const drop = restAvg === 0 ? 0 : Math.max(0, Math.round(((restAvg - debtAvg) / restAvg) * 100));
  return { debtAvg, restAvg, drop };
}

export function getSleepCorrelation(days = 30) {
  const end = getTodayKey();
  const start = addDays(end, -(days - 1));
  const logs = getSleepLogs().filter((entry) => entry.date >= start && entry.date <= end);
  const points: SleepCorrelationPoint[] = logs.map((entry) => ({
    date: entry.date,
    hours: entry.hours,
    habitsCompleted: getCoreCompletions(entry.date).filter((habit) => habit.completed).length,
  }));
  return points;
}

export function getSleepCorrelationInsight(days = 30) {
  const points = getSleepCorrelation(days);
  if (points.length < 30) return null;
  const strong = points.filter((point) => point.hours >= 7);
  const weak = points.filter((point) => point.hours < 6);
  if (strong.length === 0 || weak.length === 0) return null;

  const strongCompletion = Math.round((strong.filter((point) => point.habitsCompleted >= 2).length / strong.length) * 100);
  const weakCompletion = Math.round((weak.filter((point) => point.habitsCompleted >= 2).length / weak.length) * 100);
  return {
    strongCompletion,
    weakCompletion,
  };
}

export function getSleepTip(weekStart = getWeekStart()) {
  return read<Record<string, SleepTipEntry>>(KEYS.sleepTips, {})[weekStart] ?? null;
}

export function saveSleepTip(entry: SleepTipEntry) {
  const all = read<Record<string, SleepTipEntry>>(KEYS.sleepTips, {});
  all[entry.weekStart] = entry;
  write(KEYS.sleepTips, all);
  emitChange();
}
