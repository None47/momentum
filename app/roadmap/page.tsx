import { ROADMAP_TOPICS } from "@/lib/roadmap-data";

export default function RoadmapPage() {
  const categories = new Set(ROADMAP_TOPICS.map((topic) => topic.category));

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
      <p className="text-[12px] tracking-[0.18em] text-white/45">ROADMAP</p>
      <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
        Long game. Compounding skill.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">TOPICS</p>
          <p className="mt-3 text-[34px] font-semibold text-white">{ROADMAP_TOPICS.length}</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">CATEGORIES</p>
          <p className="mt-3 text-[34px] font-semibold text-[#fbbf24]">{categories.size}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">STATUS</p>
        <p className="mt-3 text-[18px] leading-8 text-white">
          The roadmap data is already in the app. This tab is now a real destination in the bottom nav instead of redirecting away.
        </p>
      </section>
    </main>
  );
}
