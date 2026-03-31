"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import { getDayNumber, TOTAL_DAYS } from "@/lib/constants";
import {
  CORE_HABITS,
  activateComebackMode,
  addLockInSession,
  getComebackHabit,
  getConsecutiveMisses,
  getCoreCompletions,
  getCurrentHabitStreak,
  getDailyTask,
  getIdentityMirrorState,
  getLockInSessions,
  getReferralStatus,
  getTodayKey,
  getWeeklyLockInSessions,
  getYesterdayKey,
  hasActiveDoubleXp,
  markAppOpened,
  markWhyPromptSeen,
  shouldPromptWhy,
} from "@/lib/momentum";

type MirrorState = {
  title: string;
  body: string;
  background: string;
};

type LockInMode = "focus" | "break";

interface LockInState {
  running: boolean;
  mode: LockInMode;
  remaining: number;
  completedCycles: number;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function getDefaultLockInState(): LockInState {
  return {
    running: false,
    mode: "focus",
    remaining: FOCUS_SECONDS,
    completedCycles: 0,
  };
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClock(now: Date) {
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [mirror, setMirror] = useState<MirrorState | null>(null);
  const [comebackOpen, setComebackOpen] = useState(false);
  const [comebackToastOpen, setComebackToastOpen] = useState(false);
  const [perfectMomentOpen, setPerfectMomentOpen] = useState(false);
  const [lockInOpen, setLockInOpen] = useState(false);
  const [lockInState, setLockInState] = useState<LockInState>(getDefaultLockInState);
  const [endSessionPromptOpen, setEndSessionPromptOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [warningHabitId, setWarningHabitId] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const todayKey = getTodayKey();
  const hideChrome = pathname === "/why" || lockInOpen;
  const warningHabit = CORE_HABITS.find((habit) => habit.id === warningHabitId) ?? null;
  const referral = getReferralStatus();
  const dailyTaskText =
    getDailyTask(todayKey)?.task ??
    "Open the library laptop and finish the one coding task that matters today.";

  useEffect(() => {
    const onDataChanged = () => setRefreshKey((value) => value + 1);
    const onPerfectDay = () => {
      setPerfectMomentOpen(true);
      window.setTimeout(() => setPerfectMomentOpen(false), 2000);
      setRefreshKey((value) => value + 1);
    };
    const onOpenLockIn = () => {
      setLockInState({
        ...getDefaultLockInState(),
        completedCycles: getLockInSessions(todayKey),
      });
      setLockInOpen(true);
    };

    window.addEventListener("momentum:data-changed", onDataChanged);
    window.addEventListener("momentum:perfect-day", onPerfectDay);
    window.addEventListener("momentum:open-lock-in", onOpenLockIn);

    return () => {
      window.removeEventListener("momentum:data-changed", onDataChanged);
      window.removeEventListener("momentum:perfect-day", onPerfectDay);
      window.removeEventListener("momentum:open-lock-in", onOpenLockIn);
    };
  }, [todayKey]);

  useEffect(() => {
    if (shouldPromptWhy() && pathname !== "/why") {
      markWhyPromptSeen();
      router.push("/why?prompt=missed");
      return;
    }

    const comebackHabit = getComebackHabit();
    if (comebackHabit) {
      const timer = window.setTimeout(() => {
        setComebackOpen(true);
        markAppOpened();
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const identity = getIdentityMirrorState();
    const nextMirror: MirrorState = identity.isFirstOpenToday
      ? {
          title: `DAY ${getDayNumber()} OF ${TOTAL_DAYS}.`,
          body: `${identity.daysUntilTarget} days until ₹60L.`,
          background: "#060606",
        }
      : identity.showedUpYesterday
        ? {
            title: "YOU SHOWED UP YESTERDAY.",
            body: `Day ${identity.yesterdayShowUpStreak} streak. Do it again.`,
            background: "#07120b",
          }
        : {
            title: "YOU DIDN'T SHOW UP YESTERDAY.",
            body: `That's ${Math.max(...CORE_HABITS.map((habit) => getConsecutiveMisses(habit.id)))} days in a row missed. Today is the only day that matters.`,
            background: "#140707",
          };

    const timer = window.setTimeout(() => {
      setMirror(nextMirror);
      markAppOpened();
      window.setTimeout(() => setMirror(null), 2000);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const evaluateWarning = () => {
      const afterEightPm = new Date().getHours() >= 20;
      const firstIncomplete = getCoreCompletions(todayKey).find((habit) => !habit.completed);

      if (afterEightPm && firstIncomplete && !warningDismissed) {
        setWarningHabitId(firstIncomplete.id);
      } else {
        setWarningHabitId(null);
      }
    };

    evaluateWarning();
    const timer = window.setInterval(evaluateWarning, 60000);
    return () => window.clearInterval(timer);
  }, [refreshKey, todayKey, warningDismissed]);

  useEffect(() => {
    if (!lockInOpen || !lockInState.running) return;

    const timer = window.setInterval(() => {
      setLockInState((current) => {
        if (current.remaining > 1) {
          return { ...current, remaining: current.remaining - 1 };
        }

        if (current.mode === "focus") {
          const sessions = addLockInSession(todayKey);
          setRefreshKey((value) => value + 1);
          return {
            running: false,
            mode: "break",
            remaining: BREAK_SECONDS,
            completedCycles: sessions,
          };
        }

        return {
          running: false,
          mode: "focus",
          remaining: FOCUS_SECONDS,
          completedCycles: current.completedCycles,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockInOpen, lockInState.running, todayKey]);

  function handleComebackStart() {
    activateComebackMode();
    setComebackOpen(false);
    setComebackToastOpen(true);
    setRefreshKey((value) => value + 1);
    window.setTimeout(() => setComebackToastOpen(false), 2200);
    router.push("/today");
  }

  function finishLockIn(worked: boolean) {
    if (worked) {
      const sessions = addLockInSession(todayKey);
      setLockInState({
        running: false,
        mode: "focus",
        remaining: FOCUS_SECONDS,
        completedCycles: sessions,
      });
      setRefreshKey((value) => value + 1);
    } else {
      setLockInState(getDefaultLockInState());
    }

    setEndSessionPromptOpen(false);
    setLockInOpen(false);
  }

  return (
    <>
      {!hideChrome && (
        <>
          <header
            className="sticky top-0 z-40 border-b border-white/10 bg-[#060606]/96"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
              <p className="text-[11px] tracking-[0.22em] text-white/45">
                DAY {getDayNumber()} / {TOTAL_DAYS}
              </p>
              <p className="text-[13px] font-semibold tracking-[0.36em] text-white">MOMENTUM</p>
              <Link href="/why" className="text-[12px] font-semibold text-[#fbbf24]">
                ₹60L
              </Link>
            </div>
          </header>

          {warningHabit && (
            <section className="sticky top-[57px] z-30 border-b border-[#4c1111] bg-[#1a0808] px-4 py-3">
              <div className="mx-auto flex max-w-lg flex-col gap-3">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.1em] text-[#ff6b6b]">
                    {warningHabit.warningTitle}
                  </p>
                  <p className="mt-1 text-[13px] text-white">
                    {Math.max(1, getCurrentHabitStreak(warningHabit.id, getYesterdayKey()))} days will be gone at midnight.
                  </p>
                  <p className="mt-1 text-[12px] text-[#f0b9b9]">{warningHabit.warningBody}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setWarningDismissed(true);
                      setWarningHabitId(null);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-[12px] font-semibold text-white"
                  >
                    I&apos;LL DO IT
                  </button>
                  <button
                    onClick={() => setSkipConfirmOpen(true)}
                    className="rounded-2xl border border-[#7a2121] bg-[#2a1010] px-4 py-3 text-[12px] font-semibold text-[#ffb2b2]"
                  >
                    I&apos;M SKIPPING TODAY
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {children}

      {!hideChrome && (
        <>
          <div
            className={`fixed inset-x-0 bottom-[61px] z-40 border-t border-white/10 ${
              referral.unlocked ? "bg-[#1c1606]" : "bg-[#0a0a0a]"
            }`}
          >
            <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 text-[11px]">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="whitespace-nowrap text-white/75">LC: {referral.lc}/300</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full ${referral.unlocked ? "bg-[#fbbf24]" : "bg-white"}`}
                    style={{ width: `${Math.min(100, (referral.lc / 300) * 100)}%` }}
                  />
                </div>
              </div>
              <span className={referral.unlocked ? "text-[#fbbf24]" : "text-white/55"}>
                {referral.unlocked ? "REFERRAL UNLOCKED — CONTACT COUSIN" : "REFERRAL: LOCKED"}
              </span>
            </div>
          </div>
          <BottomNav />
        </>
      )}

      {mirror && !comebackOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center px-8 text-center"
          style={{ backgroundColor: mirror.background }}
        >
          <div>
            <p className="text-[34px] font-semibold tracking-[0.12em] text-white">{mirror.title}</p>
            <p className="mt-4 text-[16px] text-white/72">{mirror.body}</p>
          </div>
        </div>
      )}

      {perfectMomentOpen && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center bg-black px-8 text-center">
          <div>
            <p className="text-[34px] font-semibold tracking-[0.12em] text-[#fbbf24]">SHOWED UP.</p>
            <p className="mt-4 text-[18px] text-white">Day {getDayNumber()} complete.</p>
            <p className="mt-1 text-[16px] text-white/65">
              {Math.max(TOTAL_DAYS - getDayNumber(), 0)} days remaining.
            </p>
          </div>
        </div>
      )}

      {comebackOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black px-6 text-center">
          <div className="max-w-sm">
            <p className="text-[34px] font-semibold tracking-[0.08em] text-white">YOU&apos;RE BACK.</p>
            <p className="mt-5 text-[17px] text-white/72">
              You missed {Math.max(...CORE_HABITS.map((habit) => getConsecutiveMisses(habit.id)))} days.
            </p>
            <p className="mt-4 text-[15px] text-white/60">Every long journey has setbacks.</p>
            <p className="mt-2 text-[15px] text-white/60">
              The only question is what happens next.
            </p>
            <button
              onClick={handleComebackStart}
              className="mt-10 w-full rounded-3xl border border-white/12 bg-white px-5 py-4 text-[13px] font-semibold tracking-[0.12em] text-black"
            >
              START AGAIN — DAY 1 OF NEW STREAK
            </button>
          </div>
        </div>
      )}

      {skipConfirmOpen && warningHabit && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/88 px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6">
            <p className="text-[18px] font-semibold text-white">Skipping today means:</p>
            <div className="mt-5 space-y-3 text-[14px] text-white/72">
              <p>- {Math.max(1, getCurrentHabitStreak(warningHabit.id, getYesterdayKey()))}-day streak resets to 0</p>
              <p>- {warningHabit.skipImpact}</p>
              <p>- Referral readiness drops 1%</p>
            </div>
            <p className="mt-6 text-[14px] text-white">Still skipping?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSkipConfirmOpen(false);
                  setWarningDismissed(true);
                  setWarningHabitId(null);
                }}
                className="rounded-2xl border border-[#6d2323] bg-[#220d0d] px-4 py-3 text-[12px] font-semibold text-[#ffb2b2]"
              >
                YES, SKIP
              </button>
              <button
                onClick={() => setSkipConfirmOpen(false)}
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-[12px] font-semibold text-white"
              >
                NO, I&apos;LL DO IT
              </button>
            </div>
          </div>
        </div>
      )}

      {lockInOpen && (
        <div className="fixed inset-0 z-[98] bg-black px-6 pt-8">
          <div className="mx-auto flex h-full max-w-lg flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <p className="text-[38px] font-semibold tracking-[0.06em] text-white">{formatClock(clock)}</p>
            <div className="mt-12">
              <p className="text-[12px] tracking-[0.2em] text-white/45">TODAY&apos;S CODING TASK</p>
              <p className="mt-4 text-[22px] leading-9 text-white">{dailyTaskText}</p>
            </div>
            <div className="mt-16">
              <p className="text-[12px] tracking-[0.2em] text-white/45">
                {lockInState.mode === "focus" ? "FOCUS" : "BREAK"}
              </p>
              <p className="mt-2 text-[56px] font-semibold tracking-[0.08em] text-white">
                {formatTimer(lockInState.remaining)}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setLockInState((current) => ({
                    ...current,
                    running: !current.running,
                  }))
                }
                className="rounded-3xl border border-white/12 bg-white px-5 py-4 text-[13px] font-semibold tracking-[0.14em] text-black"
              >
                {lockInState.running ? "PAUSE" : "START"}
              </button>
              <button
                onClick={() => setEndSessionPromptOpen(true)}
                className="rounded-3xl border border-white/12 bg-white/6 px-5 py-4 text-[13px] font-semibold tracking-[0.14em] text-white"
              >
                END SESSION
              </button>
            </div>
            <div className="mt-auto pb-8 text-[14px] text-white/58">
              <p>Today&apos;s sessions: {lockInState.completedCycles}</p>
              <p className="mt-2">Lock-in sessions this week: {getWeeklyLockInSessions()}</p>
              {lockInState.completedCycles >= 4 && (
                <p className="mt-6 text-white">DEEP WORK DONE. 2 hours completed.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {endSessionPromptOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/85 px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6 text-center">
            <p className="text-[20px] font-semibold text-white">Did you actually work?</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => finishLockIn(true)}
                className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold text-black"
              >
                YES
              </button>
              <button
                onClick={() => finishLockIn(false)}
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-[12px] font-semibold text-white"
              >
                NO - I GOT DISTRACTED
              </button>
            </div>
          </div>
        </div>
      )}

      {comebackToastOpen && (
        <div className="fixed inset-x-4 top-24 z-[97] mx-auto max-w-lg rounded-3xl border border-white/12 bg-[#0d0d0d] px-5 py-4 text-[14px] text-white">
          New streak started. Don&apos;t break it this time.
          {hasActiveDoubleXp() && (
            <span className="mt-1 block text-white/55">DOUBLE XP active for 48 hours.</span>
          )}
        </div>
      )}
    </>
  );
}
