import { getMedCompletions } from "./health-store";
import { getProjects } from "./career-store";
import { getLeetCodeCount } from "./store";
import { getTodayKey, saveProfileMeta } from "./momentum";

const KEYS = {
  academics: "momentum_academics_v1",
  moods: "momentum_moods_v1",
  oaSimulations: "momentum_oa_simulations_v1",
  linkedin: "momentum_linkedin_v1",
  internshipApplications: "momentum_internship_apps_v1",
  connectionGrowth: "momentum_linkedin_connection_growth_v1",
} as const;

export type BacklogStatus = "NOT_STARTED" | "STUDYING" | "CLEARED";
export type MoodLevel = "STRONG" | "GOOD" | "OKAY" | "LOW" | "VERY_LOW";
export type OaCompany = "Amazon" | "Microsoft" | "Flipkart" | "Generic";
export type OaPhase = "PHASE_1" | "PHASE_2" | "PHASE_3";
export type InternshipStatus = "NOT_APPLIED" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface BacklogEntry {
  id: string;
  title: string;
  status: BacklogStatus;
  examDate: string;
  studyHours: number;
  targetHours: number;
  note?: string;
}

export interface SemesterSubject {
  id: string;
  name: string;
  internalMarksObtained: number;
  internalMarksTotal: number;
  expectedGrade: string;
  attendancePresent: number;
  attendanceTotal: number;
}

export interface AcademicState {
  currentCgpa: number;
  creditsCompleted: number;
  creditsRemaining: number;
  currentSemester: string;
  targetCgpa: number;
  targetGraduationLabel: string;
  backlogs: BacklogEntry[];
  subjects: SemesterSubject[];
}

export interface MoodEntry {
  date: string;
  mood: MoodLevel;
}

export interface OaProblemTemplate {
  id: string;
  title: string;
  statement: string;
  sampleInput: string;
  sampleOutput: string;
  constraints: string[];
}

export interface OaSimulationEntry {
  id: string;
  date: string;
  company: OaCompany;
  phase: OaPhase;
  problems: OaProblemTemplate[];
  answers: string[];
  startedAt: number;
  submittedAt: number;
  minutesUsed: number;
  pass: boolean;
  resultLabel: "PASS" | "FAIL";
  feedback: string[];
}

export interface LinkedInState {
  checks: Record<string, boolean>;
  currentConnections: number;
}

export interface ConnectionGrowthEntry {
  weekLabel: string;
  connections: number;
}

export interface InternshipApplication {
  id: string;
  company: string;
  appliedDate: string;
  status: InternshipStatus;
  stipend: string;
}

const LINKEDIN_CHECKS = [
  "profile_photo",
  "headline",
  "location",
  "custom_url",
  "about_written",
  "about_goal",
  "about_skills",
  "about_contact",
  "momentum_experience",
  "internship_listed",
  "education_correct",
  "cgpa_shown_if_safe",
  "python_endorsements",
  "nextjs_skill",
  "supabase_skill",
  "git_skill",
  "dsa_skill",
  "recent_post",
  "saurabh_connected",
  "connections_100",
  "connections_500",
  "momentum_project",
  "demo_attached",
] as const;

const DEFAULT_ACADEMICS: AcademicState = {
  currentCgpa: 6.5,
  creditsCompleted: 72,
  creditsRemaining: 88,
  currentSemester: "4th (2nd year)",
  targetCgpa: 7.5,
  targetGraduationLabel: "May 2028",
  backlogs: [
    {
      id: "backlog-ds-theory",
      title: "Data Structures Theory",
      status: "NOT_STARTED",
      examDate: "",
      studyHours: 0,
      targetHours: 40,
    },
    {
      id: "backlog-ds-lab",
      title: "Data Structures Lab",
      status: "NOT_STARTED",
      examDate: "",
      studyHours: 0,
      targetHours: 30,
      note: "Caught cheating — be careful this time",
    },
    {
      id: "backlog-unknown",
      title: "Unknown — fill in",
      status: "NOT_STARTED",
      examDate: "",
      studyHours: 0,
      targetHours: 25,
    },
  ],
  subjects: [
    {
      id: "subject-os",
      name: "OS",
      internalMarksObtained: 0,
      internalMarksTotal: 50,
      expectedGrade: "B",
      attendancePresent: 0,
      attendanceTotal: 0,
    },
    {
      id: "subject-dbms",
      name: "DBMS",
      internalMarksObtained: 0,
      internalMarksTotal: 50,
      expectedGrade: "B",
      attendancePresent: 0,
      attendanceTotal: 0,
    },
  ],
};

