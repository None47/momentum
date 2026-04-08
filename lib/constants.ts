// ============================================================
// MOMENTUM — Shared Client Constants
// Canonical mission timeline lives in lib/mission/*
// ============================================================

import {
  MISSION_DAY_ONE,
  MISSION_TOTAL_DAYS as TOTAL_DAYS,
  PLACEMENT_TARGET_DATE,
} from "./mission/constants";
import { getDaysRemaining, getMissionDayNumber, getMissionPhase } from "./mission/time";

export const DAY_ONE = new Date(`${MISSION_DAY_ONE}T00:00:00+05:30`);
export const TARGET_DATE = new Date(`${PLACEMENT_TARGET_DATE}T00:00:00+05:30`);
export { TOTAL_DAYS };

export function getDayNumber(): number {
  return getMissionDayNumber();
}

export function getDaysToPlacement(): number {
  return getDaysRemaining();
}

export function getTimeGreeting(name: string = "Sachi"): string {
  const hour = new Date().getHours();
  if (hour < 5) return `Late night, ${name}.`;
  if (hour < 12) return `Morning, ${name}.`;
  if (hour < 17) return `Afternoon, ${name}.`;
  if (hour < 21) return `Evening, ${name}.`;
  return `Late night, ${name}.`;
}

export function getTodayDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export function getFormattedDate(): string {
  const now = new Date();
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

// Phase definitions
export interface Phase {
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  goals: string[];
}

export const PHASES: Phase[] = [
  {
    number: 1,
    label: "FOUNDATION",
    startDate: MISSION_DAY_ONE,
    endDate: "2026-06-29",
    goals: ["First internship", "100 LeetCode", "3 projects", "All meds consistent"],
  },
  {
    number: 2,
    label: "SKILL BUILD",
    startDate: "2026-06-30",
    endDate: "2026-12-30",
    goals: ["Use cousin referrals", "300 LeetCode", "CGPA 7.0+", "Clear backlogs"],
  },
  {
    number: 3,
    label: "PEAK PREP",
    startDate: "2026-12-31",
    endDate: "2027-05-31",
    goals: ["400+ LeetCode", "CGPA 7.5+", "600 LC", "Real projects shipping"],
  },
  {
    number: 4,
    label: "APPLICATION BLITZ",
    startDate: "2027-06-01",
    endDate: PLACEMENT_TARGET_DATE,
    goals: ["750+ LeetCode total", "₹60L offer", "Finish strong"],
  },
];

export function getCurrentPhase(): Phase {
  const missionPhase = getMissionPhase();
  return PHASES.find((phase) => phase.number === missionPhase.phase) ?? PHASES[0];
}

export function getPhaseProgress(): { daysIn: number; daysTotal: number; pct: number } {
  const phase = getMissionPhase();
  const daysIn = Math.max(0, getDayNumber() - phase.startDay);
  const daysTotal = phase.endDay - phase.startDay + 1;
  const pct = Math.min(100, Math.round((daysIn / daysTotal) * 100));
  return { daysIn, daysTotal, pct };
}

// Motivational quotes — rotating, no-BS
export const QUOTES: string[] = [
  "The library is where champions are built. Not the hostel room.",
  "577 days. Every one of them matters. This one most of all.",
  "Your cousins gave you referrals. Don't waste them.",
  "Depression is real. Skipping meds makes it worse. Take them.",
  "1.5 years of start-stop ends now. This streak is different.",
  "₹60 LPA doesn't come to people who open Instagram at 3 PM.",
  "The peer pressure ends the moment you walk into the library.",
  "You were eating 1670 calories. That's not fuel. That's survival.",
  "Hypothyroidism makes everything harder. Thyronorm makes it possible.",
  "Two LeetCode problems. Not one. Two. Then you earn the rest of the day.",
  "Three backlogs cleared. CGPA 7.5. That's the floor, not the ceiling.",
  "S-Celepra keeps your brain chemistry stable. Never skip it again.",
  "Apple. Microsoft. Amazon. Flipkart. Walmart. The referrals are waiting.",
  "You don't need motivation. You need the library door open at 3:30 PM.",
];
