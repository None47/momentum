import SimpleTabs from "@/components/layout/SimpleTabs";
import ConsistencyTracker from "@/components/tracker/ConsistencyTracker";

export default function SchedulePage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      <SimpleTabs />
      <div className="mb-5">
        <p className="text-[12px] tracking-[0.18em] text-white/45">TRACKER</p>
        <p className="mt-2 text-[20px] font-semibold text-white">How consistent you have actually been.</p>
      </div>
      <ConsistencyTracker />
    </main>
  );
}
