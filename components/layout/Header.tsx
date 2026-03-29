"use client";

import { getDayNumber, TOTAL_DAYS } from "@/lib/constants";

interface HeaderProps {
  score: number;
}

export default function Header({ score }: HeaderProps) {
  const dayNumber = getDayNumber();
  const isHighScore = score >= 500;

  return (
    <header
      className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.2em] text-[#737373] uppercase day-flash">
            Day {dayNumber} / {TOTAL_DAYS}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs tracking-[0.4em] font-bold text-[#e5e5e5]">
            MOMENTUM
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold tabular-nums ${isHighScore ? "gold-glow" : "text-[#fbbf24]"}`}>
            {score.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#92710d] tracking-wider">₹60L</span>
        </div>
      </div>
    </header>
  );
}
