"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CATEGORY_COLORS } from "@/lib/types";
import type { HardcodedHabit } from "@/lib/habits";
import ChainCalendar from "@/components/chain/ChainCalendar";

interface HabitRowProps {
  habit: HardcodedHabit;
  streak: { current: number; longest: number };
  isCompleted: boolean;
  onComplete: (habitId: string) => void;
  completions28d: string[];
}

export default function HabitRow({ habit, streak, isCompleted, onComplete, completions28d }: HabitRowProps) {
  const [expanded, setExpanded] = useState(false);

  const color = CATEGORY_COLORS[habit.category];
  const isHot = streak.current >= 7;
  const currentHour = new Date().getHours();
  const isAtRisk = !isCompleted && streak.current > 0 && currentHour >= 19;

  return (
    <div
      className={`border-b border-[#1a1a1a] ${habit.is_critical ? "border-l-2" : ""} ${isAtRisk ? "at-risk-pulse" : ""}`}
      style={{ borderLeftColor: habit.is_critical ? CATEGORY_COLORS.MEDICAL : "transparent" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => !isCompleted && onComplete(habit.id)}
          disabled={isCompleted}
          className={`w-5 h-5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isCompleted ? "bg-[#1a1a1a] border-[#2a2a2a]" : "border-[#2a2a2a] hover:border-[#525252]"
          }`}
        >
          {isCompleted && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="text-[10px]"
              style={{ color }}
            >
              ✓
            </motion.span>
          )}
        </button>

        {/* Icon + Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{habit.icon}</span>
            <span className={`text-[12px] truncate ${isCompleted ? "text-[#525252] line-through" : "text-[#e5e5e5]"}`}>
              {habit.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm uppercase font-medium"
              style={{ color, backgroundColor: `${color}15` }}>
              {habit.category}
            </span>
            {habit.is_critical && <span className="text-[8px] tracking-[0.1em] text-[#ef4444] font-bold">CRITICAL</span>}
            {habit.location_required === "LIBRARY" && <span className="text-[8px] text-[#3b82f6]/60">LIBRARY</span>}
            <span className="text-[8px] text-[#525252]">{habit.scheduled_time}</span>
          </div>
        </div>

        {/* XP */}
        <span className="text-[10px] text-[#525252] tabular-nums flex-shrink-0">{habit.xp_value}xp</span>

        {/* Streak */}
        <span className={`text-[11px] font-bold tabular-nums flex-shrink-0 min-w-[28px] text-right ${isHot ? "streak-fire" : ""} ${isAtRisk ? "text-[#ef4444]" : "text-[#525252]"}`}>
          {streak.current > 0 ? `${streak.current}d` : "—"}
        </span>

        {/* Expand */}
        <button onClick={() => setExpanded(!expanded)} className="text-[#525252] hover:text-[#737373] transition-colors text-xs flex-shrink-0">
          {expanded ? "▾" : "▸"}
        </button>
      </div>

      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.2 }} className="px-4 pb-3">
          <ChainCalendar category={habit.category} completedDates={completions28d} currentStreak={streak.current} longestStreak={streak.longest} />
        </motion.div>
      )}
    </div>
  );
}
