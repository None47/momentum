import { getCurrentPhase } from "./constants";
import {
  CORE_HABIT_IDS,
  addDays,
  formatDateKey,
  getCoreCompletions,
  getTodayKey,
  isHabitDoneOnDate,
} from "./momentum";

const KEYS = {
  bodyDoubling: "momentum_exec_body_doubling",
  starterAttempts: "momentum_exec_starter_attempts",
  mockInterviews: "momentum_exec_mock_interviews",
  energyCheckins: "momentum_exec_energy_checkins",
  github: "momentum_exec_github",
  patternDismissals: "momentum_exec_pattern_dismissals",
} as const;

export type StarterCategory = "LEETCODE" | "CODING" | "GYM";
export type InterviewType = "CODING" | "BEHAVIOURAL" | "SYSTEM_DESIGN";
export type EnergySlot = "MORNING" | "AFTERNOON" | "EVENING";
export type AmbientMode = "OFF" | "RAIN" | "CAFE" | "BROWN";

export interface StarterAttempt {
  id: string;
  date: string;
  category: StarterCategory;
  step: string;
  escalated: boolean;
  completed: boolean;
  convertedToSession: boolean;
}

export interface BodyDoublingState {
  sound: AmbientMode;
  monthlySessions: number;
}

export interface MockInterviewEntry {
  id: string;
  type: InterviewType;
  prompt: string;
  startedAt: number;
  submittedAt: number;
  minutesTaken: number;
  answer: string;
  feedback: string;
  pass: boolean;
  score: number;
  weakness: string;
}

export interface EnergyCheckinEntry {
  date: string;
  slot: EnergySlot;
  rating: number;
}

