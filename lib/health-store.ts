// ============================================================
// MOMENTUM — Health Dashboard Store (localStorage)
// Weight, meds, gym, calories, body metrics
// ============================================================

const KEYS = {
  bodyMetrics: "momentum_health_metrics",       // BodyMetricEntry[]
  medCompletions: "momentum_health_meds",       // Record<date, string[]> (medId[])
  gymSessions: "momentum_health_gym",           // GymSession[]
  calorieLog: "momentum_health_calories",       // Record<date, MealEntry[]>
  integrityLog: "momentum_integrity",           // Record<date, { answer: boolean, reasons?: string[] }>
} as const;

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key: string, v: unknown) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(v)); }

// ── Body Metrics ──────────────────────────────────────────
export interface BodyMetricEntry {
  date: string;
  weight: number;
  tsh?: number;
  testosterone?: number;
  energy: number;
  mood: number;
}
export function getBodyMetrics(): BodyMetricEntry[] { return read<BodyMetricEntry[]>(KEYS.bodyMetrics, []); }
export function addBodyMetric(entry: BodyMetricEntry) { const all = getBodyMetrics(); all.push(entry); all.sort((a, b) => a.date.localeCompare(b.date)); write(KEYS.bodyMetrics, all); }

// ── Medication Completions ────────────────────────────────
export function getMedCompletions(date: string): string[] { const all = read<Record<string, string[]>>(KEYS.medCompletions, {}); return all[date] || []; }
export function toggleMed(date: string, medId: string) {
  const all = read<Record<string, string[]>>(KEYS.medCompletions, {});
  if (!all[date]) all[date] = [];
  if (all[date].includes(medId)) all[date] = all[date].filter((m) => m !== medId);
  else all[date].push(medId);
  write(KEYS.medCompletions, all);
  return all[date];
}
export function getMedStreak(medId: string): number {
  const all = read<Record<string, string[]>>(KEYS.medCompletions, {});
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (all[ds]?.includes(medId)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
export function getAllMedData(): Record<string, string[]> { return read<Record<string, string[]>>(KEYS.medCompletions, {}); }
export function getMedConsecutiveMissed(medId: string): number {
  const all = read<Record<string, string[]>>(KEYS.medCompletions, {});
  let missed = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (!all[ds]?.includes(medId)) missed++;
    else break;
  }
  return missed;
}

// ── Gym Sessions ──────────────────────────────────────────
export interface GymSession {
  date: string;
  duration: number;
  type: "Push" | "Pull" | "Legs" | "Cardio" | "Full Body";
  energyBefore: number;
  energyAfter: number;
}
export function getGymSessions(): GymSession[] { return read<GymSession[]>(KEYS.gymSessions, []); }
export function addGymSession(s: GymSession) { const all = getGymSessions(); all.push(s); all.sort((a, b) => b.date.localeCompare(a.date)); write(KEYS.gymSessions, all); }
export function getGymThisWeek(): number {
  const all = getGymSessions();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const ws = weekStart.toISOString().split("T")[0];
  return all.filter((s) => s.date >= ws).length;
}

// ── Calories ──────────────────────────────────────────────
export interface MealEntry { label: string; calories: number; meal: "morning" | "afternoon" | "evening"; }
export function getCalorieLog(date: string): MealEntry[] { const all = read<Record<string, MealEntry[]>>(KEYS.calorieLog, {}); return all[date] || []; }
export function addMealEntry(date: string, entry: MealEntry) {
  const all = read<Record<string, MealEntry[]>>(KEYS.calorieLog, {});
  if (!all[date]) all[date] = [];
  all[date].push(entry);
  write(KEYS.calorieLog, all);
}
export function getTodayCalories(date: string): number { return getCalorieLog(date).reduce((sum, m) => sum + m.calories, 0); }

// ── Integrity (Daily Reflection) ──────────────────────────
export interface IntegrityEntry { answer: boolean; reasons?: string[]; }
export function getIntegrity(date: string): IntegrityEntry | null { const all = read<Record<string, IntegrityEntry>>(KEYS.integrityLog, {}); return all[date] || null; }
export function setIntegrity(date: string, entry: IntegrityEntry) { const all = read<Record<string, IntegrityEntry>>(KEYS.integrityLog, {}); all[date] = entry; write(KEYS.integrityLog, all); }
export function getIntegrityStreak(): number {
  const all = read<Record<string, IntegrityEntry>>(KEYS.integrityLog, {});
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (all[ds]?.answer) streak++;
    else if (i > 0) break;
  }
  return streak;
}
export function getIntegrity30d(): { yes: number; total: number } {
  const all = read<Record<string, IntegrityEntry>>(KEYS.integrityLog, {});
  let yes = 0, total = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (all[ds]) { total++; if (all[ds].answer) yes++; }
  }
  return { yes, total };
}
