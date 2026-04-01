import { addDays, formatDateKey, getTodayKey, parseDateKey } from "./momentum";

const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

const KEYS = {
  problemReviews: "momentum_research_problem_reviews",
  cardReviews: "momentum_research_card_reviews",
  timerSessions: "momentum_research_timer_sessions",
  activeTimer: "momentum_research_active_timer",
  weeklyPlans: "momentum_research_weekly_plans",
  winLog: "momentum_research_win_log",
  milestones: "momentum_research_milestones",
} as const;

export type ReviewOutcome = "remembered" | "hint" | "forgot";
export type TimerCategory = "CODING" | "LEETCODE" | "LEARNING";
export type TimerFocus = "full" | "partial" | "none";

export interface ProblemReviewHistoryEntry {
  date: string;
  outcome: ReviewOutcome;
}

export interface ProblemReviewEntry {
  id: string;
  problemNumber: number;
  title: string;
  category: string;
  difficulty: string;
  promptMinutes: number;
  solvedAt: string;
  nextReviewDate: string;
  intervalIndex: number;
  mastered: boolean;
  reviewHistory: ProblemReviewHistoryEntry[];
}

export interface PatternCardDefinition {
  id: string;
  title: string;
  front: string;
  back: string;
  examples: string[];
}

export interface CardReviewHistoryEntry {
  date: string;
  outcome: ReviewOutcome;
}

export interface PatternCardProgress {
  id: string;
  nextReviewDate: string;
  intervalIndex: number;
  mastered: boolean;
  reviewHistory: CardReviewHistoryEntry[];
}

export interface TimerSessionEntry {
  id: string;
  date: string;
  category: TimerCategory;
  startedAt: number;
  endedAt: number;
  rawMs: number;
  countedMs: number;
  focus: TimerFocus;
}

export interface ActiveTimerEntry {
  category: TimerCategory;
  startedAt: number;
}

export interface WeeklyPlanEntry {
  weekStart: string;
  createdAt: string;
  review: {
    lcDelta: number;
    libraryAdherence: "YES" | "MOST_DAYS" | "NO";
    note: string;
  };
  targets: {
    lcProblems: number;
    codingSessions: number;
    focusSkill: string;
  };
  blockers: string[];
  otherBlocker: string;
  generatedPlan: string[];
}

export interface WinLogEntry {
  id: string;
  date: string;
  label: string;
  type: "leetcode" | "coding" | "gym" | "concept" | "milestone";
  permanent: boolean;
  uniqueKey?: string;
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

function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
}

function getReviewStepDate(fromDate: string, step: number) {
  return addDays(fromDate, REVIEW_INTERVALS[Math.min(step, REVIEW_INTERVALS.length - 1)]);
}

function getWeekStart(date = new Date()) {
  const cursor = new Date(date);
  const day = cursor.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  cursor.setDate(cursor.getDate() + diff);
  return formatDateKey(cursor);
}

export function getNextWeekStart(date = new Date()) {
  return addDays(getWeekStart(date), 7);
}

function getWeekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatDurationParts(totalMs: number) {
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

export function formatDurationLabel(totalMs: number) {
  const { hours, minutes } = formatDurationParts(totalMs);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}hr`;
  return `${hours}hr ${minutes}min`;
}

export const PATTERN_FLASHCARDS: PatternCardDefinition[] = [
  {
    id: "two-pointers",
    title: "Two Pointers",
    front: "When do you use Two Pointers?",
    back:
      "Use when the array is sorted, you need pairs, or you are removing duplicates in-place.\n\nTemplate:\nleft = 0\nright = len(arr) - 1\nwhile left < right:\n    if condition_met:\n        update answer\n    if need_smaller_value:\n        left += 1\n    else:\n        right -= 1",
    examples: ["Two Sum II", "3Sum", "Container With Most Water"],
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    front: "When do you use Sliding Window?",
    back:
      "Use for contiguous subarray or substring problems, especially longest or shortest window prompts.\n\nTemplate:\nleft = 0\nbest = 0\nfor right in range(len(arr)):\n    expand window\n    while window_invalid:\n        shrink window\n        left += 1\n    best = max(best, right - left + 1)",
    examples: ["Longest Substring Without Repeating Characters", "Minimum Window Substring", "Maximum Sum Subarray"],
  },
  {
    id: "binary-search",
    title: "Binary Search",
    front: "When do you use Binary Search?",
    back:
      "Use when the search space is sorted or the answer is monotonic.\n\nTemplate:\nleft, right = 0, len(arr) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if arr[mid] == target:\n        return mid\n    if arr[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1",
    examples: ["Binary Search", "Search Insert Position", "Koko Eating Bananas"],
  },
  {
    id: "bfs",
    title: "BFS",
    front: "When do you use BFS level order traversal?",
    back:
      "Use when the shortest path in an unweighted graph matters or you need level-by-level traversal.\n\nTemplate:\nqueue = deque([start])\nvisited = {start}\nwhile queue:\n    for _ in range(len(queue)):\n        node = queue.popleft()\n        process node\n        for nei in neighbors(node):\n            if nei not in visited:\n                visited.add(nei)\n                queue.append(nei)",
    examples: ["Binary Tree Level Order Traversal", "Rotting Oranges", "Word Ladder"],
  },
  {
    id: "dfs",
    title: "DFS",
    front: "When do you use DFS on trees or graphs?",
    back:
      "Use when you need full traversal, path decisions, subtree info, or connected components.\n\nTemplate:\ndef dfs(node):\n    if base_case:\n        return\n    mark visited\n    for nei in neighbors(node):\n        dfs(nei)",
    examples: ["Maximum Depth of Binary Tree", "Number of Islands", "Clone Graph"],
  },
  {
    id: "dp-1d",
    title: "Dynamic Programming 1D",
    front: "When do you use 1D DP?",
    back:
      "Use when state depends on previous positions and one dimension is enough.\n\nTemplate:\ndp = [0] * (n + 1)\ndp[0] = base\nfor i in range(1, n + 1):\n    dp[i] = transition from earlier states\nreturn dp[n]",
    examples: ["Climbing Stairs", "House Robber", "Coin Change"],
  },
  {
    id: "dp-2d",
    title: "Dynamic Programming 2D",
    front: "When do you use 2D DP?",
    back:
      "Use when the state needs two coordinates or two prefixes.\n\nTemplate:\ndp = [[0] * (cols + 1) for _ in range(rows + 1)]\nfor r in range(rows):\n    for c in range(cols):\n        dp[r][c] = combine adjacent states",
    examples: ["Longest Common Subsequence", "Edit Distance", "Unique Paths"],
  },
  {
    id: "monotonic-stack",
    title: "Stack",
    front: "When do you use a monotonic stack?",
    back:
      "Use when you need next greater, previous smaller, or ordered candidate cleanup.\n\nTemplate:\nstack = []\nfor i, value in enumerate(arr):\n    while stack and should_pop(arr[stack[-1]], value):\n        idx = stack.pop()\n        update answer for idx\n    stack.append(i)",
    examples: ["Daily Temperatures", "Largest Rectangle in Histogram", "Next Greater Element"],
  },
  {
    id: "heap-top-k",
    title: "Heap",
    front: "When do you use the Top K heap pattern?",
    back:
      "Use when only the best K elements matter and you need streaming updates.\n\nTemplate:\nheap = []\nfor item in items:\n    heappush(heap, score)\n    if len(heap) > k:\n        heappop(heap)",
    examples: ["Kth Largest Element in a Stream", "Top K Frequent Elements", "Merge K Sorted Lists"],
  },
  {
    id: "union-find",
    title: "Union Find",
    front: "When do you use Union Find?",
    back:
      "Use for dynamic connectivity, grouping, and cycle detection.\n\nTemplate:\nparent = list(range(n))\nrank = [1] * n\ndef find(x):\n    if parent[x] != x:\n        parent[x] = find(parent[x])\n    return parent[x]\ndef union(a, b):\n    ra, rb = find(a), find(b)\n    if ra == rb:\n        return False\n    if rank[ra] < rank[rb]:\n        ra, rb = rb, ra\n    parent[rb] = ra\n    rank[ra] += rank[rb]\n    return True",
    examples: ["Redundant Connection", "Number of Connected Components", "Accounts Merge"],
  },
  {
    id: "backtracking",
    title: "Backtracking",
    front: "When do you use Backtracking?",
    back:
      "Use when you must try all valid combinations, subsets, or paths with pruning.\n\nTemplate:\ndef backtrack(path, choices):\n    if goal_reached:\n        save(path)\n        return\n    for choice in choices:\n        if invalid(choice):\n            continue\n        path.append(choice)\n        backtrack(path, next_choices)\n        path.pop()",
    examples: ["Subsets", "Combination Sum", "N-Queens"],
  },
  {
    id: "trie",
    title: "Trie",
    front: "When do you use Trie operations?",
    back:
      "Use for prefix lookups, dictionary matching, and autocomplete.\n\nTemplate:\nclass TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.end = False\n\ndef insert(word):\n    node = root\n    for ch in word:\n        node = node.children.setdefault(ch, TrieNode())\n    node.end = True",
    examples: ["Implement Trie", "Word Search II", "Design Add and Search Words"],
  },
];

export function getProblemReviews() {
  return read<ProblemReviewEntry[]>(KEYS.problemReviews, []).sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
}

export function getDueProblemReviews(date = getTodayKey()) {
  return getProblemReviews().filter((entry) => !entry.mastered && compareDateKeys(entry.nextReviewDate, date) <= 0);
}

export function syncSolvedProblemReview(problem: {
  problemNumber: number;
  title: string;
  category: string;
  difficulty: string;
  promptMinutes?: number;
  solvedAt?: string;
}, solved: boolean) {
  const all = getProblemReviews();
  const id = `lc_${problem.problemNumber}`;
  const existingIndex = all.findIndex((entry) => entry.id === id);

  if (!solved) {
    if (existingIndex >= 0) {
      all.splice(existingIndex, 1);
      write(KEYS.problemReviews, all);
      emitChange();
    }
    return;
  }

  const solvedAt = problem.solvedAt ?? getTodayKey();
  const nextEntry: ProblemReviewEntry = existingIndex >= 0
    ? {
        ...all[existingIndex],
        title: problem.title,
        category: problem.category,
        difficulty: problem.difficulty,
      }
    : {
        id,
        problemNumber: problem.problemNumber,
        title: problem.title,
        category: problem.category,
        difficulty: problem.difficulty,
        promptMinutes: problem.promptMinutes ?? 15,
        solvedAt,
        nextReviewDate: addDays(solvedAt, REVIEW_INTERVALS[0]),
        intervalIndex: 0,
        mastered: false,
        reviewHistory: [],
      };

  if (existingIndex >= 0) {
    all[existingIndex] = nextEntry;
  } else {
    all.push(nextEntry);
    appendWin({
      date: solvedAt,
      label: `${formatHumanDate(solvedAt)} — Solved ${problem.title} (#${problem.problemNumber})`,
      type: "leetcode",
      uniqueKey: `leetcode:${problem.problemNumber}`,
    });
    maybeAddMilestone({
      id: `milestone_first_lc_${id}`,
      date: solvedAt,
      label: `FIRST LEETCODE PROBLEM SOLVED\n${formatHumanDate(solvedAt)}\n${problem.title} (#${problem.problemNumber}) — ${problem.difficulty}`,
      trigger: getProblemReviews().length === 0,
    });
  }

  write(KEYS.problemReviews, all);
  emitChange();
}

