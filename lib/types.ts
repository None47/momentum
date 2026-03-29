// ============================================================
// MOMENTUM — TypeScript Interfaces
// Matches Supabase schema exactly
// ============================================================

export type HabitCategory = "MEDICAL" | "BODY" | "GRIND" | "MIND";
export type HabitFrequency = "daily" | "weekdays" | "weekly_sunday";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type BriefType = "morning" | "weekly_oracle" | "streak_alert";

export interface Profile {
  id: string;
  name: string;
  display_name: string;
  momentum_score: number;
  current_phase: number;
  leetcode_count: number;
  cgpa: number | null;
  backlogs_remaining: number;
  active_streak: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  label: string;
  category: HabitCategory;
  icon: string;
  xp_value: number;
  scheduled_time: string | null;
  is_critical: boolean;
  location_required: string;
  frequency: HabitFrequency;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface Completion {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed_at: string;
  xp_earned: number;
  bonus_type: string | null;
  bonus_multiplier: number;
  habits?: Habit;
}

export interface Streak {
  id: string;
  habit_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  grace_days_used: number;
  updated_at: string;
  habits?: Habit;
}

export interface LeetCodeLog {
  id: string;
  user_id: string;
  date: string;
  problems_solved: number;
  difficulty: DifficultyLevel;
  problem_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  raw_text: string;
  ai_expanded_text: string | null;
  mood_score: number;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_number: number;
  year: number;
  habits_completion_pct: number | null;
  leetcode_count: number;
  notes: string | null;
  ai_analysis: string | null;
  mood_score: number | null;
  submitted_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  label: string;
  target_date: string;
  achieved: boolean;
  achieved_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface AIBrief {
  id: string;
  user_id: string;
  date: string;
  brief_text: string;
  brief_type: BriefType;
  generated_at: string;
}

// Variable reward types
export type BonusLabel = "CRITICAL HIT" | "DOUBLE XP" | null;

export interface RewardRoll {
  multiplier: number;
  bonusType: BonusLabel;
  label: string;
  color: string;
}

// Category styling
export const CATEGORY_COLORS: Record<HabitCategory, string> = {
  MEDICAL: "#ef4444",
  BODY: "#f97316",
  GRIND: "#3b82f6",
  MIND: "#a855f7",
};

export const CATEGORY_LABELS: Record<HabitCategory, string> = {
  MEDICAL: "MEDICAL",
  BODY: "BODY",
  GRIND: "GRIND",
  MIND: "MIND",
};

// Mood symbols (not childish emojis)
export const MOOD_SYMBOLS: Record<number, string> = {
  1: "◯",
  2: "◔",
  3: "◑",
  4: "◕",
  5: "●",
};

export const MOOD_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};