const DEFAULT_LINKEDIN: LinkedInState = {
  checks: Object.fromEntries(LINKEDIN_CHECKS.map((key) => [key, false])),
  currentConnections: 0,
};

const OA_BANK: Record<OaPhase, OaProblemTemplate[]> = {
  PHASE_1: [
    {
      id: "two-sum",
      title: "Two Sum",
      statement: "Given an array of integers, find the two numbers that add up to a target sum. Return their indices.",
      sampleInput: "nums = [2,7,11,15], target = 9",
      sampleOutput: "[0,1]",
      constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists"],
    },
    {
      id: "valid-anagram",
      title: "Valid Anagram",
      statement: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
      sampleInput: 's = "anagram", t = "nagaram"',
      sampleOutput: "true",
      constraints: ["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters"],
    },
  ],
  PHASE_2: [
    {
      id: "group-anagrams",
      title: "Group Anagrams",
      statement: "Group the anagrams together. You can return the answer in any order.",
      sampleInput: 'strs = ["eat","tea","tan","ate","nat","bat"]',
      sampleOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      constraints: ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100"],
    },
    {
      id: "top-k",
      title: "Top K Frequent Elements",
      statement: "Return the k most frequent elements from the array.",
      sampleInput: "nums = [1,1,1,2,2,3], k = 2",
      sampleOutput: "[1,2]",
      constraints: ["1 <= nums.length <= 10^5", "1 <= k <= number of unique elements"],
    },
  ],
  PHASE_3: [
    {
      id: "course-schedule",
      title: "Course Schedule",
      statement: "Given prerequisites, determine if you can finish all courses.",
      sampleInput: "numCourses = 2, prerequisites = [[1,0]]",
      sampleOutput: "true",
      constraints: ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000"],
    },
    {
      id: "merge-k-lists",
      title: "Merge K Sorted Lists",
      statement: "Merge k sorted linked lists and return it as one sorted list.",
      sampleInput: "lists = [[1,4,5],[1,3,4],[2,6]]",
      sampleOutput: "[1,1,2,3,4,4,5,6]",
      constraints: ["k == lists.length", "0 <= k <= 10^4", "The sum of lengths will not exceed 10^4"],
    },
  ],
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

function daysUntil(date: string) {
  if (!date) return null;
  const start = new Date(`${getTodayKey()}T00:00:00`).getTime();
  const end = new Date(`${date}T00:00:00`).getTime();
  return Math.ceil((end - start) / 86400000);
}

function getMoodScore(mood: MoodLevel) {
  if (mood === "STRONG") return 5;
  if (mood === "GOOD") return 4;
  if (mood === "OKAY") return 3;
  if (mood === "LOW") return 2;
  return 1;
}

export function getAcademicState() {
  const state = read<AcademicState>(KEYS.academics, DEFAULT_ACADEMICS);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.academics)) {
    write(KEYS.academics, state);
  }
  return state;
}

export function saveAcademicState(next: AcademicState) {
  write(KEYS.academics, next);
  saveProfileMeta({
    ...read("momentum_profile_meta", { projects: getProjects().filter((project) => project.status !== "ABANDONED").length, cgpa: next.currentCgpa }),
    projects: getProjects().filter((project) => project.status !== "ABANDONED").length,
    cgpa: next.currentCgpa,
  });
  emitChange();
}