export function reviewProblem(problemId: string, outcome: ReviewOutcome, reviewDate = getTodayKey()) {
  const all = getProblemReviews();
  const index = all.findIndex((entry) => entry.id === problemId);
  if (index < 0) return null;

  const current = all[index];
  let nextIntervalIndex = current.intervalIndex;

  if (outcome === "remembered") {
    nextIntervalIndex = Math.min(current.intervalIndex + 1, REVIEW_INTERVALS.length - 1);
  } else if (outcome === "hint") {
    nextIntervalIndex = 1;
  } else {
    nextIntervalIndex = 0;
  }

  const mastered = outcome === "remembered" && current.intervalIndex >= REVIEW_INTERVALS.length - 1;
  all[index] = {
    ...current,
    intervalIndex: nextIntervalIndex,
    mastered,
    nextReviewDate: mastered ? reviewDate : getReviewStepDate(reviewDate, nextIntervalIndex),
    reviewHistory: [...current.reviewHistory, { date: reviewDate, outcome }],
  };

  write(KEYS.problemReviews, all);
  emitChange();
  return all[index];
}

function getCardProgressMap() {
  const stored = read<Record<string, PatternCardProgress>>(KEYS.cardReviews, {});
  const next: Record<string, PatternCardProgress> = { ...stored };
  let changed = false;

  for (const card of PATTERN_FLASHCARDS) {
    if (!next[card.id]) {
      changed = true;
      next[card.id] = {
        id: card.id,
        nextReviewDate: getTodayKey(),
        intervalIndex: 0,
        mastered: false,
        reviewHistory: [],
      };
    }
  }

  if (changed) {
    write(KEYS.cardReviews, next);
  }

  return next;
}

