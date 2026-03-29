"use client";

import { useMemo } from "react";
import type { HabitCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";

interface ChainCalendarProps {
  category: HabitCategory;
  completedDates: string[]; // ISO date strings
  currentStreak: number;
  longestStreak: number;
}

export default function ChainCalendar({
  category,
  completedDates,
  currentStreak,
  longestStreak,
}: ChainCalendarProps) {
  const color = CATEGORY_COLORS[category];
  const completedSet = useMemo(() => new Set(completedDates), [completedDates]);

  // Generate last 28 days
  const days = useMemo(() => {
    const result: { date: string; label: string; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      result.push({
        date: iso,
        label: d.getDate().toString(),
        isToday: i === 0,
      });
    }
    return result;
  }, []);

  return (
    <div>
      {/* 28-day grid: 7 columns x 4 rows */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isCompleted = completedSet.has(day.date);
          return (
            <div
              key={day.date}
              className={`aspect-square flex items-center justify-center rounded-sm text-[8px] tabular-nums transition-all ${
                day.isToday
                  ? "ring-1 ring-[#525252]"
                  : ""
              }`}
              style={{
                backgroundColor: isCompleted ? `${color}30` : "#0d0d0d",
                color: isCompleted ? color : "#2a2a2a",
                animationDelay: `${idx * 50}ms`,
              }}
            >
              {day.label}
            </div>
          );
        })}
      </div>
      {/* Stats below */}
      <div className="flex items-center gap-4 mt-2 text-[9px] text-[#525252]">
        <span>
          Current: <span className="text-[#e5e5e5]">{currentStreak}d</span>
        </span>
        <span>
          Best: <span className="text-[#fbbf24]">{longestStreak}d</span>
        </span>
      </div>
    </div>
  );
}
