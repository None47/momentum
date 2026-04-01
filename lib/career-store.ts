import { getDayNumber, TARGET_DATE } from "./constants";
import { getLCStats } from "./lc-store";
import {
  CORE_HABIT_IDS,
  addDays,
  areAllCoreHabitsDone,
  getCurrentHabitStreak,
  getProfileMeta,
  getTodayKey,
  getTotalCompletedForHabit,
  isHabitDoneOnDate,
} from "./momentum";
import { ROADMAP_TOPICS } from "./roadmap-data";
import { getAllTopicStatuses } from "./roadmap-store";
import { getLeetCodeCount } from "./store";

const KEYS = {
  identityStatement: "momentum_identity_statement",
  contacts: "momentum_network_contacts",
  projects: "momentum_projects",
  accountability: "momentum_accountability",
  progressLetter: "momentum_progress_letter",
  notificationSettings: "momentum_notification_settings",
  resumeVersions: "momentum_resume_versions",
} as const;

export type RelationshipStrength = 1 | 2 | 3 | 4 | 5;
export type ProjectStatus = "IN_PROGRESS" | "COMPLETE" | "ABANDONED";
export type ResumeTone = "AMAZON" | "MICROSOFT" | "STARTUP";

export interface NetworkContact {
  id: string;
  name: string;
  company: string;
  role: string;
  linkedinUrl: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  relationshipStrength: RelationshipStrength;
  notes: string;
  context: string;
  response: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  status: ProjectStatus;
  stack: string;
  githubUrl: string;
  liveUrl: string;
  oneLiner: string;
  impressiveFacts: string[];
  resumeBullet: string;
  qualityRating: number;
  qualityFeedback: string;
}

export interface AccountabilityEntry {
  date: string;
  gym: boolean | null;
  coding: boolean | null;
  leetcode: boolean | null;
  reason: string;
  submittedAt: number;
}

export interface ProgressLetterUpdate {
  id: string;
  label: string;
  date: string;
  text: string;
}

export interface ProgressLetter {
  baseText: string;
  updates: ProgressLetterUpdate[];
}

export interface NotificationSettings {
  enabled: boolean;
  quietStart: string;
  quietEnd: string;
  sent: Record<string, string[]>;
}