export function getPatternCards() {
  const progress = getCardProgressMap();
  return PATTERN_FLASHCARDS.map((card) => ({
    ...card,
    progress: progress[card.id],
  }));
}

export function getDuePatternCards(date = getTodayKey()) {
  return getPatternCards().filter((card) => !card.progress.mastered && compareDateKeys(card.progress.nextReviewDate, date) <= 0);
}

export function reviewPatternCard(cardId: string, outcome: ReviewOutcome, reviewDate = getTodayKey()) {
  const progress = getCardProgressMap();
  const current = progress[cardId];
  if (!current) return null;

  let nextIntervalIndex = current.intervalIndex;
  if (outcome === "remembered") {
    nextIntervalIndex = Math.min(current.intervalIndex + 1, REVIEW_INTERVALS.length - 1);
  } else if (outcome === "hint") {
    nextIntervalIndex = 1;
  } else {
    nextIntervalIndex = 0;
  }

  const mastered = outcome === "remembered" && current.intervalIndex >= REVIEW_INTERVALS.length - 1;
  progress[cardId] = {
    ...current,
    intervalIndex: nextIntervalIndex,
    mastered,
    nextReviewDate: mastered ? reviewDate : getReviewStepDate(reviewDate, nextIntervalIndex),
    reviewHistory: [...current.reviewHistory, { date: reviewDate, outcome }],
  };

  write(KEYS.cardReviews, progress);

  const card = PATTERN_FLASHCARDS.find((item) => item.id === cardId);
  if (mastered && card) {
    appendWin({
      date: reviewDate,
      label: `${formatHumanDate(reviewDate)} — Mastered ${card.title} pattern`,
      type: "concept",
      uniqueKey: `card-mastered:${card.id}`,
    });
  }

  emitChange();
  return progress[cardId];
}

export function getReviewStats(date = getTodayKey()) {
  const problems = getProblemReviews();
  const dueProblems = getDueProblemReviews(date);
  const totalReviews = problems.reduce((sum, item) => sum + item.reviewHistory.length, 0);
  const remembered = problems.reduce(
    (sum, item) => sum + item.reviewHistory.filter((entry) => entry.outcome === "remembered").length,
    0,
  );
  const mastered = problems.filter((item) => item.mastered).length;
  const projectedForgotten = problems.filter((item) => !item.mastered && item.reviewHistory.length === 0).length;

  return {
    totalSolved: problems.length,
    totalMastered: mastered,
    dueToday: dueProblems.length,
    retentionRate: totalReviews === 0 ? 0 : Math.round((remembered / totalReviews) * 100),
    projectedForgotten,
  };
}

export function getPatternCardStats(date = getTodayKey()) {
  const cards = getPatternCards();
  const due = getDuePatternCards(date);
  const weakest = cards
    .map((card) => ({
      title: card.title,
      forgot: card.progress.reviewHistory.filter((entry) => entry.outcome !== "remembered").length,
    }))
    .sort((a, b) => b.forgot - a.forgot)[0];

  return {
    mastered: cards.filter((card) => card.progress.mastered).length,
    total: cards.length,
    dueToday: due.length,
    weakestPattern: weakest?.forgot ? weakest.title : "None",
  };
}

export function getTimerSessions() {
  return read<TimerSessionEntry[]>(KEYS.timerSessions, []).sort((a, b) => b.startedAt - a.startedAt);
}

export function getActiveTimer() {
  return read<ActiveTimerEntry | null>(KEYS.activeTimer, null);
}