export function updateBacklog(backlogId: string, updates: Partial<BacklogEntry>) {
  const state = getAcademicState();
  saveAcademicState({
    ...state,
    backlogs: state.backlogs.map((backlog) => (backlog.id === backlogId ? { ...backlog, ...updates } : backlog)),
  });
}

export function updateSubject(subjectId: string, updates: Partial<SemesterSubject>) {
  const state = getAcademicState();
  saveAcademicState({
    ...state,
    subjects: state.subjects.map((subject) => (subject.id === subjectId ? { ...subject, ...updates } : subject)),
  });
}

export function saveAcademicFields(updates: Partial<AcademicState>) {
  saveAcademicState({ ...getAcademicState(), ...updates });
}

export function getAcademicInsights() {
  const state = getAcademicState();
  const backlogs = state.backlogs.map((backlog) => {
    const remaining = Math.max(0, backlog.targetHours - backlog.studyHours);
    const daysLeft = daysUntil(backlog.examDate);
    const progress = backlog.targetHours <= 0 ? 0 : Math.round((backlog.studyHours / backlog.targetHours) * 100);
    const catchUpHours =
      daysLeft && daysLeft > 0 ? Math.max(1, Math.ceil(remaining / daysLeft)) : remaining > 0 ? remaining : 0;
    const reminder =
      daysLeft !== null && daysLeft < 30 && backlog.status !== "CLEARED"
        ? `${backlog.title} exam in ${daysLeft} days. You have logged ${backlog.studyHours} of ${backlog.targetHours} target hours. Study ${catchUpHours}hrs today to catch up.`
        : "";
    return { ...backlog, daysLeft, progress, reminder };
  });
  const cleared = backlogs.filter((item) => item.status === "CLEARED").length;
  const totalCredits = state.creditsCompleted + state.creditsRemaining;
  const requiredAverage =
    state.creditsRemaining <= 0
      ? 0
      : Math.max(
          0,
          Number(
            ((state.targetCgpa * totalCredits - state.currentCgpa * state.creditsCompleted) / state.creditsRemaining).toFixed(1),
          ),
        );
  const subjects = state.subjects.map((subject) => {
    const internalPct =
      subject.internalMarksTotal > 0 ? Math.round((subject.internalMarksObtained / subject.internalMarksTotal) * 100) : 0;
    const attendancePct =
      subject.attendanceTotal > 0 ? Math.round((subject.attendancePresent / subject.attendanceTotal) * 100) : 0;
    const missesAllowed =
      subject.attendanceTotal > 0 ? Math.max(0, subject.attendancePresent - Math.ceil(0.75 * subject.attendanceTotal)) : 0;
    return {
      ...subject,
      internalPct,
      attendancePct,
      atRisk: attendancePct > 0 && attendancePct < 75,
      riskCopy:
        attendancePct > 0 && attendancePct < 75
          ? `Your ${subject.name} attendance is at risk. Miss ${missesAllowed} more classes this month.`
          : "",
    };
  });
  return {
    ...state,
    backlogs,
    backlogsRemaining: state.backlogs.length - cleared,
    requiredAverage,
    subjects,
  };
}

