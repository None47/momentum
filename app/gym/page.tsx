import Link from "next/link";
import SimpleTabs from "@/components/layout/SimpleTabs";
import GymTracker from "@/components/gym/GymTracker";

export default function GymPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6">
      <SimpleTabs />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.18em] text-white/45">GYM TRACKER</p>
          <p className="mt-2 text-[20px] font-semibold text-white">Workout logging stays.</p>
        </div>
        <Link href="/roadmap" className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white">ROADMAP</Link>
      </div>
      <GymTracker />
    </main>
  );
}
