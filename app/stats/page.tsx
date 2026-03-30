"use client";

import { useSyncExternalStore } from "react";
import { getCurrentPhase, getDayNumber, getDaysToPlacement, getPhaseProgress } from "@/lib/constants";
import { getScore, getLeetCodeCount, getHabits, getCompletionsForDate } from "@/lib/store";
import { getLibraryInsight } from "@/lib/today-store";
import { CATEGORY_COLORS, type HabitCategory } from "@/lib/types";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

const MILESTONES = [
  { label: "First internship referral sent", target: "Jun 2026", achieved: false },
  { label: "100 LeetCode problems solved", target: "Jun 2026", achieved: false },
  { label: "3 projects shipped on GitHub", target: "Jul 2026", achieved: false },
  { label: "30-day med streak unbroken", target: "Apr 2026", achieved: false },
  { label: "Clear 3 backlogs → CGPA 7.0", target: "Sep 2026", achieved: false },
  { label: "Second internship / PPO offer", target: "Nov 2026", achieved: false },
  { label: "300 LeetCode problems solved", target: "Dec 2026", achieved: false },
  { label: "CGPA reaches 7.5+", target: "Feb 2027", achieved: false },
  { label: "600 LeetCode total", target: "Jul 2027", achieved: false },
  { label: "₹60 LPA placement offer secured", target: "Oct 2027", achieved: false },
];

export default function StatsPage() {
  const score = useSyncExternalStore(
    () => () => {},
    () => getScore(),
    () => 0,
  );
  const lcCount = useSyncExternalStore(
    () => () => {},
    () => getLeetCodeCount(),
    () => 0,
  );
  const phase = getCurrentPhase();
  const phaseProgress = getPhaseProgress();
  const libraryInsight = getLibraryInsight(30);

  // Identity rings (30-day completion rates by category)
  const habits = getHabits();
  const categoryOrder: HabitCategory[] = ["MEDICAL", "GRIND", "BODY", "MIND"];
  const ringLabels: Record<string, string> = { MEDICAL: "DISCIPLINE", GRIND: "GRIND", BODY: "RECOVERY", MIND: "FOCUS" };

  const identityRings = categoryOrder.map((cat) => {
    const catHabits = habits.filter((h) => h.category === cat);
    let totalCompleted = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const completions = getCompletionsForDate(dateStr);
      totalCompleted += catHabits.filter((h) => completions.includes(h.id)).length;
    }
    const maxPossible = catHabits.length * 30;
    const pct = maxPossible > 0 ? Math.min(100, Math.round((totalCompleted / maxPossible) * 100)) : 0;
    return { key: cat, label: ringLabels[cat], pct, color: CATEGORY_COLORS[cat] };
  });

  const lcReadiness = Math.min(100, Math.round((lcCount / 300) * 100));
  const readinessLabel = lcReadiness >= 100 ? "READY TO USE" : lcReadiness >= 60 ? "APPROACHING" : "NOT READY";
  const readinessColor = lcReadiness >= 100 ? "#10b981" : lcReadiness >= 60 ? "#fbbf24" : "#ef4444";

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">THE SCOREBOARD</h1>
        <p className="text-[10px] text-[#525252] mb-6">Numbers don&apos;t lie.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 text-center">
            <span className="text-2xl font-bold text-[#e5e5e5] tabular-nums">{getDayNumber()}</span>
            <p className="text-[9px] text-[#525252] mt-1">DAY OF 577</p>
          </div>
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 text-center">
            <span className="text-2xl font-bold text-[#fbbf24] tabular-nums">{getDaysToPlacement()}</span>
            <p className="text-[9px] text-[#525252] mt-1">DAYS TO ₹60L</p>
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.2em] text-[#3b82f6]/60 uppercase">
              Phase {phase.number}
            </span>
            <span className="text-[10px] text-[#525252]">
              Day {phaseProgress.daysIn}/{phaseProgress.daysTotal}
            </span>
          </div>
          <p className="mt-2 text-[14px] font-bold tracking-[0.14em] text-[#e5e5e5]">
            {phase.label}
          </p>
          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#a855f7]"
              style={{ width: `${phaseProgress.pct}%` }}
            />
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4 mb-4">
          <span className="text-[9px] tracking-[0.2em] text-[#3b82f6]/60 uppercase">LeetCode</span>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-bold text-[#e5e5e5] tabular-nums">{lcCount}</span>
            <span className="text-sm text-[#525252] mb-1">/ 750</span>
          </div>
          <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#fbbf24]" style={{ width: `${Math.min(100, (lcCount / 750) * 100)}%` }} />
          </div>
        </div>

        <div className="mb-6">
          <span className="text-[9px] tracking-[0.2em] text-[#525252] uppercase mb-3 block">Identity Stats (30d)</span>
          <div className="grid grid-cols-2 gap-3">
            {identityRings.map((ring) => (
              <div key={ring.key} className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 text-center">
                <svg width="60" height="60" className="mx-auto">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#1a1a1a" strokeWidth="3" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke={ring.color} strokeWidth="3"
                    strokeDasharray={`${(ring.pct / 100) * 150.8} 150.8`} strokeLinecap="round"
                    transform="rotate(-90 30 30)" className="transition-all duration-1000" />
                  <text x="30" y="33" textAnchor="middle" fill={ring.color} fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                    {ring.pct}%
                  </text>
                </svg>
                <p className="text-[9px] tracking-[0.1em] mt-1" style={{ color: ring.color }}>{ring.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] tracking-[0.2em] text-[#525252] uppercase">Referral Readiness</span>
            <span className="text-[10px] font-bold tracking-wider" style={{ color: readinessColor }}>{readinessLabel}</span>
          </div>
          {[
            { label: "LeetCode", value: lcCount, target: 300, color: "#3b82f6" },
            { label: "Projects", value: 0, target: 5, color: "#a855f7" },
            { label: "CGPA", value: 0, target: 7.5, color: "#f97316" },
          ].map((item) => (
            <div key={item.label} className="mb-2">
              <div className="flex items-center justify-between text-[9px] text-[#525252] mb-1">
                <span>{item.label}</span><span>{item.value}/{item.target}</span>
              </div>
              <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (Number(item.value) / item.target) * 100)}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <span className="text-[9px] tracking-[0.2em] text-[#525252] uppercase mb-3 block">Milestones</span>
          <div className="space-y-2">
            {MILESTONES.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 border rounded-sm ${m.achieved ? "border-[#fbbf24]/30 bg-[#1a1608]" : "border-[#1a1a1a] bg-[#0d0d0d]"}`}>
                <span className={`text-[11px] ${m.achieved ? "text-[#fbbf24]" : "text-[#525252]"}`}>{m.achieved ? "◆" : "◇"}</span>
                <div className="flex-1">
                  <p className={`text-[11px] ${m.achieved ? "text-[#fbbf24]" : "text-[#737373]"}`}>{m.label}</p>
                  <p className="text-[9px] text-[#525252]">{m.target}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4">
          <span className="text-[9px] tracking-[0.2em] text-[#525252] uppercase">Library Pattern (30d)</span>
          {libraryInsight.skipped > 0 && libraryInsight.topReason ? (
            <p className="mt-3 text-[12px] leading-6 text-[#e5e5e5]">
              You skipped library {libraryInsight.skipped} times — {libraryInsight.topReason[1]} were {libraryInsight.topReason[0].toLowerCase()}.
            </p>
          ) : (
            <p className="mt-3 text-[12px] leading-6 text-[#737373]">
              No missed-library pattern logged yet.
            </p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
