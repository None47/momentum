"use client";

import { getCurrentPhase, getPhaseProgress } from "@/lib/constants";

export default function PhaseIndicator() {
  const phase = getCurrentPhase();
  const { daysIn, daysTotal, pct } = getPhaseProgress();

  return (
    <div className="border-b border-[#1a1a1a] bg-[#0d0d0d]/50">
      <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.15em] text-[#3b82f6] font-medium">
          PHASE {phase.number}: {phase.label}
        </span>
        <span className="text-[10px] text-[#525252]">
          Day {daysIn}/{daysTotal} · {pct}%
        </span>
      </div>
      {/* Thin phase progress bar */}
      <div className="h-[2px] bg-[#1a1a1a]">
        <div
          className="h-full bg-gradient-to-r from-[#3b82f6] to-[#a855f7] transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