export function startTimer(category: TimerCategory) {
  const active: ActiveTimerEntry = {
    category,
    startedAt: Date.now(),
  };
  write(KEYS.activeTimer, active);
  emitChange();
  return active;
}

export function stopTimer(focus: TimerFocus) {
  const active = getActiveTimer();
  if (!active) return null;

  const endedAt = Date.now();
  const rawMs = Math.max(0, endedAt - active.startedAt);
  const multiplier = focus === "full" ? 1 : focus === "partial" ? 0.5 : 0;
  const countedMs = Math.round(rawMs * multiplier);
  const entry: TimerSessionEntry = {
    id: crypto.randomUUID(),
    date: getTodayKey(),
    category: active.category,
    startedAt: active.startedAt,
    endedAt,
    rawMs,
    countedMs,
    focus,
  };

  const all = getTimerSessions();
  all.push(entry);
  write(KEYS.timerSessions, all);
  write(KEYS.activeTimer, null);

  if (countedMs > 0 && active.category === "CODING") {
    appendWin({
      date: entry.date,
      label: `${formatHumanDate(entry.date)} — ${formatDurationLabel(countedMs)} real coding time`,
      type: "coding",
      uniqueKey: `coding:${entry.id}`,
    });
    maybeAddMilestone({
      id: `milestone_first_coding_${entry.id}`,
      date: entry.date,
      label: `FIRST CODING SESSION LOGGED\n${formatHumanDate(entry.date)}\n${formatDurationLabel(countedMs)} real coding time`,
      trigger: getTimerSessions().filter((session) => session.category === "CODING" && session.countedMs > 0).length === 0,
    });
  }

  emitChange();
  return entry;
}

export function clearActiveTimer() {
  write(KEYS.activeTimer, null);
  emitChange();
}

export function getDailyTimerSummary(date = getTodayKey()) {
  const sessions = getTimerSessions().filter((session) => session.date === date);
  const categories: Record<TimerCategory, number> = {
    CODING: 0,
    LEETCODE: 0,
    LEARNING: 0,
  };
  sessions.forEach((session) => {
    categories[session.category] += session.countedMs;
  });
  return categories;
}

export function getWeeklyTimerSummary(referenceDate = new Date()) {
  const weekStart = getWeekStart(referenceDate);
  const dates = new Set(getWeekDates(weekStart));
  const sessions = getTimerSessions().filter((session) => dates.has(session.date));
  const categories: Record<TimerCategory, number> = {
    CODING: 0,
    LEETCODE: 0,
    LEARNING: 0,
  };
  sessions.forEach((session) => {
    categories[session.category] += session.countedMs;
  });
  return categories;
}

export function getTwoWeekTimerInsight(referenceDate = new Date()) {
  const end = formatDateKey(referenceDate);
  const start = addDays(end, -13);
  const sessions = getTimerSessions().filter((session) => session.date >= start && session.date <= end);
  const total = sessions.reduce((sum, session) => sum + session.countedMs, 0);
  const learningMs = sessions.filter((session) => session.category === "LEARNING").reduce((sum, session) => sum + session.countedMs, 0);
  const codingMs = sessions.filter((session) => session.category === "CODING").reduce((sum, session) => sum + session.countedMs, 0);

  if (total === 0) return null;

  return {
    learningPct: Math.round((learningMs / total) * 100),
    codingPct: Math.round((codingMs / total) * 100),
  };
}

export function getWeeklyPlans() {
  return read<Record<string, WeeklyPlanEntry>>(KEYS.weeklyPlans, {});
}

export function getCurrentWeekPlan() {
  const all = getWeeklyPlans();
  return all[getWeekStart()] ?? null;
}

export function getUpcomingWeekPlan() {
  const all = getWeeklyPlans();
  return all[getNextWeekStart()] ?? null;
}

export function saveWeeklyPlan(plan: WeeklyPlanEntry) {
  const all = getWeeklyPlans();
  all[plan.weekStart] = plan;
  write(KEYS.weeklyPlans, all);
  emitChange();
}

export function shouldPromptWeeklyPlan(now = new Date()) {
  const isSunday = now.getDay() === 0;
  const atOrAfterNine = now.getHours() >= 21;
  if (!isSunday || !atOrAfterNine) return false;
  return getUpcomingWeekPlan() === null;
}

