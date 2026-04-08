import ScheduleBoard from "@/components/schedule/ScheduleBoard";
import SimpleTabs from "@/components/layout/SimpleTabs";

export default function SchedulePage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      <SimpleTabs />
      <div className="mb-5">
        <p className="text-[12px] tracking-[0.18em] text-white/45">SCHEDULE</p>
        <p className="mt-2 text-[20px] font-semibold text-white">Your day plan lives here now.</p>
      </div>
      <ScheduleBoard />
    </main>
  );
}
