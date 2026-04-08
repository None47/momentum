import { getCurrentPhase } from "./constants";
import { addDays, getTodayKey } from "./momentum";

const KEYS = {
  dailyQuestion: "momentum_cs_daily_question",
  questionHistory: "momentum_cs_question_history",
} as const;

export type CSQuestionTopic = "OS" | "Networks" | "Databases" | "OOP" | "System Design basics" | "Data Structures";
export type CSQuestionRating = "YES" | "PARTIALLY" | "NO";

export interface DailyCSQuestion {
  date: string;
  topic: CSQuestionTopic;
  question: string;
  answer?: string;
  answerGeneratedAt?: string;
}

export interface CSQuestionHistoryEntry extends DailyCSQuestion {
  rating?: CSQuestionRating;
  nextReviewDate?: string;
}

const FALLBACK_QUESTIONS: Record<number, { topic: CSQuestionTopic; question: string; answer: string }> = {
  0: {
    topic: "OS",
    question: "What is the difference between a process and a thread?",
    answer:
      "A process is an independent program with its own memory space. A thread is a lightweight unit inside a process that shares the same memory. Threads communicate faster but shared state makes bugs harder to reason about.\n\nWhy interviewers ask this: It checks whether your OS fundamentals are real or memorized.",
  },
  1: {
    topic: "Networks",
    question: "What is the difference between TCP and UDP?",
    answer:
      "TCP is connection-oriented and guarantees ordered delivery with retransmissions. UDP is connectionless and does not guarantee delivery or order, but it has lower overhead. UDP is used when speed matters more than reliability.\n\nWhy interviewers ask this: It tests whether you understand transport-layer tradeoffs.",
  },
  2: {
    topic: "Databases",
    question: "What is the difference between an index seek and an index scan?",
    answer:
      "An index seek jumps directly to matching index entries using the search key. An index scan walks a larger portion or all of the index because the query is less selective. Seeks are usually faster when the filter is selective and indexed well.\n\nWhy interviewers ask this: It checks if you understand how databases actually answer queries.",
  },
  3: {
    topic: "OOP",
    question: "What is polymorphism in object-oriented programming?",
    answer:
      "Polymorphism means the same interface can trigger different behavior depending on the actual object type. A parent reference can call an overridden method on a child object. It helps keep code extensible without hard-coding every type check.\n\nWhy interviewers ask this: It checks whether you understand core OOP design ideas beyond definitions.",
  },
  4: {
    topic: "System Design basics",
    question: "What is caching and what problem does it solve?",
    answer:
      "Caching stores frequently needed data in a faster layer so repeated reads avoid slower systems like databases or remote services. It reduces latency and backend load, but introduces invalidation and consistency tradeoffs. Good answers mention both speed and correctness.\n\nWhy interviewers ask this: It tests whether you can reason about common system design tradeoffs.",
  },
  5: {
    topic: "Data Structures",
    question: "When would you choose a hash map over an array?",
    answer:
      "Choose a hash map when keys are sparse, dynamic, or not naturally small integer indexes. It gives average O(1) lookups by key, while arrays are better when indexes are compact and ordered access matters. The tradeoff is extra memory and no ordering guarantees.\n\nWhy interviewers ask this: It checks practical data-structure selection, not just definitions.",
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

function fallbackForDate(date = getTodayKey()) {
  const dayIndex = Math.abs(new Date(`${date}T00:00:00`).getDate()) % Object.keys(FALLBACK_QUESTIONS).length;
  return FALLBACK_QUESTIONS[dayIndex];
}

export function getDailyCSQuestion(date = getTodayKey()) {
  const question = read<DailyCSQuestion | null>(KEYS.dailyQuestion, null);
  return question?.date === date ? question : null;
}

export function saveDailyCSQuestion(entry: DailyCSQuestion) {
  write(KEYS.dailyQuestion, entry);
  const history = getCSQuestionHistory().filter((item) => item.date !== entry.date);
  history.push(entry);
  write(KEYS.questionHistory, history);
  emitChange();
}

export function ensureFallbackDailyQuestion(date = getTodayKey()) {
  const existing = getDailyCSQuestion(date);
  if (existing) return existing;
  const fallback = fallbackForDate(date);
  const entry: DailyCSQuestion = { date, topic: fallback.topic, question: fallback.question };
  saveDailyCSQuestion(entry);
  return entry;
}

export function saveDailyCSAnswer(answer: string, date = getTodayKey()) {
  const current = ensureFallbackDailyQuestion(date);
  saveDailyCSQuestion({
    ...current,
    answer,
    answerGeneratedAt: new Date().toISOString(),
  });
}

export function getFallbackAnswer(date = getTodayKey()) {
  return fallbackForDate(date).answer;
}

export function getCSQuestionHistory() {
  return read<CSQuestionHistoryEntry[]>(KEYS.questionHistory, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function rateCSQuestion(rating: CSQuestionRating, date = getTodayKey()) {
  const current = ensureFallbackDailyQuestion(date);
  const history = getCSQuestionHistory().filter((item) => item.date !== date);
  const nextReviewDate = rating === "NO" ? addDays(date, 3) : rating === "PARTIALLY" ? addDays(date, 7) : addDays(date, 30);
  history.push({ ...current, rating, nextReviewDate });
  write(KEYS.questionHistory, history);
  emitChange();
}

export function getCSQuestionStats() {
  const history = getCSQuestionHistory();
  const rated = history.filter((entry) => entry.rating);
  const byTopic = new Map<CSQuestionTopic, { total: number; correct: number }>();
  for (const entry of rated) {
    const current = byTopic.get(entry.topic) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (entry.rating === "YES") current.correct += 1;
    if (entry.rating === "PARTIALLY") current.correct += 0.5;
    byTopic.set(entry.topic, current);
  }
  const topics = Array.from(byTopic.entries()).map(([topic, value]) => ({
    topic,
    pct: value.total === 0 ? 0 : Math.round((value.correct / value.total) * 100),
  }));
  const strongAreas = topics.filter((item) => item.pct >= 70).map((item) => item.topic);
  const weakAreas = topics.filter((item) => item.pct < 60).sort((a, b) => a.pct - b.pct);
  return {
    totalAnswered: rated.length,
    strongAreas,
    weakAreas,
  };
}

export function getCSQuestionPromptPayload() {
  const phase = getCurrentPhase();
  return {
    phase: phase.number,
    phaseLabel: phase.label,
  };
}
