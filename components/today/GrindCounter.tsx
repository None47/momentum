"use client";

interface GrindCounterProps {
  solvedToday: number;
  totalSolved: number;
  targetTotal: number;
  nextMilestone: string;
  nextMilestoneTarget: number;
}

export default function GrindCounter({
  solvedToday,
  totalSolved,
  targetTotal,
  nextMilestone,
  nextMilestoneTarget,
}: GrindCounterProps) {
  const pct = Math.min(100, Math.round((totalSolved / nextMilestoneTarget) * 100));
  const toGo = Math.max(0, targetTotal - totalSolved);

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.2em] text-[#3b82f6]/60 uppercase">
          Grind Counter
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <span className="text-[#e5e5e5]">
          <span className="text-[#3b82f6] font-bold">{solvedToday}</span> today
        </span>
        <span className="text-[#525252]">·</span>
        <span className="text-[#e5e5e5]">
          <span className="text-[#fbbf24] font-bold">{totalSolved}</span> total
        </span>
        <span className="text-[#525252]">·</span>
        <span className="text-[#737373]">
          {toGo} to go
        </span>
      </div>
      {/* Progress bar toward next milestone */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#525252]">{nextMilestone}</span>
          <span className="text-[9px] text-[#525252]">{totalSolved}/{nextMilestoneTarget}</span>
        </div>
        <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#fbbf24] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
