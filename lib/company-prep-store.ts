import { getDaysToPlacement } from "./constants";
import { getLCProblems } from "./lc-store";
import { getProfileMeta, getTodayKey } from "./momentum";
import { getLeetCodeCount } from "./store";

const KEYS = {
  companyPrep: "momentum_company_prep",
} as const;

export type CompanyId = "AMAZON" | "MICROSOFT" | "APPLE" | "FLIPKART" | "WALMART";

export interface StoryReview {
  text: string;
  feedback: string;
  updatedAt: string;
}

export interface CompanyPrepEntry {
  companyId: CompanyId;
  lpNotes: Record<string, string>;
  starStories: StoryReview[];
}

export interface CompanyDefinition {
  id: CompanyId;
  name: string;
  accent: string;
  referralDate: string;
  interviewStyle: string[];
  whatTheyWant: string;
  intelligence: string[];
  leadershipPrinciples?: string[];
  storySlots: string[];
}

export const COMPANY_DEFINITIONS: CompanyDefinition[] = [
  {
    id: "AMAZON",
    name: "Amazon",
    accent: "#FF9900",
    referralDate: "2026-10-01",
    interviewStyle: [
      "Heavy behavioral (Leadership Principles)",
      "2 coding rounds, 1 system design",
      "Bar Raiser round",
    ],
    whatTheyWant: "Ownership mentality. Show you drove results independently. Use STAR with quantified outcomes every time.",
    intelligence: [
      "16 Leadership Principles — must know all",
      "Behavioral is 60% of the decision",
      "Coding: medium difficulty, 45 min each",
      "System design: distributed systems focus",
      "Bar Raiser will push you to your limit",
      "Key: Every answer must have NUMBERS",
    ],
    leadershipPrinciples: [
      "Customer Obsession",
      "Ownership",
      "Invent and Simplify",
      "Are Right, A Lot",
      "Learn and Be Curious",
      "Hire and Develop the Best",
      "Insist on the Highest Standards",
      "Think Big",
      "Bias for Action",
      "Frugality",
      "Earn Trust",
      "Dive Deep",
      "Have Backbone; Disagree and Commit",
      "Deliver Results",
      "Strive to be Earth’s Best Employer",
      "Success and Scale Bring Broad Responsibility",
    ],
    storySlots: ["My strongest Amazon LP story", "Ownership story", "Failure story", "Conflict story", "Bar raiser story"],
  },
  {
    id: "MICROSOFT",
    name: "Microsoft",
    accent: "#00BCF2",
    referralDate: "2026-10-01",
    interviewStyle: [
      "Culture fit is paramount",
      "Coding similar to Amazon but less brutal",
      "Azure-flavored system design",
    ],
    whatTheyWant: "Show curiosity, learning ability, and a growth mindset in both technical and behavioral answers.",
    intelligence: [
      "Culture fit is paramount ('growth mindset')",
      "Coding: similar to Amazon but less brutal",
      "System design: Azure-focused questions",
      "Behavioral opener often asks about failure",
      "Key: Show curiosity and learning ability",
    ],
    storySlots: ["Growth mindset story", "Failure story", "Collaboration story", "Curiosity story", "Customer impact story"],
  },
  {
    id: "APPLE",
    name: "Apple",
    accent: "#A2AAAD",
    referralDate: "2026-10-01",
    interviewStyle: [
      "Most secretive and unpredictable process",
      "Deeply technical",
      "Less behavioral than Amazon",
    ],
    whatTheyWant: "Demonstrate precision, CS fundamentals, privacy awareness, and quality obsession.",
    intelligence: [
      "Most secretive + unpredictable process",
      "Deeply technical — they test CS fundamentals",
      "Less behavioral than Amazon",
      "Values: privacy, design, quality obsession",
      "Key: Demonstrate attention to detail",
    ],
    storySlots: ["Quality obsession story", "Deep technical story", "Attention to detail story"],
  },
  {
    id: "FLIPKART",
    name: "Flipkart",
    accent: "#2874F0",
    referralDate: "2026-10-01",
    interviewStyle: [
      "Strong DSA focus",
      "System design for India scale",
      "Ownership plus speed",
    ],
    whatTheyWant: "Show that you can build practical systems that work at India-scale constraints.",
    intelligence: [
      "Indian market focus — e-commerce context",
      "Strong DSA focus (NeetCode 150 sufficient)",
      "System design: scalability for India scale",
      "Culture: ownership + speed",
      "Key: Show you can build at scale for India",
    ],
    storySlots: ["India scale story", "Ownership story", "Speed under pressure story"],
  },
  {
    id: "WALMART",
    name: "Walmart",
    accent: "#0071CE",
    referralDate: "2026-10-01",
    interviewStyle: [
      "Serious but less competitive than Amazon",
      "Full-stack skills valued",
      "Retail and supply chain context",
    ],
    whatTheyWant: "Show a practical shipping mindset and the ability to build reliable software for real business constraints.",
    intelligence: [
      "Less competitive than Amazon but serious",
      "Full-stack skills valued highly",
      "System design: retail/supply chain context",
      "Key: Show practical, shipping mindset",
    ],
    storySlots: ["Shipping mindset story", "Full-stack story", "Practical tradeoff story"],
  },
];

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

