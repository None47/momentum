// ============================================================
// MOMENTUM — Constants
// Day 1 = March 23, 2026. Target = October 31, 2027.
// ============================================================

export const DAY_ONE = new Date("2026-03-23T00:00:00+05:30");
export const TARGET_DATE = new Date("2027-10-31T00:00:00+05:30");
export const TOTAL_DAYS = 577;

export function getDayNumber(): number {
  const now = new Date();
  const diff = now.getTime() - DAY_ONE.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

export function getDaysToPlacement(): number {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
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
  return new Date().toISOString().split("T")[0];
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
    startDate: "2026-03-23",
    endDate: "2026-06-30",
    goals: ["First internship", "100 LeetCode", "3 projects", "All meds consistent"],
  },
  {
    number: 2,
    label: "ACCELERATION",
    startDate: "2026-07-01",
    endDate: "2026-10-31",
    goals: ["Use cousin referrals", "300 LeetCode", "CGPA 7.0+", "Clear backlogs"],
  },
  {
    number: 3,
    label: "DOMINATION",
    startDate: "2026-11-01",
    endDate: "2027-05-31",
    goals: ["400+ LeetCode", "CGPA 7.5+", "600 LC", "Real projects shipping"],
  },
  {
    number: 4,
    label: "PLACEMENT",
    startDate: "2027-06-01",
    endDate: "2027-10-31",
    goals: ["750+ LeetCode total", "₹60L offer", "Finish strong"],
  },
];

export function getCurrentPhase(): Phase {
  const today = new Date().toISOString().split("T")[0];
  for (const phase of PHASES) {
    if (today >= phase.startDate && today <= phase.endDate) {
      return phase;
    }
  }
  return PHASES[0];
}

export function getPhaseProgress(): { daysIn: number; daysTotal: number; pct: number } {
  const phase = getCurrentPhase();
  const start = new Date(phase.startDate).getTime();
  const end = new Date(phase.endDate).getTime();
  const now = new Date().getTime();
  const daysIn = Math.max(0, Math.floor((now - start) / 86400000));
  const daysTotal = Math.floor((end - start) / 86400000);
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
