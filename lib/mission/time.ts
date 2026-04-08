import { MISSION_DAY_ONE, MISSION_TOTAL_DAYS, PHASES, PLACEMENT_TARGET_DATE } from "./constants";

const DAY_MS = 86_400_000;

function parseDateOnly(input: string): Date {
  return new Date(`${input}T00:00:00+05:30`);
}

function diffInCalendarDays(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toUtc - fromUtc) / DAY_MS);
}

export function getMissionDayNumber(reference = new Date()): number {
  return diffInCalendarDays(parseDateOnly(MISSION_DAY_ONE), reference) + 1;
}

export function getDaysRemaining(reference = new Date()): number {
  return diffInCalendarDays(reference, parseDateOnly(PLACEMENT_TARGET_DATE)) + 1;
}

export function getMissionProgress(reference = new Date()): number {
  const day = Math.min(Math.max(getMissionDayNumber(reference), 1), MISSION_TOTAL_DAYS);
  return day / MISSION_TOTAL_DAYS;
}

export function getMissionPhase(reference = new Date()) {
  const day = getMissionDayNumber(reference);
  return PHASES.find((phase) => day >= phase.startDay && day <= phase.endDay) ?? PHASES[PHASES.length - 1];
}
