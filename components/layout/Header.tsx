"use client";

import { useEffect, useState } from "react";
import { getDayNumber, TOTAL_DAYS } from "@/lib/constants";
import { getScore } from "@/lib/store";

export default function Header() {
  const [score, setScore] = useState(0);
  const dayNumber = getDayNumber();
  const isHighScore = score >= 500;

  useEffect(() => {
    const sync = () => setScore(getScore());
    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/7 bg-[#060606]/96 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <span className="day-flash text-[11px] font-medium tracking-[0.2em] text-white/55 uppercase">
            DAY {dayNumber} / {TOTAL_DAYS}
          </span>
        </div>
        <div className="shrink-0 text-center">
          <span className="text-[12px] font-bold tracking-[0.36em] text-[#e5e5e5]">
            MOMENTUM
          </span>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <span className={`text-[14px] font-bold tabular-nums ${isHighScore ? "gold-glow" : "text-[#fbbf24]"}`}>
            {score.toLocaleString()}
          </span>
          <span className="ml-2 text-[11px] tracking-[0.18em] text-[#fbbf24]">₹60L</span>
        </div>
      </div>
    </header>
  );
}