export interface ResumeVersion {
  id: string;
  name: string;
  tone: ResumeTone;
  emphasis: string;
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

const DEFAULT_IDENTITY_STATEMENT = `I am becoming a software engineer who gets paid ₹60L by October 2027.
I am from a tier-3 college and I will outwork everyone with better resources.
Every problem I solve is proof.`;

const DEFAULT_CONTACTS: NetworkContact[] = [
  {
    id: "cousin-referrals",
    name: "Cousin",
    company: "Apple / Microsoft / Amazon / Flipkart / Walmart",
    role: "Referral bridge",
    linkedinUrl: "",
    lastContactDate: "2026-03-25",
    nextFollowUpDate: "2026-04-24",
    relationshipStrength: 5,
    notes: "Has referrals for Oct 2026",
    context: "Warm referral path if progress is visible",
    response: "Warm",
  },
  {
    id: "saurabh-mvit",
    name: "Saurabh Kumar Singh",
    company: "Amazon",
    role: "SDE, Kindle team",
    linkedinUrl: "https://linkedin.com/in/sau1606",
    lastContactDate: "2026-03-12",
    nextFollowUpDate: "2026-04-11",
    relationshipStrength: 3,
    notes: "Amazon SDE, Kindle team, ₹40L+",
    context: "Same college proof it's possible",
    response: "Waiting",
  },
];

const DEFAULT_PROJECTS: ProjectEntry[] = [
  {
    id: "project-momentum",
    name: "MOMENTUM — Personal Life OS",
    status: "IN_PROGRESS",
    stack: "Next.js · Supabase · Claude API",
    githubUrl: "github.com/goutham/momentum",
    liveUrl: "momentum.vercel.app",
    oneLiner: "577-day habit tracker with AI coach built for ₹60L job goal",
    impressiveFacts: [
      "AI integration via Claude API",
      "Real-time sync across devices",
      "Full-stack: Next.js + Supabase",
    ],
    resumeBullet:
      "Built full-stack habit tracker with AI coaching, real-time sync across web and iOS, serving 1 active user.",
    qualityRating: 4,
    qualityFeedback:
      "Strong personal differentiation. To push it higher, add tests, auth, and usage metrics recruiters can point to.",
  },
];

const DEFAULT_RESUME_VERSIONS: ResumeVersion[] = [
  { id: "amazon", name: "Amazon version", tone: "AMAZON", emphasis: "Emphasize ownership, metrics, systems, and delivery speed." },
  { id: "microsoft", name: "Microsoft version", tone: "MICROSOFT", emphasis: "Emphasize collaboration, product thinking, and engineering craft." },
  { id: "startup", name: "Startup version", tone: "STARTUP", emphasis: "Emphasize full-stack range, speed, and shipping under ambiguity." },
];

const DEFAULT_PROGRESS_LETTER = `To Goutham on October 2027,

You did it. From near-zero coding skills at Sir MVIT to a software engineer earning ₹60L. You started on March 23, 2026 with 0 LeetCode problems and no real coding experience.

You proved that a tier-3 college kid from Hospet can compete with IIT graduates. You proved your family right for believing in you. You used the referrals wisely.

The 577 days were hard. The hostel tried to pull you back. Depression made some days feel impossible. You showed up anyway.

Remember how Day 1 felt? Now look.

— Goutham, March 2026`;

export const ACCOUNTABILITY_REASONS = [
  "Hostel environment got me",
  "Low energy",
  "Depression hit hard",
  "Phone spiral",
  "No plan",
  "Avoided discomfort",
] as const;

export function getIdentityStatement() {
  const value = read<string>(KEYS.identityStatement, DEFAULT_IDENTITY_STATEMENT);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.identityStatement)) {
    write(KEYS.identityStatement, value);
  }
  return value;
}

export function saveIdentityStatement(value: string) {
  write(KEYS.identityStatement, value.trim() || DEFAULT_IDENTITY_STATEMENT);
  emitChange();
}

export function getContacts() {
  const contacts = read<NetworkContact[]>(KEYS.contacts, DEFAULT_CONTACTS);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.contacts)) {
    write(KEYS.contacts, contacts);
  }
  return contacts;
}

export function saveContacts(contacts: NetworkContact[]) {
  write(KEYS.contacts, contacts);
  emitChange();
}

export function upsertContact(contact: NetworkContact) {
  const all = getContacts();
  const index = all.findIndex((item) => item.id === contact.id);
  if (index >= 0) {
    all[index] = contact;
  } else {
    all.push(contact);
  }
  saveContacts(all);
}

export function getProjects() {
  const projects = read<ProjectEntry[]>(KEYS.projects, DEFAULT_PROJECTS);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.projects)) {
    write(KEYS.projects, projects);
  }
  return projects;
}

export function saveProjects(projects: ProjectEntry[]) {
  write(KEYS.projects, projects);
  emitChange();
}

export function upsertProject(project: ProjectEntry) {
  const all = getProjects();
  const index = all.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    all[index] = project;
  } else {
    all.push(project);
  }
  saveProjects(all);
}

export function getResumeVersions() {
  const versions = read<ResumeVersion[]>(KEYS.resumeVersions, DEFAULT_RESUME_VERSIONS);
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.resumeVersions)) {
    write(KEYS.resumeVersions, versions);
  }
  return versions;
}

export function saveResumeVersions(versions: ResumeVersion[]) {
  write(KEYS.resumeVersions, versions);
  emitChange();
}

