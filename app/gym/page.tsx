"use client";

import { useSyncExternalStore } from "react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import GymTracker from "@/components/gym/GymTracker";
import { getScore } from "@/lib/store";

export default function GymPage() {
  const score = useSyncExternalStore(
    () => () => {},
    () => getScore(),
    () => 0,
  );

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <main className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-1 text-sm font-bold tracking-[0.3em] text-[#e5e5e5]">GYM</h1>
        <p className="mb-4 text-[10px] text-[#525252]">Lift. Log. Progress.</p>
        <GymTracker />
      </main>
      <BottomNav />
    </div>
  );
}
