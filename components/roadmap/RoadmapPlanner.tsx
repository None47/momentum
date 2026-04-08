"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getLeetCodeCount, setLeetCodeCount } from "@/lib/store";
import { getProfileMeta, getTodayKey } from "@/lib/momentum";
import {
  getBehaviouralQuestions,
  getCodingMockPrompt,
  getMockInterviewStats,
  getSystemDesignPrompt,
  isSystemDesignUnlocked,
  saveMockInterview,
  type InterviewType,
} from "@/lib/executive-store";
import {
  createOaSimulation,
  evaluateOaResult,
  getOaSimulations,
  saveOaSimulation,
  type OaCompany,
  type OaPhase,
} from "@/lib/final-store";
import { getStoredAnthropicKey, isAiEnabledLocally } from "@/lib/settings-store";
import {
  PATTERN_FLASHCARDS,
  formatHumanDate,
  getPatternCards,
  getDuePatternCards,
  getDueProblemReviews,
  getPatternCardStats,
  getReviewStats,
  reviewPatternCard,
  reviewProblem,
  syncSolvedProblemReview,
} from "@/lib/research-store";
import {
  getAllTopicStatuses,
  getLCDone,
  getLCCounter,
  getSubtopicsDone,
  getTopicNotes,
  incrementLC,
  decrementLC,
  markTopicComplete,
  setAllLCDone,
  setAllSubtopicsDone,
  setLCState,
  setSubtopicState,
  setTopicNotes,
  setTopicStatus,
  type LCCounter,
} from "@/lib/roadmap-store";
import {
  PHASE_META,
  ROADMAP_TOPICS,
  type LCProblem,
  type PhaseNumber,
  type Resource,
  type RoadmapTopic,
  type TopicStatus,
} from "@/lib/roadmap-data";

type FilterKey = "ALL" | "PHASE_1" | "PHASE_2" | "PHASE_3" | "PHASE_4" | "IN_PROGRESS" | "DONE";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PHASE_1", label: "Phase 1" },
  { key: "PHASE_2", label: "Phase 2" },
  { key: "PHASE_3", label: "Phase 3" },
  { key: "PHASE_4", label: "Phase 4" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];

const STATUS_META: Record<TopicStatus, { label: string; className: string }> = {
  NOT_STARTED: {
    label: "NOT STARTED",
    className: "border-white/10 bg-white/[0.03] text-white/48",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    className: "border-[#fbbf24]/25 bg-[#fbbf24]/10 text-[#fbbf24]",
  },
  DONE: {
    label: "DONE",
    className: "border-[#10b981]/25 bg-[#10b981]/10 text-[#10b981]",
  },
};

const PHASE_WINDOWS: Record<PhaseNumber, { start: string; end: string }> = {
  1: { start: "2026-03-23", end: "2026-06-30" },
  2: { start: "2026-07-01", end: "2026-12-31" },
  3: { start: "2027-01-01", end: "2027-05-31" },
  4: { start: "2027-06-01", end: "2027-10-31" },
};

const EMPTY_COUNTER: LCCounter = { easy: 0, medium: 0, hard: 0 };

const RESOURCE_FALLBACKS: Partial<Record<string, Resource[]>> = {
  "dsa-tries": [
    { title: "NeetCode Trie walkthrough", url: "https://www.youtube.com/@NeetCode", type: "youtube" },
    { title: "Trie data structure article", url: "https://www.geeksforgeeks.org/trie-insert-and-search/", type: "website" },
  ],
  "dsa-backtracking": [
    { title: "NeetCode Backtracking playlist", url: "https://www.youtube.com/@NeetCode", type: "youtube" },
    { title: "Backtracking patterns guide", url: "https://leetcode.com/discuss/study-guide/1405817/backtracking-algorithms", type: "website" },
  ],
  "proj-todo": [
    { title: "Real Python CLI apps", url: "https://realpython.com/comparing-python-command-line-parsing-libraries-argparse-docopt-click/", type: "website" },
    { title: "Python JSON docs", url: "https://docs.python.org/3/library/json.html", type: "website" },
  ],
  "proj-weather": [
    { title: "OpenWeather API docs", url: "https://openweathermap.org/api", type: "website" },
    { title: "Flask quickstart", url: "https://flask.palletsprojects.com/en/stable/quickstart/", type: "website" },
  ],
  "proj-scraper": [
    { title: "Beautiful Soup docs", url: "https://www.crummy.com/software/BeautifulSoup/bs4/doc/", type: "website" },
    { title: "pandas getting started", url: "https://pandas.pydata.org/docs/getting_started/index.html", type: "website" },
  ],
  "proj-taskmanager": [
    { title: "FastAPI SQL databases tutorial", url: "https://fastapi.tiangolo.com/tutorial/sql-databases/", type: "website" },
    { title: "React docs: managing state", url: "https://react.dev/learn/managing-state", type: "website" },
  ],
  "proj-salary": [
    { title: "Kaggle datasets", url: "https://www.kaggle.com/datasets", type: "website" },
    { title: "scikit-learn getting started", url: "https://scikit-learn.org/stable/getting_started.html", type: "website" },
  ],
  "proj-research-bot": [
    { title: "Anthropic tool use docs", url: "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview", type: "website" },
    { title: "arXiv API guide", url: "https://info.arxiv.org/help/api/index.html", type: "website" },
  ],
  "proj-codebase-qa": [
    { title: "pgvector docs", url: "https://github.com/pgvector/pgvector", type: "website" },
    { title: "GitHub REST docs", url: "https://docs.github.com/en/rest", type: "website" },
  ],
  "proj-saas": [
    { title: "Stripe quickstart", url: "https://stripe.com/docs/checkout/quickstart", type: "website" },
    { title: "Vercel deployment docs", url: "https://vercel.com/docs", type: "website" },
  ],
};

