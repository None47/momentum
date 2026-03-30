import { getTodayDate } from "./constants";

const KEYS = {
  focusTasks: "momentum_today_focus_tasks",
  libraryCheckins: "momentum_today_library_checkins",
} as const;

export interface FocusTaskEntry {
  date: string;
  task: string;
}

export interface LibraryCheckInEntry {
  date: string;
  present: boolean;
  reason: string | null;
  loggedAt: string;
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

export function getFocusTask(date = getTodayDate()): string | null {
  const all = read<Record<string, FocusTaskEntry>>(KEYS.focusTasks, {});
  return all[date]?.task ?? null;
}

export function saveFocusTask(task: string, date = getTodayDate()) {
  const all = read<Record<string, FocusTaskEntry>>(KEYS.focusTasks, {});
  all[date] = { date, task };
  write(KEYS.focusTasks, all);
}

export function getLibraryCheckIn(date = getTodayDate()): LibraryCheckInEntry | null {
  const all = read<Record<string, LibraryCheckInEntry>>(KEYS.libraryCheckins, {});
  return all[date] ?? null;
}

export function saveLibraryCheckIn(entry: Omit<LibraryCheckInEntry, "loggedAt">) {
  const all = read<Record<string, LibraryCheckInEntry>>(KEYS.libraryCheckins, {});
  all[entry.date] = {
    ...entry,
    loggedAt: new Date().toISOString(),
  };
  write(KEYS.libraryCheckins, all);
}

export function getLibraryCheckIns(): LibraryCheckInEntry[] {
  return Object.values(
    read<Record<string, LibraryCheckInEntry>>(KEYS.libraryCheckins, {}),
  ).sort((a, b) => a.date.localeCompare(b.date));
}

export function getLibraryInsight(days = 30) {
  const entries = getLibraryCheckIns();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffIso = cutoff.toISOString().split("T")[0];
  const recent = entries.filter((entry) => entry.date >= cutoffIso && !entry.present);
  const reasonCounts = recent.reduce<Record<string, number>>((acc, entry) => {
    const reason = entry.reason ?? "Other reason";
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  const topReason =
    Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    skipped: recent.length,
    reasonCounts,
    topReason,
  };
}