export function getAccountabilityEntries() {
  return read<AccountabilityEntry[]>(KEYS.accountability, []);
}

export function saveAccountabilityEntry(entry: AccountabilityEntry) {
  const all = getAccountabilityEntries().filter((item) => item.date !== entry.date);
  all.push(entry);
  all.sort((a, b) => a.date.localeCompare(b.date));
  write(KEYS.accountability, all);
  emitChange();
}

export function getTodayAccountabilityEntry() {
  return getAccountabilityEntries().find((item) => item.date === getTodayKey()) ?? null;
}

export function getHonestyStreak() {
  const entries = new Set(getAccountabilityEntries().map((item) => item.date));
  let streak = 0;
  let cursor = getTodayKey();

  while (entries.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function needsAccountabilityCheck(now = new Date()) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour < 21 || (hour === 21 && minute < 30)) return false;
  return !getTodayAccountabilityEntry();
}

function getLastNDates(days: number) {
  const dates: string[] = [];
  let cursor = getTodayKey();
  for (let index = 0; index < days; index += 1) {
    dates.push(cursor);
    cursor = addDays(cursor, -1);
  }
  return dates;
}

function getShowUpStreak() {
  let streak = 0;
  let cursor = getTodayKey();

  while (areAllCoreHabitsDone(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getLastThirtyDayConsistency() {
  const dates = getLastNDates(30);
  const showedUp = dates.filter((date) => areAllCoreHabitsDone(date)).length;
  return Math.round((showedUp / dates.length) * 100);
}

function getProjectCount() {
  return getProjects().filter((project) => project.status !== "ABANDONED").length;
}

function getSkillsProgressScore() {
  const lc = getLeetCodeCount();
  const projects = getProjectCount();
  const roadmapDone = Object.values(getAllTopicStatuses()).filter((status) => status === "DONE").length;
  return Math.round((Math.min(lc / 300, 1) * 45) + (Math.min(projects / 5, 1) * 35) + (Math.min(roadmapDone / 20, 1) * 20));
}

export function getIdentityStats() {
  const gymVotes = getTotalCompletedForHabit("body-gym");
  const codingVotes = getTotalCompletedForHabit("grind-coding");
  const leetcodeVotes = getTotalCompletedForHabit("grind-leetcode");
  const totalVotes = gymVotes + codingVotes + leetcodeVotes;
  const consistencyRate = getLastThirtyDayConsistency();
  const showUpStreak = getShowUpStreak();
  const longestSingleHabitStreak = Math.max(...CORE_HABIT_IDS.map((habitId) => getCurrentHabitStreak(habitId)));
  const skillsProgress = getSkillsProgressScore();
  const score = clamp(
    Math.round(consistencyRate * 0.35 + clamp(showUpStreak * 3, 0, 25) + clamp(totalVotes / 8, 0, 20) + skillsProgress * 0.2),
    0,
    100,
  );

  return {
    statement: getIdentityStatement(),
    totalVotes,
    softwareEngineerVotes: codingVotes + leetcodeVotes + gymVotes,
    disciplinedVotes: totalVotes,
    showUpStreak,
    consistencyRate,
    skillsProgress,
    longestSingleHabitStreak,
    score,
    isMotivationLow: !areAllCoreHabitsDone(addDays(getTodayKey(), -1)) && !areAllCoreHabitsDone(addDays(getTodayKey(), -2)),
  };
}

function daysSince(date: string) {
  const current = new Date(`${getTodayKey()}T00:00:00`).getTime();
  const previous = new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor((current - previous) / 86400000));
}

export function getNetworkSummary() {
  const contacts = getContacts();
  const overdue = contacts
    .map((contact) => {
      const staleDays = daysSince(contact.lastContactDate);
      return {
        ...contact,
        staleDays,
        reminderTone: staleDays >= 60 ? "RED" : staleDays >= 30 ? "AMBER" : "CLEAR",
      } as const;
    })
    .sort((a, b) => b.staleDays - a.staleDays);

  const currentMonth = getTodayKey().slice(0, 7);
  const contactedThisMonth = overdue.filter((contact) => contact.lastContactDate.startsWith(currentMonth)).length;

  return {
    contacts: overdue,
    contactedThisMonth,
    monthlyTarget: 2,
  };
}

export function getWeeklyAccountabilitySummary() {
  const dates = getLastNDates(7);
  const entriesMap = new Map(getAccountabilityEntries().map((item) => [item.date, item] as const));
  const entries = dates.map((date) => entriesMap.get(date)).filter((value): value is AccountabilityEntry => Boolean(value));
  const submitted = entries.length;
  const countTrue = (key: "gym" | "coding" | "leetcode") => entries.filter((entry) => entry[key]).length;
  const reasonCounts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.reason) {
      reasonCounts.set(entry.reason, (reasonCounts.get(entry.reason) ?? 0) + 1);
    }
  }

  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    submitted,
    gym: countTrue("gym"),
    coding: countTrue("coding"),
    leetcode: countTrue("leetcode"),
    topReason: topReason ? { label: topReason[0], count: topReason[1] } : null,
  };
}

