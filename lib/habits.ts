// ============================================================
// MOMENTUM — Hardcoded Habits
// Goutham's exact 14 daily tasks
// ============================================================

import type { HabitCategory, HabitFrequency } from "./types";

export interface HardcodedHabit {
  id: string;
  label: string;
  category: HabitCategory;
  icon: string;
  xp_value: number;
  scheduled_time: string;
  is_critical: boolean;
  location_required: string;
  frequency: HabitFrequency;
  sort_order: number;
  notes: string | null;
}

export const HABITS: HardcodedHabit[] = [
  // ── MEDICAL (sort 1-5, is_critical = true) ──────────────────
  {
    id: "med-thyronorm",
    label: "Thyronorm 37.5mcg",
    category: "MEDICAL",
    icon: "○",
    xp_value: 50,
    scheduled_time: "5:30 AM",
    is_critical: true,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 1,
    notes: "CRITICAL — empty stomach, no exceptions",
  },
  {
    id: "med-scelepra",
    label: "S-Celepra 10mg",
    category: "MEDICAL",
    icon: "○",
    xp_value: 50,
    scheduled_time: "Breakfast",
    is_critical: true,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 2,
    notes: "CRITICAL — stopped twice before, must never stop again",
  },
  {
    id: "med-neurobion",
    label: "Neurobion Forte",
    category: "MEDICAL",
    icon: "○",
    xp_value: 30,
    scheduled_time: "After lunch",
    is_critical: true,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 3,
    notes: null,
  },
  {
    id: "med-amigold",
    label: "Amigold 100mg",
    category: "MEDICAL",
    icon: "○",
    xp_value: 30,
    scheduled_time: "9:00 PM",
    is_critical: true,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 4,
    notes: null,
  },
  {
    id: "med-vitamind",
    label: "Vitamin D 60,000 IU",
    category: "MEDICAL",
    icon: "○",
    xp_value: 50,
    scheduled_time: "Sunday",
    is_critical: true,
    location_required: "ANYWHERE",
    frequency: "weekly_sunday",
    sort_order: 5,
    notes: null,
  },

  // ── BODY (sort 6-9) ─────────────────────────────────────────
  {
    id: "body-gym",
    label: "Gym (1 hour)",
    category: "BODY",
    icon: "◆",
    xp_value: 80,
    scheduled_time: "5:40 AM",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "weekdays",
    sort_order: 6,
    notes: "4-5x per week",
  },
  {
    id: "body-water",
    label: "Drink 3L water",
    category: "BODY",
    icon: "◇",
    xp_value: 40,
    scheduled_time: "All day",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 7,
    notes: null,
  },
  {
    id: "body-calories",
    label: "Eat 2,200+ calories",
    category: "BODY",
    icon: "▤",
    xp_value: 60,
    scheduled_time: "All day",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 8,
    notes: "Was eating only 1670 — this needs to go up",
  },
  {
    id: "body-sleep",
    label: "Sleep 7.5 hours",
    category: "BODY",
    icon: "◉",
    xp_value: 70,
    scheduled_time: "10:00 PM",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 9,
    notes: null,
  },

  // ── GRIND (sort 10-12) ──────────────────────────────────────
  {
    id: "grind-coding",
    label: "2 hours coding/building",
    category: "GRIND",
    icon: "▸",
    xp_value: 100,
    scheduled_time: "3:30 PM",
    is_critical: false,
    location_required: "LIBRARY",
    frequency: "daily",
    sort_order: 10,
    notes: "LIBRARY ONLY — not hostel room",
  },
  {
    id: "grind-leetcode",
    label: "LeetCode (2 problems min)",
    category: "GRIND",
    icon: "◈",
    xp_value: 80,
    scheduled_time: "6:00 PM",
    is_critical: false,
    location_required: "LIBRARY",
    frequency: "daily",
    sort_order: 11,
    notes: "LIBRARY ONLY",
  },
  {
    id: "grind-attendance",
    label: "College attendance",
    category: "GRIND",
    icon: "▣",
    xp_value: 30,
    scheduled_time: "8:30 AM",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "weekdays",
    sort_order: 12,
    notes: null,
  },

  // ── MIND (sort 13-14) ──────────────────────────────────────
  {
    id: "mind-noinstagram",
    label: "No Instagram (full day)",
    category: "MIND",
    icon: "△",
    xp_value: 60,
    scheduled_time: "All day",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 13,
    notes: "Track the streak — goal is deletion",
  },
  {
    id: "mind-journal",
    label: "Journal entry",
    category: "MIND",
    icon: "●",
    xp_value: 40,
    scheduled_time: "9:30 PM",
    is_critical: false,
    location_required: "ANYWHERE",
    frequency: "daily",
    sort_order: 14,
    notes: null,
  },
];
