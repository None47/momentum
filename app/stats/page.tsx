import StatsDashboard from "@/components/stats/StatsDashboard";

export default function StatsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      <div className="mb-5">
        <p className="text-[12px] tracking-[0.18em] text-white/45">STATS</p>
        <p className="mt-2 text-[20px] font-semibold text-white">Tracked numbers, not placeholders.</p>
      </div>
      <StatsDashboard />
    </main>
  );
}