export function getProgressLetter() {
  const letter = read<ProgressLetter>(KEYS.progressLetter, { baseText: DEFAULT_PROGRESS_LETTER, updates: [] });
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.progressLetter)) {
    write(KEYS.progressLetter, letter);
  }
  return letter;
}

export function saveProgressLetterBaseText(baseText: string) {
  const current = getProgressLetter();
  write(KEYS.progressLetter, { ...current, baseText: baseText.trim() || DEFAULT_PROGRESS_LETTER });
  emitChange();
}

function buildAutomaticLetterUpdate(label: string) {
  const lc = getLeetCodeCount();
  const codingSessions = getTotalCompletedForHabit("grind-coding");
  const streak = getShowUpStreak();
  return `${label}: You have now solved ${lc} problems and completed ${codingSessions} coding sessions. Your show-up streak is ${streak} days. Keep going.`;
}

export function ensureProgressLetterEntries() {
  const current = getProgressLetter();
  const nextUpdates = [...current.updates];
  const existingIds = new Set(nextUpdates.map((item) => item.id));
  const lc = getLeetCodeCount();
  const day = getDayNumber();

  for (const milestone of [30, 60, 90, 100, 120, 150, 180, 200, 240, 270, 300, 360, 420, 480, 540]) {
    if (day >= milestone) {
      const id = `day-${milestone}`;
      if (!existingIds.has(id)) {
        nextUpdates.push({
          id,
          label: `Day ${milestone}`,
          date: getTodayKey(),
          text:
            milestone === 90 && lc >= 100
              ? "Day 90: You just solved your 100th LeetCode problem. It took 90 days from zero. The next 100 will take less."
              : milestone === 180
                ? "Day 180: You used the referral window only after building proof. You earned the right to ask."
                : buildAutomaticLetterUpdate(`Day ${milestone} update`),
        });
      }
    }
  }

  if (lc >= 100 && !existingIds.has("lc-100")) {
    nextUpdates.push({
      id: "lc-100",
      label: "100 LC",
      date: getTodayKey(),
      text: "Day 90: You just solved your 100th LeetCode problem. It took 90 days from zero. The next 100 will take less.",
    });
  }

  if (JSON.stringify(nextUpdates) !== JSON.stringify(current.updates)) {
    write(KEYS.progressLetter, { ...current, updates: nextUpdates });
    emitChange();
  }
}

export function getNotificationSettings() {
  const settings = read<NotificationSettings>(KEYS.notificationSettings, {
    enabled: true,
    quietStart: "23:00",
    quietEnd: "05:25",
    sent: {},
  });
  if (typeof window !== "undefined" && !window.localStorage.getItem(KEYS.notificationSettings)) {
    write(KEYS.notificationSettings, settings);
  }
  return settings;
}

