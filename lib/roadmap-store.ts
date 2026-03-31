// ============================================================
// MOMENTUM — Roadmap localStorage Store
// Persists topic status, subtopic completion, LC completion, notes
// ============================================================

import type { TopicStatus } from "./roadmap-data";

const KEYS = {
  topicStatus: "momentum_roadmap_status",      // Record<topicId, TopicStatus>
  subtopicDone: "momentum_roadmap_subtopics",   // Record<topicId, boolean[]>
  lcDone: "momentum_roadmap_lc",                // Record<topicId, boolean[]>
  notes: "momentum_roadmap_notes",              // Record<topicId, string>
  lcCounter: "momentum_roadmap_lc_counter",     // { easy: number, medium: number, hard: number }
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function filled(count: number, value: boolean): boolean[] {
  return new Array(count).fill(value);
}

// ── Topic Status ──────────────────────────────────────────
export function getTopicStatus(topicId: string): TopicStatus {
  const all = read<Record<string, TopicStatus>>(KEYS.topicStatus, {});
  return all[topicId] || "NOT_STARTED";
}

export function setTopicStatus(topicId: string, status: TopicStatus): void {
  const all = read<Record<string, TopicStatus>>(KEYS.topicStatus, {});
  all[topicId] = status;
  write(KEYS.topicStatus, all);
}

export function getAllTopicStatuses(): Record<string, TopicStatus> {
  return read<Record<string, TopicStatus>>(KEYS.topicStatus, {});
}

// ── Subtopics ─────────────────────────────────────────────
export function getSubtopicsDone(topicId: string, count: number): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.subtopicDone, {});
  return all[topicId] || new Array(count).fill(false);
}

export function toggleSubtopic(topicId: string, index: number, count: number): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.subtopicDone, {});
  if (!all[topicId]) all[topicId] = new Array(count).fill(false);
  all[topicId][index] = !all[topicId][index];
  write(KEYS.subtopicDone, all);
  return all[topicId];
}

export function setSubtopicState(topicId: string, index: number, count: number, done: boolean): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.subtopicDone, {});
  if (!all[topicId]) all[topicId] = filled(count, false);
  all[topicId][index] = done;
  write(KEYS.subtopicDone, all);
  return all[topicId];
}

export function setAllSubtopicsDone(topicId: string, count: number, done: boolean): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.subtopicDone, {});
  all[topicId] = filled(count, done);
  write(KEYS.subtopicDone, all);
  return all[topicId];
}

// ── LeetCode per-topic ────────────────────────────────────
export function getLCDone(topicId: string, count: number): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.lcDone, {});
  return all[topicId] || new Array(count).fill(false);
}

export function toggleLC(topicId: string, index: number, count: number): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.lcDone, {});
  if (!all[topicId]) all[topicId] = new Array(count).fill(false);
  all[topicId][index] = !all[topicId][index];
  write(KEYS.lcDone, all);
  return all[topicId];
}

export function setLCState(topicId: string, index: number, count: number, done: boolean): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.lcDone, {});
  if (!all[topicId]) all[topicId] = filled(count, false);
  all[topicId][index] = done;
  write(KEYS.lcDone, all);
  return all[topicId];
}

export function setAllLCDone(topicId: string, count: number, done: boolean): boolean[] {
  const all = read<Record<string, boolean[]>>(KEYS.lcDone, {});
  all[topicId] = filled(count, done);
  write(KEYS.lcDone, all);
  return all[topicId];
}

// ── Notes ─────────────────────────────────────────────────
export function getTopicNotes(topicId: string): string {
  const all = read<Record<string, string>>(KEYS.notes, {});
  return all[topicId] || "";
}

export function setTopicNotes(topicId: string, text: string): void {
  const all = read<Record<string, string>>(KEYS.notes, {});
  all[topicId] = text;
  write(KEYS.notes, all);
}

export function markTopicComplete(topicId: string, subtopicCount: number, lcCount: number): void {
  setTopicStatus(topicId, "DONE");
  setAllSubtopicsDone(topicId, subtopicCount, true);
  setAllLCDone(topicId, lcCount, true);
}

// ── Global LC Counter ─────────────────────────────────────
export interface LCCounter { easy: number; medium: number; hard: number; }

export function getLCCounter(): LCCounter {
  return read<LCCounter>(KEYS.lcCounter, { easy: 0, medium: 0, hard: 0 });
}

export function incrementLC(difficulty: "easy" | "medium" | "hard"): LCCounter {
  const c = getLCCounter();
  c[difficulty]++;
  write(KEYS.lcCounter, c);
  return c;
}

export function decrementLC(difficulty: "easy" | "medium" | "hard"): LCCounter {
  const c = getLCCounter();
  if (c[difficulty] > 0) c[difficulty]--;
  write(KEYS.lcCounter, c);
  return c;
}

export function getTotalLC(): number {
  const c = getLCCounter();
  return c.easy + c.medium + c.hard;
}
