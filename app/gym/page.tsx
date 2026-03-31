import GymTracker from "@/components/gym/GymTracker";

export default function GymPage() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
      <p className="text-[12px] tracking-[0.18em] text-white/45">GYM</p>
      <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
        Train. Log it. Progress or it doesn&apos;t count.
      </p>
      <section className="mt-6">
        <GymTracker />
      </section>
    </main>
  );
}