export function saveNotificationSettings(settings: NotificationSettings) {
  write(KEYS.notificationSettings, settings);
  emitChange();
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isQuietHours(now: Date, settings: NotificationSettings) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(settings.quietStart);
  const end = timeToMinutes(settings.quietEnd);

  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }

  return nowMinutes >= start || nowMinutes < end;
}

export function markNotificationSent(id: string, date = getTodayKey()) {
  const settings = getNotificationSettings();
  const sent = settings.sent[date] ?? [];
  if (sent.includes(id)) return;
  const next = { ...settings, sent: { ...settings.sent, [date]: [...sent, id] } };
  write(KEYS.notificationSettings, next);
  emitChange();
}

function getNotificationsSentToday() {
  return getNotificationSettings().sent[getTodayKey()] ?? [];
}

export interface SmartNotificationPayload {
  id: string;
  title: string;
  body: string;
}

export function getSmartNotificationPayloads(now = new Date()): SmartNotificationPayload[] {
  const settings = getNotificationSettings();
  if (!settings.enabled || isQuietHours(now, settings)) return [];
  const sentToday = getNotificationsSentToday();
  if (sentToday.length >= 3) return [];

  const hour = now.getHours();
  const minute = now.getMinutes();
  const lc = getLeetCodeCount();
  const showUpStreak = getShowUpStreak();
  const payloads: SmartNotificationPayload[] = [];

  const addPayload = (payload: SmartNotificationPayload) => {
    if (!sentToday.includes(payload.id)) {
      payloads.push(payload);
    }
  };

  if (hour === 5 && minute >= 25 && minute < 35) {
    addPayload({ id: "wake-thyronorm", title: "Wake up", body: "Thyronorm in 5 min." });
  }

  if (hour === 15 && minute >= 20 && minute < 30) {
    addPayload({ id: "library-window", title: "Library window", body: "Library window opens in 10 min. Leave the hostel now." });
  }

  if (hour === 20 && minute < 15 && !isHabitDoneOnDate("grind-coding", getTodayKey())) {
    addPayload({
      id: "coding-gap",
      title: "Coding still open",
      body: `2 hours left before midnight. LeetCode: ${lc} total. Target: 300. Gap: ${Math.max(0, 300 - lc)}.`,
    });
  }

  if (hour === 21 && minute < 15 && !isHabitDoneOnDate("grind-leetcode", getTodayKey())) {
    addPayload({ id: "leetcode-gap", title: "One problem", body: "1 problem. 15 minutes. Open leetcode.com right now." });
  }

  if (hour === 22 && minute >= 45 && CORE_HABIT_IDS.some((habitId) => !isHabitDoneOnDate(habitId, getTodayKey()))) {
    const pending = CORE_HABIT_IDS.find((habitId) => !isHabitDoneOnDate(habitId, getTodayKey())) ?? "grind-coding";
    const label = pending === "body-gym" ? "GYM" : pending === "grind-coding" ? "CODING" : "LEETCODE";
    addPayload({ id: "streak-warning", title: "Streak ends soon", body: `${label}: still incomplete. Finish before the day closes.` });
  }

  if (getCurrentHabitStreak("grind-coding") === 0 && !isHabitDoneOnDate("grind-coding", getTodayKey())) {
    const misses = (() => {
      let count = 0;
      let cursor = addDays(getTodayKey(), -1);
      while (!isHabitDoneOnDate("grind-coding", cursor) && count < 7) {
        count += 1;
        cursor = addDays(cursor, -1);
      }
      return count;
    })();

    if (misses >= 2) {
      addPayload({
        id: "coding-missed-2",
        title: `Day ${getDayNumber()} of 577`,
        body: `You haven't coded in ${misses} days. The referral needs 300 LC. You have ${lc}. Open LeetCode. 1 problem. Right now.`,
      });
    }
  }

  if (showUpStreak > 0 && showUpStreak % 7 === 0 && hour >= 6 && hour < 9) {
    addPayload({ id: `showup-${showUpStreak}`, title: `${showUpStreak} day streak`, body: "This is when comfort sets in. Stay alert." });
  }

  if (getDayNumber() === 30 && hour >= 6 && hour < 9) {
    addPayload({ id: "day-30", title: "One month in", body: "Most people quit by now. You're still here. Keep going." });
  }

  if (getDayNumber() === 100 && hour >= 6 && hour < 9) {
    addPayload({
      id: "day-100",
      title: "100 days",
      body: `100 days. ${lc} problems solved. ${getTotalCompletedForHabit("grind-coding")} coding sessions completed. This is working.`,
    });
  }

  if (now.getDay() === 1 && hour === 6 && minute < 20) {
    const weeklyLc = getLCStats().total;
    addPayload({
      id: `weekly-${getTodayKey()}`,
      title: "Weekly target",
      body: `Last week: ${weeklyLc} LC total, ${getTotalCompletedForHabit("body-gym")} gym sessions overall. This week's target: ${Math.min(300, lc + 2)} LC. Referral window in ${Math.max(0, Math.ceil((TARGET_DATE.getTime() - now.getTime()) / 86400000))} days.`,
    });
  }

  return payloads.slice(0, Math.max(0, 3 - sentToday.length));
}

