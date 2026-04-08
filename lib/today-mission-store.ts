import { getTodayDate } from "./constants";

const KEYS = {
  aiBriefs: "momentum_today_ai_briefs",
  oneThings: "momentum_today_one_things",
  oneThingRegens: "momentum_today_one_thing_regens",
  starterAttempts: "momentum_today_starter_attempts",
  energyLogs: "momentum_today_energy_logs",
  moodLogs: "momentum_today_mood_logs",
  accountability: "momentum_today_accountability",
  csQuestionRatings: "momentum_today_cs_question_ratings",
} as const;

type EnergySlot = "morning" | "afternoon" | "evening";
type AccountabilityEntry = {
  gymDone: boolean | null;
  codingDone: boolean | null;
  lcDone: boolean | null;
};

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
  window.dispatchEvent(new Event("momentum:data-changed"));
}

export function getAIBrief(date = getTodayDate()) {
  return read<Record<string, string>>(KEYS.aiBriefs, {})[date] ?? null;
}

export function saveAIBrief(brief: string, date = getTodayDate()) {
  const all = read<Record<string, string>>(KEYS.aiBriefs, {});
  all[date] = brief;
  write(KEYS.aiBriefs, all);
}

export function getOneThing(date = getTodayDate()) {
  return read<Record<string, string>>(KEYS.oneThings, {})[date] ?? null;
}

export function saveOneThing(task: string, date = getTodayDate()) {
  const all = read<Record<string, string>>(KEYS.oneThings, {});
  all[date] = task;
  write(KEYS.oneThings, all);
}

export function getOneThingRegens(date = getTodayDate()) {
  return read<Record<string, number>>(KEYS.oneThingRegens, {})[date] ?? 0;
}

export function incrementOneThingRegens(date = getTodayDate()) {
  const all = read<Record<string, number>>(KEYS.oneThingRegens, {});
  all[date] = (all[date] ?? 0) + 1;
  write(KEYS.oneThingRegens, all);
  return all[date];
}

export function getStarterAttempts(date = getTodayDate()) {
  return read<Record<string, number>>(KEYS.starterAttempts, {})[date] ?? 0;
}

export function incrementStarterAttempts(date = getTodayDate()) {
  const all = read<Record<string, number>>(KEYS.starterAttempts, {});
  all[date] = (all[date] ?? 0) + 1;
  write(KEYS.starterAttempts, all);
  return all[date];
}

export function saveEnergyScore(slot: EnergySlot, score: number, date = getTodayDate()) {
  const all = read<Record<string, Partial<Record<EnergySlot, number>>>>(KEYS.energyLogs, {});
  all[date] = { ...(all[date] ?? {}), [slot]: score };
  write(KEYS.energyLogs, all);
}

export function getEnergyScores(date = getTodayDate()) {
  return read<Record<string, Partial<Record<EnergySlot, number>>>>(KEYS.energyLogs, {})[date] ?? {};
}

export function saveMoodScore(score: number, date = getTodayDate()) {
  const all = read<Record<string, number>>(KEYS.moodLogs, {});
  all[date] = score;
  write(KEYS.moodLogs, all);
}

export function getMoodScore(date = getTodayDate()) {
  return read<Record<string, number>>(KEYS.moodLogs, {})[date] ?? null;
}

export function saveAccountability(entry: AccountabilityEntry, date = getTodayDate()) {
  const all = read<Record<string, AccountabilityEntry>>(KEYS.accountability, {});
  all[date] = entry;
  write(KEYS.accountability, all);
}

export function getAccountability(date = getTodayDate()): AccountabilityEntry {
  return (
    read<Record<string, AccountabilityEntry>>(KEYS.accountability, {})[date] ?? {
      gymDone: null,
      codingDone: null,
      lcDone: null,
    }
  );
}

export function saveCsQuestionRating(rating: "knew" | "partial" | "didnt", date = getTodayDate()) {
  const all = read<Record<string, string>>(KEYS.csQuestionRatings, {});
  all[date] = rating;
  write(KEYS.csQuestionRatings, all);
}

export function getCsQuestionRating(date = getTodayDate()) {
  return read<Record<string, string>>(KEYS.csQuestionRatings, {})[date] ?? null;
}