export function getMoodEntries() {
  return read<MoodEntry[]>(KEYS.moods, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveMoodEntry(mood: MoodLevel, date = getTodayKey()) {
  const next = getMoodEntries().filter((entry) => entry.date !== date);
  next.push({ date, mood });
  write(KEYS.moods, next);
  emitChange();
}

export function getMoodInsights() {
  const entries = getMoodEntries();
  const last30 = entries.slice(-30);
  const last60 = entries.slice(-60);
  const todayMood = entries.find((entry) => entry.date === getTodayKey())?.mood ?? null;
  const latestThree = [...entries].slice(-3);
  const lowRun = latestThree.length === 3 && latestThree.every((entry) => entry.mood === "LOW" || entry.mood === "VERY_LOW");
  const lastMood = entries.at(-1)?.mood ?? null;
  const previousRun = [...entries].slice(-4, -1);
  const betterDay =
    (lastMood === "STRONG" || lastMood === "GOOD") &&
    previousRun.length === 3 &&
    previousRun.every((entry) => entry.mood === "LOW" || entry.mood === "VERY_LOW");
  const mondayLows = last30.filter((entry) => {
    const weekday = new Date(`${entry.date}T00:00:00`).getDay();
    return weekday === 1 && (entry.mood === "LOW" || entry.mood === "VERY_LOW");
  });
  const medsToday = getMedCompletions(getTodayKey());
  const medWarning =
    (todayMood === "LOW" || todayMood === "VERY_LOW") && !medsToday.includes("med-scelepra")
      ? "You missed S-Celepra today. This directly affects mood. You stopped this medication twice before. Take it now. Not tomorrow."
      : "";
  const correlationReady = last60.length >= 60;

  const computeCompletionRate = (targetMoods: MoodLevel[]) => {
    const days = last60.filter((entry) => targetMoods.includes(entry.mood));
    if (days.length === 0) return { gym: 0, coding: 0 };
    const gymCount = days.filter((entry) => {
      const raw = read<Record<string, string[]>>("momentum_completions", {});
      return raw[entry.date]?.includes("body-gym");
    }).length;
    const codingCount = days.filter((entry) => {
      const raw = read<Record<string, string[]>>("momentum_completions", {});
      return raw[entry.date]?.includes("grind-coding");
    }).length;
    return {
      gym: Math.round((gymCount / days.length) * 100),
      coding: Math.round((codingCount / days.length) * 100),
    };
  };

  const strongRates = computeCompletionRate(["STRONG", "GOOD"]);
  const lowRates = computeCompletionRate(["LOW", "VERY_LOW"]);

  return {
    entries,
    last30,
    average30: last30.length === 0 ? 0 : Number((last30.reduce((sum, entry) => sum + getMoodScore(entry.mood), 0) / last30.length).toFixed(1)),
    mondayPattern: mondayLows.length >= 3 ? "Your last 3 Mondays were all LOW. Pattern: Monday is your hardest day." : "",
    lowRun,
    betterDay,
    medWarning,
    correlationReady,
    strongRates,
    lowRates,
  };
}

export function getOaSimulations() {
  return read<OaSimulationEntry[]>(KEYS.oaSimulations, []).sort((a, b) => b.startedAt - a.startedAt);
}

export function createOaSimulation(company: OaCompany, phase: OaPhase) {
  const problems = OA_BANK[phase];
  return {
    id: crypto.randomUUID(),
    date: getTodayKey(),
    company,
    phase,
    problems,
    answers: new Array(problems.length).fill(""),
    startedAt: Date.now(),
  };
}

export function saveOaSimulation(entry: OaSimulationEntry) {
  const all = getOaSimulations();
  all.unshift(entry);
  write(KEYS.oaSimulations, all);
  emitChange();
}

export function evaluateOaResult(answers: string[]) {
  const evaluated = answers.map((answer, index) => {
    const normalized = answer.toLowerCase();
    const looksCorrect =
      normalized.includes("hash") ||
      normalized.includes("map") ||
      normalized.includes("dfs") ||
      normalized.includes("heap") ||
      normalized.includes("queue") ||
      normalized.includes("sort") ||
      normalized.includes("time complexity");
    return looksCorrect
      ? `Problem ${index + 1}: Submitted ✓ (approach looks correct)`
      : `Problem ${index + 1}: Submitted ✓ (needs tighter explanation)`;
  });
  const strongCount = evaluated.filter((line) => line.includes("looks correct")).length;
  const pass = strongCount >= Math.ceil(answers.length / 2);
  return {
    pass,
    resultLabel: pass ? ("PASS" as const) : ("FAIL" as const),
    feedback: evaluated,
  };
}

export function getOaReadiness() {
  const all = getOaSimulations();
  if (all.length === 0) return 0;
  const passRate = all.filter((entry) => entry.pass).length / all.length;
  const avgBuffer =
    all.reduce((sum, entry) => sum + Math.max(0, 90 - entry.minutesUsed), 0) / all.length;
  return Math.max(0, Math.min(100, Math.round(passRate * 70 + Math.min(30, avgBuffer))));
}

export function getLinkedInState() {
  const state = read<LinkedInState>(KEYS.linkedin, DEFAULT_LINKEDIN);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.linkedin)) {
    write(KEYS.linkedin, state);
  }
  return state;
}