function normalizeStackSkills(projects: ProjectEntry[]) {
  const stackTokens = new Set<string>();
  for (const project of projects) {
    for (const token of project.stack.split(/[·,/]/).map((item) => item.trim()).filter(Boolean)) {
      stackTokens.add(token);
    }
  }
  return stackTokens;
}

export function getResumeSkills() {
  const statuses = getAllTopicStatuses();
  const doneTopics = ROADMAP_TOPICS.filter((topic) => statuses[topic.id] === "DONE");
  const lowerTitles = doneTopics.map((topic) => topic.title.toLowerCase());
  const stackSkills = normalizeStackSkills(getProjects());
  const skills = {
    languages: new Set<string>(["Python", "JavaScript", "TypeScript"]),
    frameworks: new Set<string>(),
    databases: new Set<string>(),
    tools: new Set<string>(["Git"]),
    ai: new Set<string>(),
  };

  for (const title of lowerTitles) {
    if (title.includes("react")) skills.frameworks.add("React");
    if (title.includes("fastapi")) skills.frameworks.add("FastAPI");
    if (title.includes("html") || title.includes("css")) skills.frameworks.add("Next.js");
    if (title.includes("postgres")) skills.databases.add("PostgreSQL");
    if (title.includes("database")) skills.databases.add("Supabase");
    if (title.includes("docker")) skills.tools.add("Docker (basic)");
    if (title.includes("aws")) skills.tools.add("AWS (basic)");
    if (title.includes("rag")) skills.ai.add("RAG");
    if (title.includes("lang")) skills.ai.add("LangChain (basic)");
    if (title.includes("ai agents")) skills.ai.add("Claude API");
  }

  if (stackSkills.has("Next.js")) skills.frameworks.add("Next.js");
  if (stackSkills.has("Supabase")) skills.databases.add("Supabase");
  if (stackSkills.has("Claude API")) skills.ai.add("Claude API");

  return {
    languages: [...skills.languages],
    frameworks: [...skills.frameworks],
    databases: [...skills.databases],
    tools: [...skills.tools],
    ai: [...skills.ai],
  };
}