function emptyEntry(companyId: CompanyId): CompanyPrepEntry {
  const definition = COMPANY_DEFINITIONS.find((item) => item.id === companyId)!;
  return {
    companyId,
    lpNotes: Object.fromEntries((definition.leadershipPrinciples ?? []).map((lp) => [lp, ""])),
    starStories: definition.storySlots.map(() => ({ text: "", feedback: "", updatedAt: "" })),
  };
}

export function getCompanyPrepEntries() {
  const current = read<Record<CompanyId, CompanyPrepEntry>>(
    KEYS.companyPrep,
    {} as Record<CompanyId, CompanyPrepEntry>,
  );
  let changed = false;
  for (const definition of COMPANY_DEFINITIONS) {
    if (!current[definition.id]) {
      current[definition.id] = emptyEntry(definition.id);
      changed = true;
    }
  }
  if (changed) write(KEYS.companyPrep, current);
  return current;
}

export function saveCompanyPrepEntry(entry: CompanyPrepEntry) {
  const all = getCompanyPrepEntries();
  all[entry.companyId] = entry;
  write(KEYS.companyPrep, all);
  emitChange();
}

export function updateCompanyStory(companyId: CompanyId, index: number, text: string, feedback?: string) {
  const current = getCompanyPrepEntries()[companyId];
  const nextStories = [...current.starStories];
  nextStories[index] = {
    text,
    feedback: feedback ?? nextStories[index]?.feedback ?? "",
    updatedAt: new Date().toISOString(),
  };
  saveCompanyPrepEntry({ ...current, starStories: nextStories });
}

export function updateCompanyLPNote(companyId: CompanyId, principle: string, note: string) {
  const current = getCompanyPrepEntries()[companyId];
  saveCompanyPrepEntry({
    ...current,
    lpNotes: {
      ...current.lpNotes,
      [principle]: note,
    },
  });
}

function getAmazonTaggedCount() {
  return getLCProblems().filter((problem) => problem.company.toLowerCase().includes("amazon")).length;
}

function getCountdownDays(referralDate: string) {
  const today = new Date(`${getTodayKey()}T00:00:00`).getTime();
  const target = new Date(`${referralDate}T00:00:00`).getTime();
  return Math.max(0, Math.ceil((target - today) / 86400000));
}

export function getCompanyPrepCards() {
  const entries = getCompanyPrepEntries();
  const lcCount = getLeetCodeCount();
  const profile = getProfileMeta();
  const amazonTagged = getAmazonTaggedCount();

  return COMPANY_DEFINITIONS.map((definition) => {
    const entry = entries[definition.id];
    const lpPrepared = Object.values(entry.lpNotes).filter((value) => value.trim().length > 0).length;
    const storyPrepared = entry.starStories.filter((story) => story.text.trim().length > 0).length;
    const systemDesignReady = lcCount >= 150;
    const readiness = Math.min(
      100,
      Math.round(
        (
          Math.min(lcCount / 300, 1) * 0.45 +
          Math.min(profile.projects / 5, 1) * 0.2 +
          Math.min(lpPrepared / Math.max(1, definition.leadershipPrinciples?.length ?? 5), 1) * 0.2 +
          Math.min(storyPrepared / Math.max(1, definition.storySlots.length), 1) * 0.15
        ) * 100,
      ),
    );
    return {
      ...definition,
      entry,
      prep: {
        lcDone: definition.id === "AMAZON" ? amazonTagged : lcCount,
        lcTarget: definition.id === "AMAZON" ? 50 : 300,
        lpPrepared,
        lpTarget: definition.leadershipPrinciples?.length ?? 0,
        storyPrepared,
        storyTarget: definition.storySlots.length,
        systemDesign: systemDesignReady ? "In progress" : "Not started",
      },
      countdownDays: getCountdownDays(definition.referralDate),
      unlockStatus: lcCount >= 300 && profile.projects >= 5 ? "UNLOCKING SOON" : `Referral unlocks in ${Math.max(0, getDaysToPlacement() - 277)} days`,
      readiness,
    };
  });
}