export function saveLinkedInState(next: LinkedInState) {
  write(KEYS.linkedin, next);
  emitChange();
}

export function toggleLinkedInCheck(id: string) {
  const state = getLinkedInState();
  saveLinkedInState({
    ...state,
    checks: { ...state.checks, [id]: !state.checks[id] },
  });
}

export function saveLinkedInConnections(value: number) {
  const state = getLinkedInState();
  saveLinkedInState({ ...state, currentConnections: Math.max(0, value) });
}

export function getLinkedInSummary() {
  const state = getLinkedInState();
  const growth = read<ConnectionGrowthEntry[]>(KEYS.connectionGrowth, []);
  const done = Object.values(state.checks).filter(Boolean).length;
  return {
    state,
    growth,
    done,
    total: LINKEDIN_CHECKS.length,
    pct: Math.round((done / LINKEDIN_CHECKS.length) * 100),
    scoreText: `Your LinkedIn is ${Math.round((done / LINKEDIN_CHECKS.length) * 100)}% recruiter-ready.`,
    next500Weeks:
      growth.length >= 2
        ? Math.max(
            0,
            Math.ceil((500 - state.currentConnections) / Math.max(1, growth[growth.length - 1].connections - growth[growth.length - 2].connections)),
          )
        : null,
  };
}

export function addConnectionGrowthEntry(entry: ConnectionGrowthEntry) {
  const all = read<ConnectionGrowthEntry[]>(KEYS.connectionGrowth, []).filter((item) => item.weekLabel !== entry.weekLabel);
  all.push(entry);
  write(KEYS.connectionGrowth, all);
  emitChange();
}

export function getInternshipApplications() {
  return read<InternshipApplication[]>(KEYS.internshipApplications, []).sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
}

export function saveInternshipApplication(application: InternshipApplication) {
  const all = getInternshipApplications();
  const index = all.findIndex((item) => item.id === application.id);
  if (index >= 0) {
    all[index] = application;
  } else {
    all.push(application);
  }
  write(KEYS.internshipApplications, all);
  emitChange();
}

export function getInternshipSummary() {
  const applications = getInternshipApplications();
  const today = new Date(`${getTodayKey()}T00:00:00`);
  const deadline = new Date("2026-06-30T00:00:00");
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000));
  const lc = getLeetCodeCount();
  const projects = getProjects().filter((project) => project.status !== "ABANDONED").length;
  const weeklyCount = applications.filter((application) => {
    const applied = new Date(`${application.appliedDate}T00:00:00`);
    return today.getTime() - applied.getTime() <= 6 * 86400000;
  }).length;
  return {
    applications,
    daysRemaining,
    lc,
    projects,
    weeklyCount,
    readiness: {
      tier2Ready: lc >= 50 && projects >= 2,
      lcGap: Math.max(0, 50 - lc),
      projectGap: Math.max(0, 2 - projects),
      resumeReady: false,
    },
  };
}

export function getWeeklyLinkedInTask() {
  const weekNumber = (new Date().getDate() % 4) + 1;
  if (weekNumber === 1) return "Write a post about what you learned this week in Python. 3 sentences.";
  if (weekNumber === 2) return "Connect with 10 MVIT alumni at tech companies. Personalize the note.";
  if (weekNumber === 3) return "Comment on 3 posts by engineers at your target companies.";
  return "Update your headline with your latest project.";
}