const LC_FALLBACKS_BY_CATEGORY: Partial<Record<string, LCProblem[]>> = {
  "Dev Tools": [
    { id: 71, title: "Simplify Path", difficulty: "Medium" },
    { id: 388, title: "Longest Absolute File Path", difficulty: "Medium" },
    { id: 192, title: "Word Frequency", difficulty: "Medium" },
  ],
  Projects: [
    { id: 535, title: "Encode and Decode TinyURL", difficulty: "Medium" },
    { id: 355, title: "Design Twitter", difficulty: "Medium" },
    { id: 146, title: "LRU Cache", difficulty: "Medium" },
  ],
  "CS Fundamentals": [
    { id: 1114, title: "Print in Order", difficulty: "Easy" },
    { id: 1188, title: "Design Bounded Blocking Queue", difficulty: "Medium" },
    { id: 146, title: "LRU Cache", difficulty: "Medium" },
  ],
  "Web Development": [
    { id: 1472, title: "Design Browser History", difficulty: "Medium" },
    { id: 981, title: "Time Based Key-Value Store", difficulty: "Medium" },
    { id: 348, title: "Design Tic-Tac-Toe", difficulty: "Medium" },
  ],
  Databases: [
    { id: 175, title: "Combine Two Tables", difficulty: "Easy" },
    { id: 176, title: "Second Highest Salary", difficulty: "Medium" },
    { id: 180, title: "Consecutive Numbers", difficulty: "Medium" },
  ],
  "ML Foundations": [
    { id: 215, title: "Kth Largest Element in an Array", difficulty: "Medium" },
    { id: 347, title: "Top K Frequent Elements", difficulty: "Medium" },
    { id: 973, title: "K Closest Points to Origin", difficulty: "Medium" },
  ],
  "System Design": [
    { id: 362, title: "Design Hit Counter", difficulty: "Medium" },
    { id: 460, title: "LFU Cache", difficulty: "Hard" },
    { id: 355, title: "Design Twitter", difficulty: "Medium" },
  ],
  "AI & LLMs": [
    { id: 208, title: "Implement Trie (Prefix Tree)", difficulty: "Medium" },
    { id: 642, title: "Design Search Autocomplete System", difficulty: "Hard" },
    { id: 297, title: "Serialize and Deserialize Binary Tree", difficulty: "Hard" },
  ],
  "Cloud & DevOps": [
    { id: 622, title: "Design Circular Queue", difficulty: "Medium" },
    { id: 1166, title: "Design File System", difficulty: "Medium" },
    { id: 71, title: "Simplify Path", difficulty: "Medium" },
  ],
  "Interview Prep": [
    { id: 49, title: "Group Anagrams", difficulty: "Medium" },
    { id: 200, title: "Number of Islands", difficulty: "Medium" },
    { id: 300, title: "Longest Increasing Subsequence", difficulty: "Medium" },
  ],
};

function parseDay(date: string) {
  return new Date(`${date}T00:00:00`);
}

function getCurrentRoadmapPhase(now: Date): PhaseNumber {
  const time = now.getTime();
  for (const phase of [1, 2, 3, 4] as const) {
    const window = PHASE_WINDOWS[phase];
    const start = parseDay(window.start).getTime();
    const end = parseDay(window.end).getTime();
    if (time >= start && time <= end) return phase;
  }
  return now < parseDay(PHASE_WINDOWS[1].start) ? 1 : 4;
}

function getDaysLeftInPhase(phase: PhaseNumber, now: Date) {
  const end = parseDay(PHASE_WINDOWS[phase].end).getTime();
  return Math.max(0, Math.ceil((end - now.getTime()) / 86400000));
}

function countDone(values: boolean[]) {
  return values.filter(Boolean).length;
}

function deriveStatus(subtopics: boolean[], leetcode: boolean[], notes: string): TopicStatus {
  const totalChecks = subtopics.length + leetcode.length;
  const doneChecks = countDone(subtopics) + countDone(leetcode);
  const hasNotes = notes.trim().length > 0;

  if (totalChecks > 0 && doneChecks === totalChecks) return "DONE";
  if (doneChecks > 0 || hasNotes) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function getTopicResources(topic: RoadmapTopic) {
  return topic.resources.length > 0 ? topic.resources : (RESOURCE_FALLBACKS[topic.id] ?? []);
}

function getTopicLeetCode(topic: RoadmapTopic) {
  return topic.leetcode.length > 0 ? topic.leetcode : (LC_FALLBACKS_BY_CATEGORY[topic.category] ?? []);
}

function getPhaseBorderColor(phase: PhaseNumber) {
  return PHASE_META[phase].color;
}

function formatHours(hours: number) {
  return `${hours} hrs`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getBarWidth(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${clampPercent((value / total) * 100)}%`;
}

function getReadinessStatus(lc: number, projects: number, cgpa: number) {
  const lcGap = Math.max(0, 300 - lc);
  const projectGap = Math.max(0, 5 - projects);
  const cgpaReady = cgpa >= 7.5;

  if (lcGap === 0 && projectGap === 0 && cgpaReady) {
    return "READY FOR REFERRALS";
  }

  const parts: string[] = [];
  if (lcGap > 0) parts.push(`${lcGap} LC`);
  if (projectGap > 0) parts.push(`${projectGap} projects`);
  if (!cgpaReady) parts.push(`CGPA ${cgpa.toFixed(1)}/7.5`);
  return `NOT READY — ${parts.join(" + ")} needed`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m4 10 4 4 8-8" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m5 7 5 6 5-6" />
    </svg>
  );
}

function CheckboxRow({
  checked,
  label,
  onToggle,
  tone = "default",
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  tone?: "default" | "lc";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-[20px] border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:border-white/14"
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked
            ? tone === "lc"
              ? "border-[#fbbf24] bg-[#fbbf24] text-black"
              : "border-[#10b981] bg-[#10b981] text-black"
            : "border-white/18 bg-transparent text-transparent"
        }`}
      >
        <CheckIcon />
      </span>
      <span className={`text-[13px] leading-6 ${checked ? "text-white" : "text-white/72"}`}>{label}</span>
    </button>
  );
}

function ReviewResponseButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "bright" | "soft" | "danger";
}) {
  const toneClass =
    tone === "bright"
      ? "border-white/14 bg-white text-black"
      : tone === "soft"
        ? "border-[#fbbf24]/25 bg-[#fbbf24]/10 text-[#fbbf24]"
        : "border-[#ef4444]/25 bg-[#2a1010] text-[#ffb4b4]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] ${toneClass}`}
    >
      {label}
    </button>
  );
}

export default function RoadmapPlanner() {
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, TopicStatus>>({});
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, boolean[]>>({});
  const [lcMap, setLcMap] = useState<Record<string, boolean[]>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [lcCounter, setLcCounterState] = useState<LCCounter>(EMPTY_COUNTER);
  const [reviewVersion, setReviewVersion] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [mockType, setMockType] = useState<InterviewType>("CODING");
  const [mockRunning, setMockRunning] = useState(false);
  const [mockStartedAt, setMockStartedAt] = useState<number | null>(null);
  const [mockPrompt, setMockPrompt] = useState(getCodingMockPrompt());
  const [mockAnswer, setMockAnswer] = useState("");
  const [mockFeedback, setMockFeedback] = useState("");
  const [mockLoading, setMockLoading] = useState(false);
  const [mockNow, setMockNow] = useState(Date.now());
  const [oaCompany, setOaCompany] = useState<OaCompany>("Amazon");
  const [oaPhase, setOaPhase] = useState<OaPhase>("PHASE_1");
  const [oaSession, setOaSession] = useState<ReturnType<typeof createOaSimulation> | null>(null);
  const [oaCurrentIndex, setOaCurrentIndex] = useState(0);
  const [oaHistoryVersion, setOaHistoryVersion] = useState(0);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    const nextStatus = getAllTopicStatuses();
    const nextSubtopics: Record<string, boolean[]> = {};
    const nextLc: Record<string, boolean[]> = {};
    const nextNotes: Record<string, string> = {};

    for (const topic of ROADMAP_TOPICS) {
      const problems = getTopicLeetCode(topic);
      nextSubtopics[topic.id] = getSubtopicsDone(topic.id, topic.subtopics.length);
      nextLc[topic.id] = getLCDone(topic.id, problems.length);
      nextNotes[topic.id] = getTopicNotes(topic.id);
    }

    const storedCounter = getLCCounter();
    const storedTotal = storedCounter.easy + storedCounter.medium + storedCounter.hard;
    const globalLc = getLeetCodeCount();
    const syncedCounter =
      storedTotal === 0 && globalLc > 0 ? { easy: globalLc, medium: 0, hard: 0 } : storedCounter;

    setStatusMap(nextStatus);
    setSubtopicsMap(nextSubtopics);
    setLcMap(nextLc);
    setNotesMap(nextNotes);
    setLcCounterState(syncedCounter);
    setHydrated(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setMockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const topicProgress = useMemo(() => {
    return Object.fromEntries(
      ROADMAP_TOPICS.map((topic) => {
        const problems = getTopicLeetCode(topic);
        const subtopics = subtopicsMap[topic.id] ?? new Array(topic.subtopics.length).fill(false);
        const leetcode = lcMap[topic.id] ?? new Array(problems.length).fill(false);
        const notes = notesMap[topic.id] ?? "";
        const status = statusMap[topic.id] ?? deriveStatus(subtopics, leetcode, notes);

        return [
          topic.id,
          {
            problems,
            subtopics,
            leetcode,
            notes,
            status,
            subtopicsDone: countDone(subtopics),
            leetcodeDone: countDone(leetcode),
          },
        ];
      }),
    ) as Record<
      string,
      {
        problems: LCProblem[];
        subtopics: boolean[];
        leetcode: boolean[];
        notes: string;
        status: TopicStatus;
        subtopicsDone: number;
        leetcodeDone: number;
      }
    >;
  }, [lcMap, notesMap, statusMap, subtopicsMap]);

  const filteredTopics = useMemo(() => {
    return ROADMAP_TOPICS.filter((topic) => {
      const progress = topicProgress[topic.id];
      const matchesSearch =
        deferredSearch.length === 0 ||
        topic.title.toLowerCase().includes(deferredSearch) ||
        topic.category.toLowerCase().includes(deferredSearch);

      if (!matchesSearch) return false;
      if (filter === "ALL") return true;
      if (filter === "IN_PROGRESS") return progress.status === "IN_PROGRESS";
      if (filter === "DONE") return progress.status === "DONE";
      if (filter === "PHASE_1") return topic.phase === 1;
      if (filter === "PHASE_2") return topic.phase === 2;
      if (filter === "PHASE_3") return topic.phase === 3;
      return topic.phase === 4;
    });
  }, [deferredSearch, filter, topicProgress]);

  const overallDone = ROADMAP_TOPICS.filter((topic) => topicProgress[topic.id]?.status === "DONE").length;
  const overallPercent = clampPercent((overallDone / ROADMAP_TOPICS.length) * 100);
  const lcSolved = lcCounter.easy + lcCounter.medium + lcCounter.hard;
  const currentPhase = now ? getCurrentRoadmapPhase(now) : 1;
  const daysLeftInCurrentPhase = now ? getDaysLeftInPhase(currentPhase, now) : 0;
  const projectTopics = ROADMAP_TOPICS.filter((topic) => topic.category === "Projects");
  const completedProjects = projectTopics.filter((topic) => topicProgress[topic.id]?.status === "DONE").length;
  const profileMeta = hydrated ? getProfileMeta() : { projects: 0, cgpa: 0 };
  const cgpaValue = profileMeta.cgpa > 0 ? profileMeta.cgpa : 6.5;
  const readinessStatus = getReadinessStatus(lcSolved, completedProjects, cgpaValue);
  const referralUnlocked = lcSolved >= 300 && completedProjects >= 5 && cgpaValue >= 7.5;
  const problemReviewStats = getReviewStats();
  const dueProblemReviews = getDueProblemReviews();
  const duePatternCards = getDuePatternCards().slice(0, 5);
  const patternCardStats = getPatternCardStats();
  const reviewCardQueue = duePatternCards.length > 0 ? duePatternCards : getPatternCards().slice(0, 3);
  const mockStats = getMockInterviewStats();
  const mockRemainingSeconds = mockStartedAt ? Math.max(0, 2700 - Math.floor((mockNow - mockStartedAt) / 1000)) : 2700;
  const oaRemainingSeconds = oaSession ? Math.max(0, 5400 - Math.floor((mockNow - oaSession.startedAt) / 1000)) : 5400;
  const oaHistory = getOaSimulations();

  function updateManualLc(diff: "easy" | "medium" | "hard", direction: "up" | "down") {
    const next = direction === "up" ? incrementLC(diff) : decrementLC(diff);
    const total = next.easy + next.medium + next.hard;
    setLcCounterState(next);
    setLeetCodeCount(total);
  }

  function updateDerivedStatus(topic: RoadmapTopic, subtopics: boolean[], leetcode: boolean[], notes: string) {
    const nextStatus = deriveStatus(subtopics, leetcode, notes);
    setTopicStatus(topic.id, nextStatus);
    setStatusMap((current) => ({ ...current, [topic.id]: nextStatus }));
  }

  function handleSubtopicToggle(topic: RoadmapTopic, index: number) {
    const current = topicProgress[topic.id];
    const nextValue = !current.subtopics[index];
    const nextSubtopics = setSubtopicState(topic.id, index, topic.subtopics.length, nextValue);
    setSubtopicsMap((value) => ({ ...value, [topic.id]: nextSubtopics }));
    updateDerivedStatus(topic, nextSubtopics, current.leetcode, current.notes);
  }

  function handleLeetCodeToggle(topic: RoadmapTopic, index: number) {
    const current = topicProgress[topic.id];
    const nextValue = !current.leetcode[index];
    const nextLeetcode = setLCState(topic.id, index, current.problems.length, nextValue);
    setLcMap((value) => ({ ...value, [topic.id]: nextLeetcode }));
    updateDerivedStatus(topic, current.subtopics, nextLeetcode, current.notes);
    const problem = current.problems[index];
    syncSolvedProblemReview(
      {
        problemNumber: problem.id,
        title: problem.title,
        category: topic.title,
        difficulty: problem.difficulty,
      },
      nextValue,
    );
    setReviewVersion((value) => value + 1);
  }

  function handleNotesChange(topic: RoadmapTopic, text: string) {
    setTopicNotes(topic.id, text);
    setNotesMap((value) => ({ ...value, [topic.id]: text }));
    const current = topicProgress[topic.id];
    updateDerivedStatus(topic, current.subtopics, current.leetcode, text);
  }

  function cycleTopicStatus(topic: RoadmapTopic) {
    const current = topicProgress[topic.id];

    if (current.status === "NOT_STARTED") {
      setTopicStatus(topic.id, "IN_PROGRESS");
      setStatusMap((value) => ({ ...value, [topic.id]: "IN_PROGRESS" }));
      return;
    }

    if (current.status === "IN_PROGRESS") {
      markTopicComplete(topic.id, topic.subtopics.length, current.problems.length);
      setStatusMap((value) => ({ ...value, [topic.id]: "DONE" }));
      setSubtopicsMap((value) => ({
        ...value,
        [topic.id]: new Array(topic.subtopics.length).fill(true),
      }));
      setLcMap((value) => ({
        ...value,
        [topic.id]: new Array(current.problems.length).fill(true),
      }));
      return;
    }

    const clearedSubtopics = setAllSubtopicsDone(topic.id, topic.subtopics.length, false);
    const clearedLeetcode = setAllLCDone(topic.id, current.problems.length, false);

    setTopicStatus(topic.id, "NOT_STARTED");
    setStatusMap((value) => ({ ...value, [topic.id]: "NOT_STARTED" }));
    setSubtopicsMap((value) => ({ ...value, [topic.id]: clearedSubtopics }));
    setLcMap((value) => ({ ...value, [topic.id]: clearedLeetcode }));
  }

  function markAllDone(topic: RoadmapTopic) {
    const current = topicProgress[topic.id];
    markTopicComplete(topic.id, topic.subtopics.length, current.problems.length);
    setStatusMap((value) => ({ ...value, [topic.id]: "DONE" }));
    setSubtopicsMap((value) => ({
      ...value,
      [topic.id]: new Array(topic.subtopics.length).fill(true),
    }));
    setLcMap((value) => ({
      ...value,
      [topic.id]: new Array(current.problems.length).fill(true),
    }));
  }

  function formatMockTimer(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startMockInterview(type: InterviewType) {
    setMockType(type);
    setMockFeedback("");
    setMockAnswer("");
    setMockRunning(true);
    setMockStartedAt(Date.now());
    setMockPrompt(
      type === "CODING"
        ? getCodingMockPrompt()
        : type === "BEHAVIOURAL"
          ? getBehaviouralQuestions()[0]
          : getSystemDesignPrompt(),
    );
  }

  async function submitMockInterview() {
    if (!mockStartedAt) return;
    setMockLoading(true);
    try {
      const response = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mockType,
          prompt: mockPrompt,
          answer: mockAnswer,
          apiKey: navigator.onLine && isAiEnabledLocally() ? getStoredAnthropicKey() : "",
        }),
      });
      const data = (await response.json()) as {
        feedback?: string;
        pass?: boolean;
        score?: number;
        weakness?: string;
      };
      saveMockInterview({
        id: crypto.randomUUID(),
        type: mockType,
        prompt: mockPrompt,
        startedAt: mockStartedAt,
        submittedAt: Date.now(),
        minutesTaken: Math.round((Date.now() - mockStartedAt) / 60000),
        answer: mockAnswer,
        feedback: data.feedback ?? "",
        pass: Boolean(data.pass),
        score: data.score ?? 0,
        weakness: data.weakness ?? "Communication",
      });
      setMockFeedback(data.feedback ?? "");
      setMockRunning(false);
    } finally {
      setMockLoading(false);
    }
  }

  function startOa() {
    setOaSession(createOaSimulation(oaCompany, oaPhase));
    setOaCurrentIndex(0);
  }

  function updateOaAnswer(value: string) {
    if (!oaSession) return;
    const nextAnswers = [...oaSession.answers];
    nextAnswers[oaCurrentIndex] = value;
    setOaSession({ ...oaSession, answers: nextAnswers });
  }

  function submitOaStep() {
    if (!oaSession) return;
    if (oaCurrentIndex < oaSession.problems.length - 1) {
      setOaCurrentIndex((value) => value + 1);
      return;
    }
    const result = evaluateOaResult(oaSession.answers);
    saveOaSimulation({
      ...oaSession,
      submittedAt: Date.now(),
      minutesUsed: Math.round((Date.now() - oaSession.startedAt) / 60000),
      pass: result.pass,
      resultLabel: result.resultLabel,
      feedback: result.feedback,
    });
    setOaSession(null);
    setOaCurrentIndex(0);
    setOaHistoryVersion((value) => value + 1);
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-lg px-4 pb-64 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] tracking-[0.18em] text-white/45">ROADMAP</p>
            <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
              Detailed. Trackable. Built for compounding.
            </p>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">TOTAL PROGRESS</p>
            <p className="mt-3 text-[28px] font-semibold text-white">
              {overallDone}/{ROADMAP_TOPICS.length}
            </p>
            <p className="mt-2 text-[13px] text-[#fbbf24]">{overallPercent}% complete</p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">LEETCODE</p>
            <p className="mt-3 text-[28px] font-semibold text-white">{lcSolved}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateManualLc("easy", "up")}
                className="rounded-full border border-[#10b981]/20 bg-[#10b981]/10 px-2 py-2 text-[11px] font-semibold text-[#10b981]"
              >
                +1E
              </button>
              <button
                type="button"
                onClick={() => updateManualLc("medium", "up")}
                className="rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/10 px-2 py-2 text-[11px] font-semibold text-[#fbbf24]"
              >
                +1M
              </button>
              <button
                type="button"
                onClick={() => updateManualLc("hard", "up")}
                className="rounded-full border border-[#ef4444]/20 bg-[#ef4444]/10 px-2 py-2 text-[11px] font-semibold text-[#ef4444]"
              >
                +1H
              </button>
            </div>
            <div className="mt-2 flex gap-2 text-[11px] text-white/35">
              <button type="button" onClick={() => updateManualLc("easy", "down")}>
                -1E
              </button>
              <button type="button" onClick={() => updateManualLc("medium", "down")}>
                -1M
              </button>
              <button type="button" onClick={() => updateManualLc("hard", "down")}>
                -1H
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">CURRENT PHASE</p>
            <p className="mt-3 text-[24px] font-semibold text-white">{PHASE_META[currentPhase].label}</p>
            <p className="mt-2 text-[13px] text-[#fbbf24]">{daysLeftInCurrentPhase} days left</p>
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics by name"
            className="w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-[14px] text-white placeholder:text-white/25"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((pill) => {
              const active = filter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFilter(pill.key)}
                  className={`rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] transition ${
                    active
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/55"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </section>

        <section id="review" className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-white/45">REVIEW</p>
              <p className="mt-2 text-[20px] font-semibold text-white">Spaced repetition for solved problems.</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${problemReviewStats.dueToday > 0 ? "border-[#ef4444]/30 bg-[#2a1010] text-[#ffb4b4]" : "border-white/10 bg-black/20 text-white/55"}`}>
              {problemReviewStats.dueToday} DUE
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">MASTERED</p>
              <p className="mt-2 text-[24px] font-semibold text-[#fbbf24]">
                {problemReviewStats.totalMastered}/{problemReviewStats.totalSolved}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">RETENTION RATE</p>
              <p className="mt-2 text-[24px] font-semibold text-white">{problemReviewStats.retentionRate}%</p>
            </div>
          </div>

          <div className="mt-3 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] tracking-[0.16em] text-white/40">FORGETTING RISK</p>
            <p className="mt-2 text-[14px] leading-6 text-white/72">
              At your current rate, you will forget {problemReviewStats.projectedForgotten} problems by next month.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {dueProblemReviews.length === 0 ? (
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 text-[14px] text-white/55">
                No reviews due. Keep solving and the queue will build automatically.
              </div>
            ) : (
              dueProblemReviews.map((review) => (
                <article
                  key={`${review.id}-${reviewVersion}`}
                  className={`rounded-[28px] border p-4 ${review.nextReviewDate < getTodayKey() ? "border-[#ef4444]/20 bg-[#140b0b]" : "border-white/8 bg-black/20"}`}
                >
                  <p className={`text-[10px] tracking-[0.16em] ${review.mastered ? "text-[#fbbf24]" : "text-white/40"}`}>
                    {review.mastered ? "MASTERED" : `DUE ${formatHumanDate(review.nextReviewDate).toUpperCase()}`}
                  </p>
                  <p className="mt-3 text-[18px] font-semibold text-white">
                    PROBLEM #{review.problemNumber} — {review.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-white/65">
                    Category: {review.category}
                    <br />
                    Difficulty: {review.difficulty}
                    <br />
                    Can you solve it in under {review.promptMinutes} minutes?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ReviewResponseButton
                      label="I REMEMBER"
                      tone="bright"
                      onClick={() => {
                        reviewProblem(review.id, "remembered");
                        setReviewVersion((value) => value + 1);
                      }}
                    />
                    <ReviewResponseButton
                      label="NEEDED A HINT"
                      tone="soft"
                      onClick={() => {
                        reviewProblem(review.id, "hint");
                        setReviewVersion((value) => value + 1);
                      }}
                    />
                    <ReviewResponseButton
                      label="FORGOT"
                      tone="danger"
                      onClick={() => {
                        reviewProblem(review.id, "forgot");
                        setReviewVersion((value) => value + 1);
                      }}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section id="cards" className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-white/45">CARDS</p>
              <p className="mt-2 text-[20px] font-semibold text-white">Pattern recall over pattern rereading.</p>
            </div>
            <div className="text-right text-[12px] text-white/55">
              <p>{patternCardStats.mastered}/{patternCardStats.total} mastered</p>
              <p className="mt-1 text-[#fbbf24]">{patternCardStats.dueToday} due today</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">WEAKEST PATTERN</p>
              <p className="mt-2 text-[16px] font-semibold text-white">{patternCardStats.weakestPattern}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">DAILY LOAD</p>
              <p className="mt-2 text-[16px] font-semibold text-white">{Math.max(3, Math.min(5, duePatternCards.length || 3))} cards</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {reviewCardQueue.map((card) => {
              const flipped = flippedCards[card.id] ?? false;
              return (
                <article key={card.id} className="rounded-[28px] border border-white/8 bg-black/20 p-4 [perspective:1200px]">
                  <button
                    type="button"
                    onClick={() => setFlippedCards((current) => ({ ...current, [card.id]: !current[card.id] }))}
                    className="block w-full"
                  >
                    <div className="relative min-h-[220px] w-full [transform-style:preserve-3d] transition duration-500" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                      <div className="absolute inset-0 rounded-[22px] border border-white/8 bg-[#0a0a0a] p-5 text-left [backface-visibility:hidden]">
                        <p className="text-[10px] tracking-[0.16em] text-white/40">FRONT</p>
                        <p className="mt-4 text-[22px] font-semibold text-white">{card.title}</p>
                        <p className="mt-4 text-[15px] leading-7 text-white/75">{card.front}</p>
                        <p className="mt-6 text-[12px] text-white/35">Tap to flip</p>
                      </div>
                      <div className="absolute inset-0 rounded-[22px] border border-[#fbbf24]/15 bg-[#130f04] p-5 text-left [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                        <p className="text-[10px] tracking-[0.16em] text-[#fbbf24]">BACK</p>
                        <pre className="mt-4 whitespace-pre-wrap text-[12px] leading-6 text-white/80">{card.back}</pre>
                        <p className="mt-4 text-[12px] leading-6 text-white/60">
                          Key problems: {card.examples.join(", ")}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ReviewResponseButton
                      label="I KNOW THIS"
                      tone="bright"
                      onClick={() => {
                        reviewPatternCard(card.id, "remembered");
                        setReviewVersion((value) => value + 1);
                      }}
                    />
                    <ReviewResponseButton
                      label="REVIEW AGAIN"
                      tone="danger"
                      onClick={() => {
                        reviewPatternCard(card.id, "forgot");
                        setReviewVersion((value) => value + 1);
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] tracking-[0.16em] text-white/40">ALL 12 CARDS</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PATTERN_FLASHCARDS.map((card) => (
                <span key={card.id} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/55">
                  {card.title}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="mock-interview" className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-white/45">MOCK INTERVIEW</p>
              <p className="mt-2 text-[20px] font-semibold text-white">Practice under pressure, not just in theory.</p>
            </div>
            <div className="text-right text-[12px] text-white/55">
              <p>{mockStats.total} mocks done</p>
              <p className="mt-1 text-[#fbbf24]">Readiness {mockStats.readiness}/100</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">CODING PASS RATE</p>
              <p className="mt-2 text-[22px] font-semibold text-white">{mockStats.passRate}%</p>
              <p className="mt-1 text-[12px] text-white/45">Avg easy solve time: {mockStats.avgEasyTime} min</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">NEXT WEAKNESS</p>
              <p className="mt-2 text-[16px] font-semibold text-white">{mockStats.weakest}</p>
              <p className="mt-1 text-[12px] text-white/45">Behavioural avg: {mockStats.behaviouralAvg}/10</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => startMockInterview("CODING")} className="rounded-full border border-white/12 bg-white px-4 py-2 text-[11px] font-semibold text-black">START CODING MOCK</button>
            <button type="button" onClick={() => startMockInterview("BEHAVIOURAL")} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-semibold text-white">START BEHAVIOURAL</button>
            <button type="button" onClick={() => startMockInterview("SYSTEM_DESIGN")} disabled={!isSystemDesignUnlocked()} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-semibold text-white disabled:text-white/25">SYSTEM DESIGN</button>
          </div>

          <div className="mt-5 rounded-[28px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.16em] text-white/40">{mockType.replace("_", " ")}</p>
                <p className="mt-2 text-[16px] leading-7 text-white">{mockPrompt}</p>
              </div>
              {mockRunning && (
                <p className="text-[28px] font-semibold tracking-[0.08em] text-[#ef4444]">
                  {formatMockTimer(mockRemainingSeconds)}
                </p>
              )}
            </div>
            <textarea
              value={mockAnswer}
              onChange={(event) => setMockAnswer(event.target.value)}
              rows={10}
              placeholder="Type your approach, structure, or answer here."
              className="mt-4 w-full rounded-[22px] border border-white/10 bg-[#060606] px-4 py-3 text-[14px] leading-6 text-white placeholder:text-white/25"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={submitMockInterview} disabled={mockLoading || mockAnswer.trim().length === 0} className="rounded-full border border-white/12 bg-white px-4 py-2 text-[11px] font-semibold text-black disabled:opacity-40">
                {mockLoading ? "EVALUATING" : "SUBMIT"}
              </button>
              {!isSystemDesignUnlocked() && (
                <p className="text-[12px] text-white/35">System design unlocks in Phase 3.</p>
              )}
            </div>
            {mockFeedback && (
              <div className="mt-4 rounded-[22px] border border-[#fbbf24]/15 bg-[#120f06] p-4">
                <pre className="whitespace-pre-wrap text-[13px] leading-6 text-white/80">{mockFeedback}</pre>
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border border-[#3b82f6]/18 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(9,9,9,0.96))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-[#93c5fd]">OA SIMULATOR</p>
              <p className="mt-2 text-[20px] font-semibold text-white">Practice timed pressure, not just clean-room solving.</p>
            </div>
            <div className="text-right text-[12px] text-white/55">
              <p>{oaHistory.length} OAs done</p>
              <p className="mt-1 text-[#93c5fd]">90 min format</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] tracking-[0.16em] text-white/40">COMPANY</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Amazon", "Microsoft", "Flipkart", "Generic"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setOaCompany(item)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${oaCompany === item ? "border-white/12 bg-white text-black" : "border-white/10 bg-black/20 text-white"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.16em] text-white/40">DIFFICULTY PHASE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  { key: "PHASE_1", label: "Phase 1: Easy only" },
                  { key: "PHASE_2", label: "Phase 2: Easy + Medium" },
                  { key: "PHASE_3", label: "Phase 3: Medium + Hard" },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setOaPhase(item.key)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${oaPhase === item.key ? "border-white/12 bg-white text-black" : "border-white/10 bg-black/20 text-white"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startOa}
            className="mt-5 w-full rounded-[20px] border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold text-black"
          >
            START OA SIMULATION
          </button>

          <div className="mt-5 space-y-2">
            {oaHistory.slice(0, 5).map((entry) => (
              <div key={`${entry.id}-${oaHistoryVersion}`} className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3 text-[13px] text-white/72">
                <p className="text-white">{entry.date} | {entry.company} | {entry.resultLabel}</p>
                <p className="mt-1">{entry.problems.length} problems | {entry.minutesUsed}/90 min</p>
              </div>
            ))}
          </div>
          {oaHistory[0] && (
            <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[10px] tracking-[0.16em] text-white/40">LATEST OA RESULT</p>
              <p className="mt-2 text-[18px] font-semibold text-white">OA COMPLETE — {oaHistory[0].minutesUsed} minutes used</p>
              <div className="mt-3 space-y-2 text-[13px] text-white/72">
                {oaHistory[0].feedback.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>Estimated result: {oaHistory[0].resultLabel}</p>
                <p>Efficiency: {90 - oaHistory[0].minutesUsed >= 20 ? "Good — had buffer" : "Tight — reduce hesitation"}</p>
                <p>Next OA practice: Recommended in 3 days.</p>
              </div>
            </div>
          )}
        </section>

        {oaSession && (
          <div className="fixed inset-0 z-[98] overflow-y-auto bg-[#050505] px-4 py-6">
            <div className="mx-auto max-w-lg">
              <div className="rounded-[28px] border border-[#3b82f6]/20 bg-[#090909] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] tracking-[0.18em] text-[#93c5fd]">ONLINE ASSESSMENT SIMULATION</p>
                    <p className="mt-2 text-[13px] text-white/55">{oaCompany} · {oaPhase.replace("_", " ")}</p>
                  </div>
                  <p className="text-[28px] font-semibold tracking-[0.08em] text-[#ef4444]">{formatMockTimer(oaRemainingSeconds)}</p>
                </div>

                <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] tracking-[0.16em] text-white/40">PROBLEM {oaCurrentIndex + 1} OF {oaSession.problems.length}</p>
                  <p className="mt-3 text-[18px] font-semibold text-white">{oaSession.problems[oaCurrentIndex].title}</p>
                  <p className="mt-3 text-[14px] leading-7 text-white/80">{oaSession.problems[oaCurrentIndex].statement}</p>
                  <p className="mt-4 text-[12px] text-white/55">Input: {oaSession.problems[oaCurrentIndex].sampleInput}</p>
                  <p className="mt-1 text-[12px] text-white/55">Output: {oaSession.problems[oaCurrentIndex].sampleOutput}</p>
                  <div className="mt-3 space-y-1 text-[12px] text-white/45">
                    {oaSession.problems[oaCurrentIndex].constraints.map((constraint) => (
                      <p key={constraint}>- {constraint}</p>
                    ))}
                  </div>
                  <textarea
                    value={oaSession.answers[oaCurrentIndex]}
                    onChange={(event) => updateOaAnswer(event.target.value)}
                    rows={10}
                    placeholder="Your approach (write here)"
                    className="mt-4 w-full rounded-[20px] border border-white/10 bg-[#060606] px-4 py-3 text-[14px] leading-6 text-white"
                  />
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={submitOaStep}
                      className="rounded-[18px] border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold text-black"
                    >
                      {oaCurrentIndex === oaSession.problems.length - 1 ? "SUBMIT OA" : `SUBMIT PROBLEM ${oaCurrentIndex + 1} → NEXT`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOaSession(null)}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white"
                    >
                      EXIT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="mt-6 space-y-6">
          {([1, 2, 3, 4] as const).map((phase) => {
            const visible = filteredTopics.filter((topic) => topic.phase === phase);
            if (visible.length === 0) return null;

            const allPhaseTopics = ROADMAP_TOPICS.filter((topic) => topic.phase === phase);
            const doneCount = allPhaseTopics.filter((topic) => topicProgress[topic.id]?.status === "DONE").length;
            const phasePercent = clampPercent((doneCount / allPhaseTopics.length) * 100);

            return (
              <section key={phase}>
                <div className="mb-3 rounded-[28px] border border-white/8 bg-[#090909] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-white/45">PHASE {phase}</p>
                      <p className="mt-2 text-[20px] font-semibold text-white">{PHASE_META[phase].label}</p>
                      <p className="mt-1 text-[13px] text-white/45">{PHASE_META[phase].dateRange}</p>
                      <p className="mt-3 text-[13px] leading-6 text-white/68">{PHASE_META[phase].target}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-white">
                        {doneCount}/{allPhaseTopics.length} topics
                      </p>
                      <p className="mt-1 text-[12px] text-[#fbbf24]">{phasePercent}%</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${phasePercent}%`,
                        backgroundColor: PHASE_META[phase].color,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {visible.map((topic) => {
                    const progress = topicProgress[topic.id];
                    const open = expandedTopicId === topic.id;
                    const totalSubtopics = topic.subtopics.length;
                    const resources = getTopicResources(topic);
                    const totalProblems = progress.problems.length;

                    return (
                      <article
                        key={topic.id}
                        className="overflow-hidden rounded-[30px] border border-white/8 bg-[#090909]"
                        style={{ borderLeft: `4px solid ${getPhaseBorderColor(topic.phase)}` }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedTopicId((current) => (current === topic.id ? null : topic.id))}
                          className="w-full px-5 py-5 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[18px] font-semibold text-white">{topic.title}</p>
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] tracking-[0.08em] text-white/45">
                                  {topic.category}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-white/52">
                                <span>{formatHours(topic.estimatedHours)}</span>
                                <span>
                                  {progress.subtopicsDone}/{totalSubtopics} subtopics done
                                </span>
                                <span>
                                  {progress.leetcodeDone}/{totalProblems} LC done
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${STATUS_META[progress.status].className}`}
                              >
                                {STATUS_META[progress.status].label}
                              </span>
                              <ChevronIcon open={open} />
                            </div>
                          </div>
                        </button>

                        {open && (
                          <div className="border-t border-white/8 px-5 pb-5 pt-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => cycleTopicStatus(topic)}
                                className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-left"
                              >
                                <p className="text-[11px] tracking-[0.16em] text-white/40">STATUS TOGGLE</p>
                                <p className="mt-2 text-[14px] font-semibold text-white">
                                  {STATUS_META[progress.status].label}
                                </p>
                                <p className="mt-1 text-[12px] text-white/45">Tap to cycle status</p>
                              </button>

                              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                                <p className="text-[11px] tracking-[0.16em] text-white/40">ESTIMATED HOURS</p>
                                <p className="mt-2 text-[14px] font-semibold text-white">{formatHours(topic.estimatedHours)}</p>
                                <p className="mt-1 text-[12px] text-white/45">
                                  {progress.subtopicsDone}/{totalSubtopics} subtopics complete
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-[11px] tracking-[0.18em] text-white/40">SUBTOPICS</p>
                              <div className="mt-3 space-y-2">
                                {topic.subtopics.map((subtopic, index) => (
                                  <CheckboxRow
                                    key={subtopic}
                                    checked={progress.subtopics[index] ?? false}
                                    label={subtopic}
                                    onToggle={() => handleSubtopicToggle(topic, index)}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-[11px] tracking-[0.18em] text-white/40">RESOURCES</p>
                              <div className="mt-3 space-y-2">
                                {resources.length > 0 ? (
                                  resources.map((resource) => (
                                    <a
                                      key={`${topic.id}-${resource.title}`}
                                      href={resource.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-start justify-between gap-3 rounded-[20px] border border-white/8 bg-black/20 px-3 py-3 transition hover:border-white/14"
                                    >
                                      <div>
                                        <p className="text-[13px] text-white">{resource.title}</p>
                                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
                                          {resource.type}
                                        </p>
                                      </div>
                                      <span className="text-[12px] text-[#fbbf24]">Open</span>
                                    </a>
                                  ))
                                ) : (
                                  <div className="rounded-[20px] border border-white/8 bg-black/20 px-3 py-3 text-[13px] text-white/45">
                                    No pinned resources yet.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-[11px] tracking-[0.18em] text-white/40">LEETCODE PROBLEMS</p>
                              <div className="mt-3 space-y-2">
                                {progress.problems.map((problem, index) => (
                                  <CheckboxRow
                                    key={`${topic.id}-${problem.id}`}
                                    checked={progress.leetcode[index] ?? false}
                                    label={`${problem.title} (#${problem.id}) — ${problem.difficulty}`}
                                    onToggle={() => handleLeetCodeToggle(topic, index)}
                                    tone="lc"
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-[11px] tracking-[0.18em] text-white/40">NOTES</p>
                              <textarea
                                value={progress.notes}
                                onChange={(event) => handleNotesChange(topic, event.target.value)}
                                rows={4}
                                placeholder="Write your notes, blockers, or revision plan."
                                className="mt-3 w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-[14px] leading-6 text-white placeholder:text-white/25"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => markAllDone(topic)}
                              className="mt-5 w-full rounded-[22px] border border-[#fbbf24]/20 bg-[#fbbf24]/12 px-4 py-3 text-[12px] font-semibold tracking-[0.14em] text-[#fbbf24]"
                            >
                              MARK ALL DONE
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </section>
      </main>

      <div className="pointer-events-none fixed bottom-[68px] left-0 right-0 z-40">
        <div className="mx-auto max-w-lg px-4">
          <section
            className={`pointer-events-auto rounded-[28px] border p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm ${
              referralUnlocked
                ? "border-[#fbbf24]/35 bg-[#1a1404]/95"
                : "border-white/10 bg-[#090909]/95"
            }`}
          >
            <p className="text-[11px] tracking-[0.18em] text-white/40">REFERRAL METER</p>

            <div className="mt-4 space-y-3">
              {[
                { label: "LeetCode", value: lcSolved, target: 300, display: `${lcSolved}/300`, color: "#fbbf24" },
                { label: "Projects", value: completedProjects, target: 5, display: `${completedProjects}/5`, color: "#3b82f6" },
                { label: "CGPA", value: cgpaValue, target: 7.5, display: `${cgpaValue.toFixed(1)}/7.5`, color: "#10b981" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-white/65">
                    <span>{item.label}</span>
                    <span>{item.display}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/7">
                    <div
                      className="h-full rounded-full"
                      style={{ width: getBarWidth(item.value, item.target), backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className={`mt-4 text-[13px] font-semibold ${referralUnlocked ? "text-[#fbbf24]" : "text-white"}`}>
              {readinessStatus}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
