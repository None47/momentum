import { DAY_ONE, TOTAL_DAYS } from "./constants";
import { getCurrentHabitStreak, getTodayKey } from "./momentum";
import { getLeetCodeCount } from "./store";

const KEYS = {
  settings: "momentum_settings_v1",
  legacyStreaks: "momentum_streaks",
} as const;

export type FontSize = "SMALL" | "MEDIUM" | "LARGE";

export interface ProfileSettings {
  name: string;
  displayName: string;
  goal: string;
  dayOne: string;
  college: string;
  githubUsername: string;
  linkedinUrl: string;
}

export interface NotificationToggles {
  thyronorm525: boolean;
  library320: boolean;
  habitDeadline800: boolean;
  leetcode900: boolean;
  mood930: boolean;
  streak1130: boolean;
  weeklyPlanMonday: boolean;
  weeklyCheckinSunday: boolean;
}

export interface AiSettings {
  apiKey: string;
  enabled: boolean;
}

export interface AppearanceSettings {
  theme: "DARK";
  fontSize: FontSize;
  reduceAnimations: boolean;
}

export interface MomentumSettings {
  profile: ProfileSettings;
  notifications: NotificationToggles;
  ai: AiSettings;
  appearance: AppearanceSettings;
}

const DEFAULT_SETTINGS: MomentumSettings = {
  profile: {
    name: "Goutham M S",
    displayName: "Sachi",
    goal: "₹60L by October 2027",
    dayOne: "2026-03-23",
    college: "Sir MVIT Bangalore",
    githubUsername: "",
    linkedinUrl: "",
  },
  notifications: {
    thyronorm525: true,
    library320: true,
    habitDeadline800: true,
    leetcode900: true,
    mood930: true,
    streak1130: true,
    weeklyPlanMonday: true,
    weeklyCheckinSunday: true,
  },
  ai: {
    apiKey: "",
    enabled: true,
  },
  appearance: {
    theme: "DARK",
    fontSize: "MEDIUM",
    reduceAnimations: false,
  },
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
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("momentum:data-changed"));
}

export function getSettings() {
  const settings = read<MomentumSettings>(KEYS.settings, DEFAULT_SETTINGS);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.settings)) {
    write(KEYS.settings, settings);
  }
  return settings;
}

export function saveSettings(next: MomentumSettings) {
  write(KEYS.settings, next);
  emitChange();
}

export function updateSettings(partial: Partial<MomentumSettings>) {
  const current = getSettings();
  saveSettings({
    ...current,
    ...partial,
    profile: { ...current.profile, ...partial.profile },
    notifications: { ...current.notifications, ...partial.notifications },
    ai: { ...current.ai, ...partial.ai },
    appearance: { ...current.appearance, ...partial.appearance },
  });
}

export function getStoredAnthropicKey() {
  return getSettings().ai.apiKey.trim();
}

export function isAiEnabledLocally() {
  return getSettings().ai.enabled;
}

export function isAiUsable() {
  if (typeof window === "undefined") return false;
  return navigator.onLine && isAiEnabledLocally() && getStoredAnthropicKey().length > 0;
}

export function getFontSizeClass(fontSize: FontSize) {
  if (fontSize === "SMALL") return "text-[15px]";
  if (fontSize === "LARGE") return "text-[17px]";
  return "text-[16px]";
}

export function applyAppearanceSettings() {
  if (typeof document === "undefined") return;
  const { appearance } = getSettings();
  document.documentElement.dataset.fontSize = appearance.fontSize.toLowerCase();
  document.documentElement.dataset.reduceAnimations = appearance.reduceAnimations ? "true" : "false";
}

export function buildExportPayload() {
  if (typeof window === "undefined") return {};
  const payload: Record<string, unknown> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("momentum")) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      payload[key] = JSON.parse(raw);
    } catch {
      payload[key] = raw;
    }
  }
  return payload;
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function buildWeeklyReportPdfBlob() {
  const today = new Date();
  const lines = [
    "MOMENTUM WEEKLY REPORT",
    `Date: ${today.toISOString().slice(0, 10)}`,
    `Day: ${Math.min(TOTAL_DAYS, Math.max(1, Math.floor((today.getTime() - DAY_ONE.getTime()) / 86400000) + 1))}/${TOTAL_DAYS}`,
    `LeetCode total: ${getLeetCodeCount()}`,
    `Gym streak: ${getCurrentHabitStreak("body-gym")}`,
    `Coding streak: ${getCurrentHabitStreak("grind-coding")}`,
    `LeetCode streak: ${getCurrentHabitStreak("grind-leetcode")}`,
    `Exported on: ${getTodayKey()}`,
  ];
  const stream = lines
    .map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n");
  const content = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj ${content} endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function resetStreaksOnly() {
  write(KEYS.legacyStreaks, {});
  emitChange();
}

export function clearAllMomentumData() {
  if (typeof window === "undefined") return;
  const keysToDelete: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("momentum")) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    window.localStorage.removeItem(key);
  }
  emitChange();
}
