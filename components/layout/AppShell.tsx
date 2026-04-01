"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import BottomNav from "@/components/layout/BottomNav";
import { getDayNumber, TOTAL_DAYS } from "@/lib/constants";
import {
  getBodyDoublingState,
  incrementBodyDoublingSession,
  setBodyDoublingSound,
  type AmbientMode,
} from "@/lib/executive-store";
import {
  CORE_HABITS,
  addLockInSession,
  getCoreCompletions,
  getCurrentHabitStreak,
  getDailyTask,
  getLockInSessions,
  getReferralStatus,
  getTodayKey,
  getWeeklyLockInSessions,
  getYesterdayKey,
  markAppOpened,
} from "@/lib/momentum";
import {
  ACCOUNTABILITY_REASONS,
  getSmartNotificationPayloads,
  getTodayAccountabilityEntry,
  markNotificationSent,
  needsAccountabilityCheck,
  saveAccountabilityEntry,
} from "@/lib/career-store";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [perfectMomentOpen, setPerfectMomentOpen] = useState(false);
  const [lockInOpen, setLockInOpen] = useState(false);
  const [lockInState, setLockInState] = useState<LockInState>(getDefaultLockInState);
  const [endSessionPromptOpen, setEndSessionPromptOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [warningHabitId, setWarningHabitId] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [studySince, setStudySince] = useState<number | null>(null);
  const [studyCount, setStudyCount] = useState(1);
  const [studySound, setStudySound] = useState<AmbientMode>(() => getBodyDoublingState().sound);
  const [accountabilityOpen, setAccountabilityOpen] = useState(false);
  const [accountabilityReasonOpen, setAccountabilityReasonOpen] = useState(false);
  const [accountabilityMessage, setAccountabilityMessage] = useState<string | null>(null);
  const [accountabilityDraft, setAccountabilityDraft] = useState({
    gym: null as boolean | null,
    coding: null as boolean | null,
    leetcode: null as boolean | null,
    reason: "",
  });

  const todayKey = getTodayKey();
  const hideChrome = pathname === "/why" || lockInOpen;
  const warningHabit = CORE_HABITS.find((habit) => habit.id === warningHabitId) ?? null;
  const referral = getReferralStatus();
  const shouldShowAccountability = accountabilityOpen || (!getTodayAccountabilityEntry() && needsAccountabilityCheck(clock));
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
    const timer = window.setTimeout(() => {
      markAppOpened();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const permission = typeof Notification !== "undefined" ? Notification.permission : "denied";
    if (permission !== "granted") return;

    const payload = getSmartNotificationPayloads(clock)[0];
    if (!payload) return;

    const show = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(payload.title, {
            body: payload.body,
            tag: payload.id,
          });
        } else {
          new Notification(payload.title, { body: payload.body, tag: payload.id });
        }
        markNotificationSent(payload.id);
      } catch {
        // Best effort only.
      }
    };

    void show();
  }, [clock]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    const timer = window.setTimeout(() => {
      Notification.requestPermission().catch(() => undefined);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!lockInOpen || !studyModeOpen) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return;
    }

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const channel = client.channel("study-with-me", {
      config: {
        presence: {
          key: crypto.randomUUID(),
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setStudyCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      client.removeChannel(channel);
    };
  }, [lockInOpen, studyModeOpen]);

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
    setStudyModeOpen(false);
    setStudySince(null);
  }

  function submitAccountability() {
    if (
      accountabilityDraft.gym === null ||
      accountabilityDraft.coding === null ||
      accountabilityDraft.leetcode === null
    ) {
      return;
    }

    const hasMiss =
      !accountabilityDraft.gym || !accountabilityDraft.coding || !accountabilityDraft.leetcode;

    if (hasMiss && !accountabilityDraft.reason) {
      setAccountabilityReasonOpen(true);
      return;
    }

    saveAccountabilityEntry({
      date: todayKey,
      gym: accountabilityDraft.gym,
      coding: accountabilityDraft.coding,
      leetcode: accountabilityDraft.leetcode,
      reason: accountabilityDraft.reason,
      submittedAt: Date.now(),
    });

    setAccountabilityOpen(false);
    setAccountabilityReasonOpen(false);
    setAccountabilityMessage(hasMiss ? "Logged. Tomorrow." : "Good.");
    setAccountabilityDraft({ gym: null, coding: null, leetcode: null, reason: "" });
    window.setTimeout(() => setAccountabilityMessage(null), 1800);
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

      {accountabilityMessage && (
        <div className="fixed inset-x-0 top-24 z-[93] flex justify-center px-4">
          <div className="rounded-full border border-white/10 bg-[#090909] px-5 py-3 text-[13px] text-white">
            {accountabilityMessage}
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

      {shouldShowAccountability && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/88 px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6">
            <p className="text-[12px] tracking-[0.18em] text-white/45">DAILY ACCOUNTABILITY</p>
            <p className="mt-4 text-[22px] leading-9 text-white">
              Did you complete your 3 habits today?
            </p>
            <div className="mt-6 space-y-4">
              {[
                { key: "gym", label: "GYM" },
                { key: "coding", label: "CODING" },
                { key: "leetcode", label: "LEETCODE" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <p className="text-[14px] text-white">{item.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAccountabilityDraft((current) => ({
                          ...current,
                          [item.key]: true,
                        }))
                      }
                      className={`rounded-[16px] border px-4 py-2 text-[11px] font-semibold tracking-[0.12em] ${
                        accountabilityDraft[item.key as "gym" | "coding" | "leetcode"] === true
                          ? "border-[#1f5d42] bg-[#0d2218] text-[#8fe0b7]"
                          : "border-white/10 bg-white/6 text-white"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAccountabilityDraft((current) => ({
                          ...current,
                          [item.key]: false,
                        }))
                      }
                      className={`rounded-[16px] border px-4 py-2 text-[11px] font-semibold tracking-[0.12em] ${
                        accountabilityDraft[item.key as "gym" | "coding" | "leetcode"] === false
                          ? "border-[#6b2020] bg-[#230d0d] text-[#ffb1b1]"
                          : "border-white/10 bg-white/6 text-white"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {accountabilityReasonOpen && (
              <div className="mt-6">
                <p className="text-[13px] tracking-[0.14em] text-[#fbbf24]">WHY NOT?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCOUNTABILITY_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setAccountabilityDraft((current) => ({ ...current, reason }))}
                      className={`rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] ${
                        accountabilityDraft.reason === reason
                          ? "border-[#fbbf24]/35 bg-[#1f1605] text-[#fbbf24]"
                          : "border-white/10 bg-white/6 text-white/72"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={submitAccountability}
              className="mt-6 w-full rounded-[20px] border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold tracking-[0.14em] text-black"
            >
              SUBMIT
            </button>
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
            {!studyModeOpen ? (
              <div className="mt-8 rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-[12px] tracking-[0.18em] text-white/45">STUDY WITH ME</p>
                <p className="mt-3 text-[15px] leading-7 text-white/72">
                  Silent body doubling for the days when the hostel feels too isolating.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudyModeOpen(true);
                    setStudySince(Date.now());
                    incrementBodyDoublingSession();
                  }}
                  className="mt-4 rounded-full border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold tracking-[0.12em] text-black"
                >
                  ◈ FIND A STUDY PARTNER
                </button>
              </div>
            ) : (
              <div className="mt-8 rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-[12px] tracking-[0.18em] text-white/45">STUDY SESSION ACTIVE</p>
                <p className="mt-3 text-[15px] text-white">
                  You: studying since {studySince ? formatTimer(Math.floor((clock.getTime() - studySince) / 1000)) : "00:00"}
                </p>
                <p className="mt-2 text-[15px] leading-7 text-white/72">
                  {studyCount} people studying right now worldwide. They can&apos;t see you. You can&apos;t see them. You are not alone.
                </p>
                <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] tracking-[0.16em] text-white/40">YOUR TASK</p>
                  <p className="mt-2 text-[14px] leading-7 text-white">{dailyTaskText}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["OFF", "RAIN", "CAFE", "BROWN"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setStudySound(mode);
                        setBodyDoublingSound(mode);
                      }}
                      className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${studySound === mode ? "border-white/14 bg-white text-black" : "border-white/10 bg-black/20 text-white/55"}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[12px] text-white/45">
                  You have studied alongside others {getBodyDoublingState().monthlySessions} times this month.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudyModeOpen(false);
                    setStudySince(null);
                  }}
                  className="mt-4 rounded-full border border-white/12 bg-white/6 px-4 py-3 text-[12px] font-semibold tracking-[0.12em] text-white"
                >
                  END STUDY WITH ME
                </button>
              </div>
            )}
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

    </>
  );
}