export interface GithubCacheEntry {
  username: string;
  fetchedAt: number;
  todayHasCommit: boolean;
  streak: number;
  longestStreak: number;
  totalCommitsYear: number;
  mostActiveDay: string;
  weeklyCommitCount: number;
  advice: string;
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

function getWeekdayIndex(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function getBodyDoublingState() {
  return read<BodyDoublingState>(KEYS.bodyDoubling, { sound: "OFF", monthlySessions: 0 });
}

export function setBodyDoublingSound(sound: AmbientMode) {
  const current = getBodyDoublingState();
  write(KEYS.bodyDoubling, { ...current, sound });
  emitChange();
}

export function incrementBodyDoublingSession() {
  const current = getBodyDoublingState();
  write(KEYS.bodyDoubling, { ...current, monthlySessions: current.monthlySessions + 1 });
  emitChange();
}

export function getStarterStep(category: StarterCategory) {
  if (category === "LEETCODE") {
    return "Open leetcode.com. Read problem #1 Two Sum. Do not solve it yet. Just read it.";
  }
  if (category === "CODING") {
    return "Open VS Code. Create practice.py. Type print('hello'). Run it.";
  }
  return "Put on your gym clothes. You do not have to go yet. Just put them on.";
}

export function getStarterAttempts() {
  return read<StarterAttempt[]>(KEYS.starterAttempts, []).sort((a, b) => b.id.localeCompare(a.id));
}

export function createStarterAttempt(category: StarterCategory, escalated = false, step?: string) {
  const attempt: StarterAttempt = {
    id: crypto.randomUUID(),
    date: getTodayKey(),
    category,
    step: step ?? getStarterStep(category),
    escalated,
    completed: false,
    convertedToSession: false,
  };
  const all = getStarterAttempts();
  all.push(attempt);
  write(KEYS.starterAttempts, all);
  emitChange();
  return attempt;
}

export function completeStarterAttempt(id: string) {
  const all = getStarterAttempts();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return null;
  all[index] = { ...all[index], completed: true };
  write(KEYS.starterAttempts, all);
  emitChange();
  return all[index];
}

export function markStarterConverted(category: StarterCategory) {
  const all = getStarterAttempts();
  const index = all.findIndex((item) => item.date === getTodayKey() && item.category === category && item.completed && !item.convertedToSession);
  if (index < 0) return;
  all[index] = { ...all[index], convertedToSession: true };
  write(KEYS.starterAttempts, all);
  emitChange();
}

export function getStarterStats() {
  const currentWeekStart = (() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    today.setDate(today.getDate() + diff);
    return formatDateKey(today);
  })();
  const all = getStarterAttempts().filter((item) => item.date >= currentWeekStart);
  return {
    started: all.filter((item) => item.completed).length,
    converted: all.filter((item) => item.convertedToSession).length,
  };
}

export function getMockInterviews() {
  return read<MockInterviewEntry[]>(KEYS.mockInterviews, []).sort((a, b) => b.startedAt - a.startedAt);
}

export function saveMockInterview(entry: MockInterviewEntry) {
  const all = getMockInterviews();
  all.push(entry);
  write(KEYS.mockInterviews, all);
  emitChange();
}

export function getMockInterviewStats() {
  const mocks = getMockInterviews();
  const coding = mocks.filter((item) => item.type === "CODING");
  const behavioural = mocks.filter((item) => item.type === "BEHAVIOURAL");
  const passRate = coding.length === 0 ? 0 : Math.round((coding.filter((item) => item.pass).length / coding.length) * 100);
  const avgEasyTime = coding.length === 0 ? 0 : Math.round(coding.reduce((sum, item) => sum + item.minutesTaken, 0) / coding.length);
  const behaviouralAvg = behavioural.length === 0 ? 0 : Math.round((behavioural.reduce((sum, item) => sum + item.score, 0) / behavioural.length) * 10) / 10;
  const weakest = mocks.map((item) => item.weakness).filter(Boolean).sort()[0] ?? "Consistency under pressure";
  const readiness = Math.min(100, Math.round(passRate * 0.55 + Math.min(25, mocks.length * 4) + behaviouralAvg * 2));

  return {
    total: mocks.length,
    passRate,
    avgEasyTime,
    behaviouralAvg,
    weakest,
    readiness,
  };
}

export function getEnergyCheckins() {
  return read<EnergyCheckinEntry[]>(KEYS.energyCheckins, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveEnergyCheckin(slot: EnergySlot, rating: number, date = getTodayKey()) {
  const all = getEnergyCheckins().filter((entry) => !(entry.date === date && entry.slot === slot));
  all.push({ date, slot, rating });
  write(KEYS.energyCheckins, all);
  emitChange();
}

export function getDueEnergySlot(now = new Date()): EnergySlot | null {
  const hour = now.getHours();
  const date = getTodayKey();
  const entries = getEnergyCheckins().filter((entry) => entry.date === date);

  if (hour >= 7 && hour < 12 && !entries.some((entry) => entry.slot === "MORNING")) return "MORNING";
  if (hour >= 15 && hour < 18 && !entries.some((entry) => entry.slot === "AFTERNOON")) return "AFTERNOON";
  if (hour >= 19 && hour < 23 && !entries.some((entry) => entry.slot === "EVENING")) return "EVENING";
  return null;
}

export function getEnergyInsight() {
  const all = getEnergyCheckins();
  const slots: EnergySlot[] = ["MORNING", "AFTERNOON", "EVENING"];
  const stats = slots.map((slot) => {
    const entries = all.filter((entry) => entry.slot === slot);
    const avg = entries.length === 0 ? 0 : Math.round((entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length) * 10) / 10;
    return { slot, avg, count: entries.length };
  });
  const best = [...stats].sort((a, b) => b.avg - a.avg)[0];
  return {
    slots: stats,
    bestTime: best?.slot ?? "AFTERNOON",
  };
}

export function getLowEnergyPlan() {
  const afternoon = getEnergyCheckins().find((entry) => entry.date === getTodayKey() && entry.slot === "AFTERNOON");
  if (!afternoon || afternoon.rating > 2) return null;
  return [
    "Review 3 flashcards (15 min)",
    "Read one NeetCode solution (10 min)",
    "Call it a win and rest",
  ];
}

export function getGithubUsername() {
  return read<{ username: string } | null>(KEYS.github, null)?.username ?? "";
}

export function saveGithubUsername(username: string) {
  const current = read<Record<string, unknown>>(KEYS.github, {});
  write(KEYS.github, { ...current, username });
  emitChange();
}

export function saveGithubCache(cache: GithubCacheEntry) {
  const current = read<Record<string, unknown>>(KEYS.github, {});
  write(KEYS.github, { ...current, cache });
  emitChange();
}

export function getGithubCache() {
  return read<{ username?: string; cache?: GithubCacheEntry }>(KEYS.github, {}).cache ?? null;
}

function getPatternDismissals() {
  return read<Record<string, string>>(KEYS.patternDismissals, {});
}

export function dismissPatternWarning(id: string, date = getTodayKey()) {
  const all = getPatternDismissals();
  all[date] = id;
  write(KEYS.patternDismissals, all);
  emitChange();
}

export function getTodayPatternWarning() {
  const today = getTodayKey();
  const dismissed = getPatternDismissals()[today];
  const warnings = getPatternWarnings();
  return warnings.find((item) => item.id !== dismissed) ?? null;
}

export function getPatternWarnings() {
  const warnings: { id: string; label: string }[] = [];

  const showedUpStreak = (() => {
    let streak = 0;
    let cursor = todayMinus(1);
    while (cursor >= "2026-03-23" && getCoreCompletions(cursor).every((habit) => habit.completed)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  })();

  if (showedUpStreak >= 14) {
    warnings.push({
      id: "week-3-crash",
      label: "WEEK 3 ALERT. Historically this is where motivation drops. Do not change anything. Just keep the streak alive.",
    });
  }

  const mondayWindow = Array.from({ length: 8 }, (_, index) => addDays(getTodayKey(), -index * 7));
  const mondayMisses = mondayWindow.filter((date) => getWeekdayIndex(date) === 1 && !isHabitDoneOnDate("body-gym", date)).length;
  const mondayTotal = mondayWindow.filter((date) => getWeekdayIndex(date) === 1).length;
  if (mondayTotal >= 3 && mondayMisses / mondayTotal >= 0.7) {
    warnings.push({
      id: "monday-trap",
      label: "You skip gym most Mondays. Monday gym sets the tone for the week. This Monday is non-negotiable.",
    });
  }

  const eveningEnergy = getEnergyCheckins().filter((entry) => entry.slot === "EVENING").slice(-14);
  const lowEveningEnergyRate =
    eveningEnergy.length >= 5
      ? eveningEnergy.filter((entry) => entry.rating <= 2).length / eveningEnergy.length
      : 0;
  if (lowEveningEnergyRate >= 0.6) {
    warnings.push({
      id: "evening-spiral",
      label: "Your late evening completions correlate with lower quality. Do LeetCode before 8 PM.",
    });
  }

  const lastTwoMissed = CORE_HABIT_IDS.every((habitId) => !isHabitDoneOnDate(habitId, todayMinus(1)) && !isHabitDoneOnDate(habitId, todayMinus(2)));
  if (lastTwoMissed) {
    warnings.push({
      id: "post-holiday-collapse",
      label: "Last time you missed 2 days you kept missing. The pattern is starting. Today is the critical day.",
    });
  }

  if (showedUpStreak >= 7) {
    warnings.push({
      id: "streak-overconfidence",
      label: "You are on a strong streak. This is when people get comfortable and start skipping. Keep the streak alive.",
    });
  }

  return warnings.slice(0, 1);
}

function todayMinus(days: number) {
  return addDays(getTodayKey(), -days);
}

export function getPatternReport() {
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(getTodayKey(), -index));
  const codingMisses = weekDates.filter((date) => !isHabitDoneOnDate("grind-coding", date));
  const gymByDay = weekDates.reduce<Record<number, number>>((acc, date) => {
    const day = getWeekdayIndex(date);
    if (isHabitDoneOnDate("body-gym", date)) acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const bestGymDay = Object.entries(gymByDay).sort((a, b) => b[1] - a[1])[0];
  const energyInsight = getEnergyInsight();

  const report: string[] = [];
  if (codingMisses.length >= 3) report.push(`You skipped coding ${codingMisses.length} times this week.`);
  if (bestGymDay) report.push(`Your best gym day is ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Number(bestGymDay[0])]}.`);
  report.push(`Your best energy window is ${energyInsight.bestTime.toLowerCase()}.`);
  return report;
}

export function getBehaviouralQuestions() {
  return [
    "Tell me about a challenge you overcame.",
    "Why do you want to work at Amazon?",
    "Tell me about a failure and what you learned.",
    "Describe a project you are proud of.",
    "Where do you see yourself in 5 years?",
    "Why should we hire you over others?",
  ];
}

export function getCodingMockPrompt() {
  return "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.";
}

export function getSystemDesignPrompt() {
  return "Design a URL shortener like bit.ly.";
}

export function isSystemDesignUnlocked() {
  return getCurrentPhase().number >= 3;
}