export function getWeeklyPlanActuals(weekStart: string) {
  const dates = new Set(getWeekDates(weekStart));
  const lcSolved = getProblemReviews().filter((item) => dates.has(item.solvedAt)).length;
  const codingDays = new Set(
    getTimerSessions()
      .filter((session) => dates.has(session.date) && session.category === "CODING" && session.countedMs > 0)
      .map((session) => session.date),
  ).size;
  const reviewsDone = getProblemReviews().reduce((sum, item) => {
    return sum + item.reviewHistory.filter((entry) => dates.has(entry.date)).length;
  }, 0);
  const reviewsRemembered = getProblemReviews().reduce((sum, item) => {
    return sum + item.reviewHistory.filter((entry) => dates.has(entry.date) && entry.outcome === "remembered").length;
  }, 0);
  const reviewRate = reviewsDone === 0 ? 0 : Math.round((reviewsRemembered / reviewsDone) * 100);

  return {
    lcSolved,
    codingDays,
    reviewRate,
  };
}

export function getWeeklyConfidence(referenceDate = new Date()) {
  const currentWeek = getWeekStart(referenceDate);
  const lastWeek = addDays(currentWeek, -7);
  const current = getWeeklyPlanActuals(currentWeek);
  const previous = getWeeklyPlanActuals(lastWeek);

  function scoreForWeek(week: ReturnType<typeof getWeeklyPlanActuals>) {
    const problemScore = Math.min(40, week.lcSolved * 6);
    const sessionScore = Math.min(35, week.codingDays * 7);
    const reviewScore = Math.min(25, Math.round(week.reviewRate / 4));
    return Math.min(100, problemScore + sessionScore + reviewScore);
  }

  const currentScore = scoreForWeek(current);
  const previousScore = scoreForWeek(previous);
  return {
    current: currentScore,
    previous: previousScore,
    delta: currentScore - previousScore,
  };
}

export function getWinLog() {
  return read<WinLogEntry[]>(KEYS.winLog, []).sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

function appendWin(entry: Omit<WinLogEntry, "id" | "permanent"> & { permanent?: boolean }) {
  const all = getWinLog();
  if (entry.uniqueKey && all.some((item) => item.uniqueKey === entry.uniqueKey)) {
    return;
  }
  all.push({
    id: crypto.randomUUID(),
    permanent: entry.permanent ?? false,
    ...entry,
  });
  write(KEYS.winLog, all);
}

function getMilestones() {
  return read<WinLogEntry[]>(KEYS.milestones, []);
}

function maybeAddMilestone(input: { id: string; date: string; label: string; trigger: boolean }) {
  if (!input.trigger) return;
  const milestones = getMilestones();
  if (milestones.some((entry) => entry.uniqueKey === input.id)) return;

  const entry: WinLogEntry = {
    id: crypto.randomUUID(),
    date: input.date,
    label: input.label,
    type: "milestone",
    permanent: true,
    uniqueKey: input.id,
  };

  milestones.push(entry);
  write(KEYS.milestones, milestones);
  appendWin({
    date: input.date,
    label: input.label,
    type: "milestone",
    permanent: true,
    uniqueKey: input.id,
  });
}

export function getMilestoneLog() {
  return getMilestones().sort((a, b) => b.date.localeCompare(a.date));
}

export function logGymWin(date = getTodayKey(), label = "Completed gym session") {
  appendWin({
    date,
    label: `${formatHumanDate(date)} — ${label}`,
    type: "gym",
    uniqueKey: `gym:${date}:${label}`,
  });
  maybeAddMilestone({
    id: `milestone_first_gym_${date}`,
    date,
    label: `FIRST GYM SESSION LOGGED\n${formatHumanDate(date)}\n${label}`,
    trigger: getWinLog().filter((entry) => entry.type === "gym").length === 0,
  });
  emitChange();
}

export function logConceptWin(label: string, date = getTodayKey(), uniqueKey?: string) {
  appendWin({
    date,
    label: `${formatHumanDate(date)} — ${label}`,
    type: "concept",
    uniqueKey,
  });
  emitChange();
}

export function formatHumanDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
