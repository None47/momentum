"use client";

import { getReferralStatus, getStatsSummary, getWeeklyLockInSessions, hasActiveDoubleXp } from "@/lib/momentum";

export default function StatsPage() {
  const summary = getStatsSummary();
  const referral = getReferralStatus();
  const lockInSessions = getWeeklyLockInSessions();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
      <p className="text-[12px] tracking-[0.18em] text-white/45">STATS</p>
      <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
        Numbers only. No spin.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">DAY</p>
          <p className="mt-3 text-[34px] font-semibold text-white">{summary.dayNumber}</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">REMAINING</p>
          <p className="mt-3 text-[34px] font-semibold text-[#fbbf24]">{summary.daysRemaining}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">SHOWING UP</p>
        <p className="mt-3 text-[28px] font-semibold text-white">
          {summary.showedUp}/{summary.days}
        </p>
        <p className="mt-2 text-[14px] text-white/62">Honest completion rate: {summary.completionRate}%</p>
        <p className="mt-2 text-[14px] text-white/45">Current phase: {summary.phase}</p>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">LOCK IN</p>
        <p className="mt-3 text-[28px] font-semibold text-white">{lockInSessions}</p>
        <p className="mt-2 text-[14px] text-white/62">Lock-in sessions this week</p>
        {hasActiveDoubleXp() && (
          <p className="mt-3 text-[13px] text-[#fbbf24]">DOUBLE XP active for comeback mode.</p>
        )}
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">REFERRAL COUNTDOWN</p>
        <div className="mt-4 space-y-3 text-[14px] text-white/72">
          <p>LeetCode: {referral.lc}/300</p>
          <p>Projects: {referral.projects}/5</p>
          <p>CGPA: {referral.cgpa.toFixed(1)}/7.0</p>
        </div>
        <p className="mt-5 text-[15px] font-semibold text-white">
          {referral.unlocked ? "REFERRAL UNLOCKED — CONTACT COUSIN" : "REFERRAL: LOCKED"}
        </p>
      </section>
    </main>
  );
}
