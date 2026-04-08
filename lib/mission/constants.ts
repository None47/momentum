export const MISSION_DAY_ONE = "2026-03-23";
export const MISSION_TOTAL_DAYS = 577;

// Day 1 is March 23, 2026. Day 577 lands on October 20, 2027.
export const PLACEMENT_TARGET_DATE = "2027-10-20";

export const PHASES = [
  { phase: 1, label: "FOUNDATION", startDay: 1, endDay: 99 },
  { phase: 2, label: "SKILL BUILD", startDay: 100, endDay: 283 },
  { phase: 3, label: "PEAK PREP", startDay: 284, endDay: 435 },
  { phase: 4, label: "APPLICATION BLITZ", startDay: 436, endDay: MISSION_TOTAL_DAYS },
] as const;

export const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";