export function getResumeReadiness() {
  const lcStats = getLCStats();
  const lcTotal = lcStats.total || getLeetCodeCount();
  const projects = getProjects().filter((project) => project.status === "COMPLETE" || project.status === "IN_PROGRESS");
  const completeProjects = projects.filter((project) => project.status === "COMPLETE").length;
  const profile = getProfileMeta();
  const skillCount =
    getResumeSkills().languages.length +
    getResumeSkills().frameworks.length +
    getResumeSkills().databases.length +
    getResumeSkills().tools.length +
    getResumeSkills().ai.length;
  const readiness = clamp(
    Math.round(Math.min(lcTotal / 300, 1) * 35 + Math.min(projects.length / 5, 1) * 35 + Math.min(skillCount / 12, 1) * 20 + Math.min(profile.cgpa / 8, 1) * 10),
    0,
    100,
  );

  const band =
    readiness <= 40
      ? "Not ready to apply"
      : readiness <= 70
        ? "Needs improvement"
        : readiness <= 85
          ? "Ready for referral applications"
          : "Competitive at FAANG level";

  return {
    readiness,
    band,
    lcTotal,
    completeProjects,
    projects: projects.length,
  };
}

export function getProjectTargets() {
  const activeProjects = getProjects().filter((project) => project.status !== "ABANDONED").length;
  const today = getTodayKey();
  const phaseOneTargetReached = today > "2026-06-30";
  const phaseTwoTargetReached = today > "2026-10-31";

  return {
    activeProjects,
    nextTarget: phaseOneTargetReached ? 5 : 3,
    phaseOneTarget: 3,
    phaseTwoTarget: 5,
    phaseOneReached: phaseOneTargetReached,
    phaseTwoReached: phaseTwoTargetReached,
  };
}

function buildProjectBullet(project: ProjectEntry) {
  const stack = project.stack.replaceAll("·", ",");
  const impact = project.status === "COMPLETE" ? "deployed live and ready for interviews" : "used daily as an active portfolio proof";
  return `Built ${project.name} using ${stack} that is ${impact}.`;
}

function buildAchievements() {
  const lcStats = getLCStats();
  const projectCount = getProjects().filter((project) => project.status !== "ABANDONED").length;
  return [
    `Solved ${lcStats.total || getLeetCodeCount()} LeetCode problems (${lcStats.easy} Easy / ${lcStats.medium} Medium / ${lcStats.hard} Hard)`,
    `Built ${projectCount} full-stack projects with live demos or active development`,
  ];
}

export function buildResumePreview(versionId: string) {
  const version = getResumeVersions().find((item) => item.id === versionId) ?? getResumeVersions()[0];
  const profile = getProfileMeta();
  const skills = getResumeSkills();
  const projects = getProjects().slice(0, 4);
  const lines = [
    "GOUTHAM M S",
    "Bangalore, India | mgoutham462@gmail.com",
    "GitHub: github.com/goutham | LinkedIn: /in/goutham",
    "",
    "EDUCATION",
    "B.E. Computer Science Engineering",
    `Sir MVIT, Bangalore | 2024–2028`,
    `CGPA: ${profile.cgpa > 0 ? profile.cgpa.toFixed(1) : "6.5"} / 10`,
    "",
    "SKILLS",
    `Languages: ${skills.languages.join(", ")}`,
    `Frameworks: ${skills.frameworks.join(", ") || "React, Next.js, FastAPI"}`,
    `Databases: ${skills.databases.join(", ") || "PostgreSQL, Supabase"}`,
    `Tools: ${skills.tools.join(", ") || "Git, Docker (basic), AWS (basic)"}`,
    `AI/ML: ${skills.ai.join(", ") || "Claude API, LangChain (basic)"}`,
    "",
    "PROJECTS",
  ];

  for (const project of projects) {
    lines.push(project.name);
    lines.push(project.resumeBullet || buildProjectBullet(project));
    lines.push("");
  }

  lines.push("ACHIEVEMENTS");
  for (const achievement of buildAchievements()) {
    lines.push(`- ${achievement}`);
  }

  lines.push("");
  lines.push("TARGETING");
  lines.push(version.name.toUpperCase());
  lines.push(version.emphasis);

  return lines.join("\n");
}
