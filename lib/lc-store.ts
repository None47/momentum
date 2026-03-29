// ============================================================
// MOMENTUM — LeetCode Problem Log + Weekly Check-in Store
// ============================================================

const KEYS = {
  lcProblems: "momentum_lc_problems",
  weeklyCheckins: "momentum_weekly_checkins",
} as const;

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key: string, v: unknown) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(v)); }

// ── LC Problems ───────────────────────────────────────────
export type LCDifficulty = "Easy" | "Medium" | "Hard";
export type LCCategory = "Array" | "String" | "DP" | "Graph" | "Tree" | "Stack" | "Heap" | "Binary Search" | "Linked List" | "Math" | "Backtracking" | "Other";
export type LCSolveMethod = "Alone" | "Hint" | "Solution";

export interface LCProblemEntry {
  id: string;
  name: string;
  number: number;
  difficulty: LCDifficulty;
  category: LCCategory;
  timeMinutes: number;
  solveMethod: LCSolveMethod;
  dateSolved: string;
  notes: string;
  company: string;
  needsRevisit: boolean;
}

export function getLCProblems(): LCProblemEntry[] { return read<LCProblemEntry[]>(KEYS.lcProblems, []); }
export function addLCProblem(p: LCProblemEntry) { const all = getLCProblems(); all.push(p); write(KEYS.lcProblems, all); }
export function deleteLCProblem(id: string) { write(KEYS.lcProblems, getLCProblems().filter((p) => p.id !== id)); }

export function getLCStats() {
  const problems = getLCProblems();
  const easy = problems.filter((p) => p.difficulty === "Easy").length;
  const medium = problems.filter((p) => p.difficulty === "Medium").length;
  const hard = problems.filter((p) => p.difficulty === "Hard").length;
  const times = problems.map((p) => p.timeMinutes).filter((t) => t > 0);
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const fastest = times.length > 0 ? Math.min(...times) : 0;
  const slowest = times.length > 0 ? Math.max(...times) : 0;
  const revisit = problems.filter((p) => p.needsRevisit).length;

  // Category avg times
  const catTimes: Record<string, number[]> = {};
  problems.forEach((p) => {
    if (!catTimes[p.category]) catTimes[p.category] = [];
    if (p.timeMinutes > 0) catTimes[p.category].push(p.timeMinutes);
  });
  const catAvg: { category: string; avg: number; count: number }[] = Object.entries(catTimes)
    .map(([cat, ts]) => ({ category: cat, avg: Math.round(ts.reduce((a, b) => a + b, 0) / ts.length), count: ts.length }))
    .sort((a, b) => b.avg - a.avg);

  // Company counts
  const companies: Record<string, number> = {};
  problems.forEach((p) => { if (p.company) { companies[p.company] = (companies[p.company] || 0) + 1; } });

  // Daily solve dates (last 28 days)
  const solveDates = new Set(problems.map((p) => p.dateSolved));

  return { total: problems.length, easy, medium, hard, avgTime, fastest, slowest, revisit, catAvg, companies, solveDates };
}

export function getLCDailyStreak(): number {
  const problems = getLCProblems();
  const dates = new Set(problems.map((p) => p.dateSolved));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ── Weekly Check-ins ──────────────────────────────────────
export interface WeeklyCheckin {
  weekNumber: number;
  date: string;
  lcSolvedThisWeek: number;
  totalLCSolved: number;
  codingHours: number;
  cgpa: number;
  backlogs: number;
  weight: number;
  discipline: number;
  medConsistency: number;
  sleep: number;
  mood: number;
  libraryUsage: number;
  breakdowns: string[];
  biggestWin: string;
  biggestRegret: string;
  aiOracle: string;
}

export function getWeeklyCheckins(): WeeklyCheckin[] { return read<WeeklyCheckin[]>(KEYS.weeklyCheckins, []); }
export function addWeeklyCheckin(c: WeeklyCheckin) { const all = getWeeklyCheckins(); all.push(c); write(KEYS.weeklyCheckins, all); }
export function getLatestCheckin(): WeeklyCheckin | null { const all = getWeeklyCheckins(); return all.length > 0 ? all[all.length - 1] : null; }

export function getBreakdownPatterns(): { label: string; count: number }[] {
  const all = getWeeklyCheckins();
  const counts: Record<string, number> = {};
  all.forEach((c) => c.breakdowns.forEach((b) => { counts[b] = (counts[b] || 0) + 1; }));
  return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
