"use client";

import { useSyncExternalStore } from "react";
import { getDayNumber } from "@/lib/constants";
import { getScore } from "@/lib/store";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import PhaseIndicator from "@/components/layout/PhaseIndicator";

export default function ReportPage() {
  const score = useSyncExternalStore(
    () => () => {},
    () => getScore(),
    () => 0,
  );

  const weekNumber = Math.ceil(getDayNumber() / 7);
  const isSunday = new Date().getDay() === 0;

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <PhaseIndicator />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">WEEKLY REPORT</h1>
        <p className="text-[10px] text-[#525252] mb-6">Week {weekNumber} {isSunday ? "· Submit today" : ""}</p>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-6 text-center">
          <p className="text-[11px] text-[#525252] leading-relaxed">
            Weekly reports will be available once Supabase is connected.
            <br />For now, track your progress on the TODAY and STATS tabs.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
