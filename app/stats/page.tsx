"use client";

import { useEffect, useState } from "react";
import {
  getEnergyInsight,
  getGithubCache,
  getGithubUsername,
  getMockInterviewStats,
  getPatternReport,
  getStarterStats,
  saveGithubCache,
  saveGithubUsername,
  type GithubCacheEntry,
} from "@/lib/executive-store";
import {
  getCurrentHabitStreak,
  getReferralStatus,
  getStatsSummary,
  getWeeklyLockInSessions,
  hasActiveDoubleXp,
} from "@/lib/momentum";

export default function StatsPage() {
  const [githubUsername, setGithubUsername] = useState("");
  const [githubStats, setGithubStats] = useState<GithubCacheEntry | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const summary = getStatsSummary();
  const referral = getReferralStatus();
  const lockInSessions = getWeeklyLockInSessions();
  const starterStats = getStarterStats();
  const energy = getEnergyInsight();
  const mockStats = getMockInterviewStats();
  const patternReport = getPatternReport();
  const codingStreak = getCurrentHabitStreak("grind-coding");

  useEffect(() => {
    setGithubUsername(getGithubUsername());
    setGithubStats(getGithubCache());
  }, []);

  async function fetchGithubStats() {
    if (!githubUsername.trim()) return;
    setGithubLoading(true);
    try {
      const response = await fetch(`/api/github?username=${encodeURIComponent(githubUsername.trim())}`);
      const data = (await response.json()) as GithubCacheEntry;
      saveGithubUsername(githubUsername.trim());
      saveGithubCache(data);
      setGithubStats(data);
    } finally {
      setGithubLoading(false);
    }
  }

  const bestSlotLabel =
    energy.bestTime === "MORNING"
      ? "7-9 AM"
      : energy.bestTime === "AFTERNOON"
        ? "3-5 PM"
        : "6-8 PM";

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

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">LOCK IN</p>
          <p className="mt-3 text-[28px] font-semibold text-white">{lockInSessions}</p>
          <p className="mt-2 text-[14px] text-white/62">Lock-in sessions this week</p>
          {hasActiveDoubleXp() && (
            <p className="mt-3 text-[13px] text-[#fbbf24]">DOUBLE XP active for comeback mode.</p>
          )}
        </div>
        <div className="rounded-[28px] border border-white/8 bg-[#090909] p-5">
          <p className="text-[11px] tracking-[0.18em] text-white/45">2-MIN STARTER</p>
          <p className="mt-3 text-[28px] font-semibold text-white">{starterStats.started}</p>
          <p className="mt-2 text-[14px] text-white/62">
            {starterStats.converted} became full sessions this week
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">MOCK INTERVIEW</p>
        <p className="mt-3 text-[28px] font-semibold text-white">{mockStats.readiness}</p>
        <p className="mt-2 text-[14px] text-white/62">
          {mockStats.readiness <= 30
            ? "Not ready"
            : mockStats.readiness <= 60
              ? "Building foundations"
              : mockStats.readiness <= 80
                ? "Approaching ready"
                : "INTERVIEW READY"}
        </p>
        <div className="mt-4 space-y-2 text-[14px] text-white/72">
          <p>Total mocks done: {mockStats.total}</p>
          <p>Coding pass rate: {mockStats.passRate}%</p>
          <p>Avg time to solve Easy: {mockStats.avgEasyTime} min</p>
          <p>Behavioural average: {mockStats.behaviouralAvg}/10</p>
          <p>Next weakness to fix: {mockStats.weakest}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">ENERGY PATTERN</p>
        <div className="mt-4 space-y-3 text-[14px] text-white/72">
          {energy.slots.map((slot) => (
            <p key={slot.slot}>
              {slot.slot === "MORNING" ? "Morning (7-9 AM)" : slot.slot === "AFTERNOON" ? "Afternoon (3-5 PM)" : "Evening (6-8 PM)"}: avg {slot.avg}/5
            </p>
          ))}
        </div>
        <p className="mt-4 text-[15px] font-semibold text-[#fbbf24]">
          Your best time to code: {bestSlotLabel}
        </p>
        <p className="mt-2 text-[13px] leading-6 text-white/55">
          On low-energy afternoons, do review work instead of forcing deep work.
        </p>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">GITHUB</p>
        <div className="mt-4 flex gap-2">
          <input
            value={githubUsername}
            onChange={(event) => setGithubUsername(event.target.value)}
            placeholder="GitHub username"
            className="flex-1 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-[14px] text-white placeholder:text-white/25"
          />
          <button
            type="button"
            onClick={fetchGithubStats}
            disabled={githubLoading}
            className="rounded-[18px] border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold text-black"
          >
            {githubLoading ? "LOADING" : "FETCH"}
          </button>
        </div>
        {githubStats && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[14px] text-white/72">
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                <p>Current contribution streak: {githubStats.streak} days</p>
                <p className="mt-2">Longest streak ever: {githubStats.longestStreak} days</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                <p>Total commits this year: {githubStats.totalCommitsYear}</p>
                <p className="mt-2">Most active day: {githubStats.mostActiveDay}</p>
              </div>
            </div>
            <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 p-4 text-[14px] text-white/72">
              <p>Coding habit streak: {codingStreak} days</p>
              <p className="mt-2">GitHub commit streak: {githubStats.streak} days</p>
              {codingStreak > githubStats.streak && (
                <p className="mt-3 text-[#fbbf24]">
                  You coded {codingStreak} days but only committed {githubStats.streak}. You are working without leaving proof.
                </p>
              )}
              {!githubStats.todayHasCommit && new Date().getHours() >= 21 && (
                <p className="mt-3 text-[#fbbf24]">
                  No GitHub commit today. Push something. Even a comment update counts. Recruiters see this graph.
                </p>
              )}
              <p className="mt-3">{githubStats.advice}</p>
            </div>
          </>
        )}
      </section>

      <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">PATTERN REPORT</p>
        <div className="mt-4 space-y-2 text-[14px] text-white/72">
          {patternReport.map((line) => (
            <p key={line}>• {line}</p>
          ))}
        </div>
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
