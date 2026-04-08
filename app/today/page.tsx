"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ParticleBurst from "@/components/effects/ParticleBurst";
import XPToast from "@/components/effects/XPToast";
import { getCurrentPhase, getDayNumber, getDaysToPlacement, getPhaseProgress, getTodayDate, QUOTES } from "@/lib/constants";
import { rollReward } from "@/lib/engines/variableReward";
import { HABITS, type HardcodedHabit } from "@/lib/habits";
import {
  addScore,
  completeHabit,
  getCompletionsForDate,
  getHabitCompletionDates,
  getScore,
  getStreak,
  isHabitCompletedToday,
  updateStreak,
} from "@/lib/store";
import {
  getAccountability,
  getAIBrief,
  getCsQuestionRating,
  getEnergyScores,
  getMoodScore,
  getOneThing,
  getOneThingRegens,
  getStarterAttempts,
  incrementOneThingRegens,
  incrementStarterAttempts,
  saveAccountability,
  saveAIBrief,
  saveCsQuestionRating,
  saveEnergyScore,
  saveMoodScore,
  saveOneThing,
} from "@/lib/today-mission-store";
import { getFocusTask, getLibraryCheckIn, saveLibraryCheckIn } from "@/lib/today-store";
import { CATEGORY_COLORS, type HabitCategory } from "@/lib/types";

type ToastState = {
  visible: boolean;
  xp: number;
  color: string;
  label: string | null;
};

type AccountabilityKey = "gymDone" | "codingDone" | "lcDone";
type MainHabitKey = "body-gym" | "grind-coding" | "grind-leetcode";

const MAIN_HABIT_IDS: MainHabitKey[] = ["body-gym", "grind-coding", "grind-leetcode"];
const MEDICATION_IDS = HABITS.filter((habit) => habit.category === "MEDICAL").map((habit) => habit.id);

const STARTER_STEPS = [
  "Just open leetcode.com. That's it. 2 min.",
  "Open the problem list and click one Easy. Do not solve it yet.",
  "Read only the first example and write one variable name.",
];

const CS_QUESTIONS = [
  {
    category: "Operating Systems",
    question: "What is the difference between a process and a thread?",
    answer:
      "A process has its own memory space and resources. Threads share the same process memory but run independently. Interviewers ask this to test whether you understand concurrency costs, isolation, and why threads are lighter than processes.",
  },
  {
    category: "Databases",
    question: "Why does an index improve read performance but hurt writes?",
    answer:
      "An index lets the database avoid scanning every row, so reads get faster. But every insert, update, or delete has to maintain the index too, which adds write cost. Interviewers ask this to see if you understand tradeoffs instead of assuming indexes are always good.",
  },
  {
    category: "Networking",
    question: "Why is TCP considered reliable?",
    answer:
      "TCP tracks sequence numbers, acknowledgements, retransmissions, and ordering, so lost or out-of-order packets are recovered before delivery to the application. Interviewers ask this because reliability details matter when discussing APIs, retries, and distributed systems.",
  },
  {
    category: "DSA",
    question: "When would you use a hash map instead of sorting first?",
    answer:
      "Use a hash map when constant-time lookup matters more than ordered traversal, especially for frequency counting, seen checks, and complement lookups. Interviewers ask this to test whether you choose tools by complexity and problem shape, not habit.",
  },
];

const ONE_THING_LIBRARY = [
  "Solve LeetCode #1 Two Sum in 45 minutes. Then spend 8 minutes on the NeetCode explanation. Why now: Phase 1 needs repetition before difficulty.",
  "Watch NeetCode Binary Search for 12 minutes, then solve LeetCode #704 in 45 minutes. Why now: this pattern compounds across later phases.",
  "Read Python list and dictionary time complexity notes for 20 minutes, then solve LeetCode #217 Contains Duplicate in 25 minutes. Why now: fast lookup patterns must become automatic.",
];

function isHabitScheduledToday(habit: HardcodedHabit) {
  const day = new Date().getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return day >= 1 && day <= 5;
  if (habit.frequency === "weekly_sunday") return day === 0;
  return true;
}

function getYesterdayCompletion(habitId: string) {
  const dates = getHabitCompletionDates(habitId, 2);
  return dates.length > 0 && dates[0] !== getTodayDate() ? dates[0] : dates[1] ?? null;
}

function getSleepCognition() {
  const sleptYesterday = Boolean(getYesterdayCompletion("body-sleep"));
  if (sleptYesterday) {
    return {
      label: "TODAY'S COGNITION: PEAK ◆ 7.5hrs",
      tone: "text-[#10b981]",
      note: "Full-intensity work is available today.",
    };
  }

  return {
    label: "TODAY'S COGNITION: IMPAIRED ◇ 5hrs",
    tone: "text-[#ef4444]",
    note: "Review problems only today if focus stays unstable.",
  };
}

function buildMorningBrief() {
  const missedMeds = MEDICATION_IDS.filter((id) => isHabitScheduledToday(HABITS.find((habit) => habit.id === id)!) && !isHabitCompletedToday(id)).length;
  const lcDone = isHabitCompletedToday("grind-leetcode") ? 2 : 0;
  const gymDone = isHabitCompletedToday("body-gym");
  const codingDone = isHabitCompletedToday("grind-coding");

  if (missedMeds > 0) {
    return `${missedMeds} medication steps are still open. Fix that first, then protect the 3:30 PM library window because ${gymDone || codingDone || lcDone ? "partial progress is already on the board" : "nothing compounds until today starts"}.`;
  }

  return `${lcDone}/2 LeetCode problems are locked in so far. Keep the chain alive at the library and do not let Day ${getDayNumber()} become another hostel drift day.`;
}

function getStreakLabel(habitId: string) {
  const streak = getStreak(habitId);
  if (streak.current === 0) return { text: "0 days", tone: "text-white/30", hot: false };
  if (streak.current >= 7) return { text: `${streak.current} days`, tone: "text-[#fbbf24] streak-fire", hot: true };
  return { text: `${streak.current} days`, tone: "text-white", hot: false };
}

function getDailyQuestion() {
  return CS_QUESTIONS[(getDayNumber() - 1) % CS_QUESTIONS.length];
}

export default function TodayPage() {
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [medicationsExpanded, setMedicationsExpanded] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefText, setBriefText] = useState<string | null>(null);
  const [oneThing, setOneThing] = useState<string | null>(null);
  const [energyScores, setEnergyScores] = useState(getEnergyScores());
  const [moodScore, setMood] = useState<number | null>(getMoodScore());
  const [accountability, setAccountability] = useState(getAccountability());
  const [questionRevealed, setQuestionRevealed] = useState(false);
  const [questionRating, setQuestionRating] = useState<string | null>(getCsQuestionRating());
  const [showStarter, setShowStarter] = useState(false);
  const [starterStep, setStarterStep] = useState(STARTER_STEPS[Math.min(getStarterAttempts(), STARTER_STEPS.length - 1)]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [toast, setToast] = useState<ToastState>({ visible: false, xp: 0, color: "#ffffff", label: null });
  const [burstActive, setBurstActive] = useState(false);
  const [burstCategory, setBurstCategory] = useState<HabitCategory>("GRIND");
  const [perfectDayVisible, setPerfectDayVisible] = useState(false);
  const [libraryCheckIn, setLibraryCheckIn] = useState(getLibraryCheckIn());
  const [oneThingDone, setOneThingDone] = useState(false);
  const prevPerfectStateRef = useRef(false);

  const today = getTodayDate();
  const phase = getCurrentPhase();
  const phaseProgress = getPhaseProgress();
  const sleep = getSleepCognition();
  const dailyQuestion = getDailyQuestion();

  const scheduledHabits = useMemo(() => HABITS.filter(isHabitScheduledToday), []);
  const medicationHabits = scheduledHabits.filter((habit) => habit.category === "MEDICAL");
  const mainHabits = MAIN_HABIT_IDS.map((id) => scheduledHabits.find((habit) => habit.id === id)).filter(Boolean) as HardcodedHabit[];
  const medsDoneCount = medicationHabits.filter((habit) => completedToday.includes(habit.id)).length;
  const mainCompleteCount = mainHabits.filter((habit) => completedToday.includes(habit.id)).length;
  const progressPct = Math.round((completedToday.length / Math.max(1, scheduledHabits.length)) * 100);
  const shouldShowLibraryBanner = (() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= 15 * 60 + 15 && minutes <= 15 * 60 + 30;
  })();
  const shouldShowAccountability = new Date().getHours() >= 21;
  const shouldShowDeathWarning = new Date().getHours() >= 20 && mainHabits.some((habit) => !completedToday.includes(habit.id) && getStreak(habit.id).current > 0);

  useEffect(() => {
    const sync = () => {
      setCompletedToday(getCompletionsForDate(today));
      setBriefText(getAIBrief(today));
      setOneThing(getOneThing(today) ?? getFocusTask(today) ?? ONE_THING_LIBRARY[(getDayNumber() - 1) % ONE_THING_LIBRARY.length]);
      setEnergyScores(getEnergyScores(today));
      setMood(getMoodScore(today));
      setAccountability(getAccountability(today));
      setQuestionRating(getCsQuestionRating(today));
      setLibraryCheckIn(getLibraryCheckIn(today));
    };

    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, [today]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % QUOTES.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!briefText) {
      const generated = buildMorningBrief();
      saveAIBrief(generated, today);
      setBriefText(generated);
    }

    if (!oneThing) {
      const fallback = ONE_THING_LIBRARY[(getDayNumber() - 1) % ONE_THING_LIBRARY.length];
      saveOneThing(fallback, today);
      setOneThing(fallback);
    }
  }, [briefText, oneThing, today]);

  useEffect(() => {
    const isPerfect = mainCompleteCount === mainHabits.length && mainHabits.length > 0;
    if (isPerfect && !prevPerfectStateRef.current) {
      setPerfectDayVisible(true);
      window.setTimeout(() => setPerfectDayVisible(false), 2000);
    }
    prevPerfectStateRef.current = isPerfect;
  }, [mainCompleteCount, mainHabits.length]);

  function triggerRewardToast(habit: HardcodedHabit) {
    const reward = rollReward(habit.xp_value);
    addScore(habit.xp_value * reward.multiplier);
    setToast({
      visible: true,
      xp: habit.xp_value * reward.multiplier,
      color: reward.color,
      label: reward.bonusType,
    });
    setBurstCategory(habit.category);
    setBurstActive(true);

    window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 900);
    window.setTimeout(() => setBurstActive(false), 300);
  }

  function handleComplete(habit: HardcodedHabit) {
    if (completedToday.includes(habit.id)) return;
    completeHabit(habit.id, today);
    updateStreak(habit.id, today);
    triggerRewardToast(habit);
    setCompletedToday(getCompletionsForDate(today));
    if (habit.id === "mind-journal") setMood((current) => current ?? 3);
  }

  function handleRefreshBrief() {
    setBriefLoading(true);
    const nextBrief = buildMorningBrief();
    window.setTimeout(() => {
      saveAIBrief(nextBrief, today);
      setBriefText(nextBrief);
      setBriefLoading(false);
    }, 500);
  }

  function handleDifferentTask() {
    const used = getOneThingRegens(today);
    if (used >= 2) return;
    incrementOneThingRegens(today);
    const nextTask = ONE_THING_LIBRARY[(getDayNumber() + used) % ONE_THING_LIBRARY.length];
    saveOneThing(nextTask, today);
    setOneThing(nextTask);
    setOneThingDone(false);
  }

  function handleStarterShrink() {
    const attempts = incrementStarterAttempts(today);
    setStarterStep(STARTER_STEPS[Math.min(attempts, STARTER_STEPS.length - 1)]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-10 pt-5">
      <ParticleBurst trigger={burstActive} category={burstCategory} />
      <XPToast xp={toast.xp} bonusLabel={toast.label} color={toast.color} show={toast.visible} />

      {perfectDayVisible && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#060606]">
          <div className="text-center">
            <p className="text-[28px] font-semibold tracking-[0.3em] text-white">SHOWED UP.</p>
            <p className="mt-4 text-[12px] tracking-[0.2em] text-white/55">
              Day {getDayNumber()} complete. {getDaysToPlacement()} days remaining.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-[10px] border border-white/7 bg-[#0d0d0d] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] tracking-[0.2em] text-white/45">
            PHASE {phase.number}: {phase.label} · Day {phaseProgress.daysIn + 1}/{phaseProgress.daysTotal}
          </p>
          <p className="text-[12px] text-[#fbbf24]">{getScore().toLocaleString()} XP</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
          <motion.div
            className="h-full rounded-full bg-[#3b82f6]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Card toneClass={sleep.tone}>
            <Label>TODAY'S COGNITION</Label>
            <p className={`mt-2 text-[15px] font-semibold ${sleep.tone}`}>{sleep.label}</p>
            <p className="mt-2 text-[12px] leading-6 text-white/55">{sleep.note}</p>
          </Card>

          <Card className="border-[#1f3656] bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(13,13,13,1))]">
            <div className="flex items-center justify-between gap-3">
              <Label>AI MORNING BRIEF</Label>
              <button
                type="button"
                onClick={handleRefreshBrief}
                className="min-h-11 rounded-[10px] border border-white/7 px-3 text-[11px] text-white/65"
              >
                {briefLoading ? "..." : "REFRESH"}
              </button>
            </div>
            {briefLoading ? (
              <div className="mt-3 space-y-2">
                <div className="ai-shimmer h-3 rounded" />
                <div className="ai-shimmer h-3 w-4/5 rounded" />
              </div>
            ) : (
              <p className="mt-3 text-[13px] leading-6 text-[#b7c9e6]">{briefText}</p>
            )}
          </Card>

          <Card className={medsDoneCount === medicationHabits.length ? "" : "border-[#ef4444]/50"}>
            <button
              type="button"
              onClick={() => setMedicationsExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <Label>MEDICATIONS</Label>
                <p className="mt-2 text-[16px] font-semibold text-white">
                  {medsDoneCount === medicationHabits.length ? "MEDS DONE ✓" : `○ MEDICATIONS — ${medsDoneCount}/${medicationHabits.length} taken →`}
                </p>
              </div>
              <p className="text-[12px] text-[#ef4444]">{medsDoneCount < medicationHabits.length ? "CRITICAL" : "DONE"}</p>
            </button>

            {(medicationsExpanded || medsDoneCount !== medicationHabits.length) && (
              <div className="mt-4 space-y-3">
                {medicationHabits.map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => handleComplete(habit)}
                    disabled={completedToday.includes(habit.id)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-[10px] border px-3 py-3 text-left ${
                      completedToday.includes(habit.id)
                        ? "border-[#ef4444]/15 bg-[#151010] text-white/40"
                        : "border-[#ef4444]/35 bg-[#120c0c] text-white"
                    }`}
                  >
                    <div>
                      <p className="text-[13px] font-medium">{habit.label}</p>
                      <p className="mt-1 text-[11px] text-white/45">{habit.scheduled_time}</p>
                      {habit.notes && <p className="mt-1 text-[11px] text-[#ffb4b4]">{habit.notes}</p>}
                    </div>
                    <span className="text-[11px] tracking-[0.15em]">{completedToday.includes(habit.id) ? "DONE" : "TAP"}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            {mainHabits.map((habit) => {
              const streakLabel = getStreakLabel(habit.id);
              const completed = completedToday.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => handleComplete(habit)}
                  disabled={completed}
                  className="w-full rounded-[10px] border bg-[#111111] p-4 text-left"
                  style={{ borderColor: `${CATEGORY_COLORS[habit.category]}66`, minHeight: 100 }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border text-[26px] ${
                        completed ? "bg-white text-black" : "bg-transparent text-white"
                      }`}
                      style={{ borderColor: completed ? "#ffffff" : CATEGORY_COLORS[habit.category] }}
                    >
                      {completed ? "✓" : "○"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-semibold text-white">{habit.label}</p>
                      <p className="mt-2 text-[12px] tracking-[0.1em] text-white/50">
                        {habit.scheduled_time} {habit.location_required === "LIBRARY" ? "· LIBRARY ONLY" : "· ANYWHERE"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[14px] font-semibold ${streakLabel.tone}`}>{streakLabel.text}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {shouldShowLibraryBanner && (
            <Card className="border-[#3b82f6]/50">
              <Label>LIBRARY CHECK-IN</Label>
              <p className="mt-2 text-[16px] font-semibold text-white">3:30 PM — ARE YOU IN THE LIBRARY?</p>
              <div className="mt-4 flex gap-3">
                <ActionButton
                  active={libraryCheckIn?.present === true}
                  onClick={() => {
                    saveLibraryCheckIn({ date: today, present: true, reason: null });
                    setLibraryCheckIn(getLibraryCheckIn(today));
                  }}
                >
                  YES, I'M HERE
                </ActionButton>
                <ActionButton
                  active={libraryCheckIn?.present === false}
                  onClick={() => {
                    saveLibraryCheckIn({ date: today, present: false, reason: "Hostel drag / delayed start" });
                    setLibraryCheckIn(getLibraryCheckIn(today));
                  }}
                >
                  NOT YET
                </ActionButton>
              </div>
            </Card>
          )}

          <Card>
            <Label>TODAY'S CS QUESTION</Label>
            <p className="mt-2 text-[12px] text-white/45">{dailyQuestion.category}</p>
            <p className="mt-3 text-[16px] font-semibold text-white">{dailyQuestion.question}</p>
            {!questionRevealed ? (
              <div className="mt-4 flex gap-3">
                <ActionButton onClick={() => setQuestionRevealed(true)}>SHOW ANSWER</ActionButton>
                <ActionButton onClick={() => setQuestionRevealed(false)}>SKIP</ActionButton>
              </div>
            ) : (
              <>
                <p className="mt-4 text-[13px] leading-6 text-white/65">{dailyQuestion.answer}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <ActionButton
                    active={questionRating === "knew"}
                    onClick={() => {
                      saveCsQuestionRating("knew", today);
                      setQuestionRating("knew");
                    }}
                  >
                    ✓ KNEW
                  </ActionButton>
                  <ActionButton
                    active={questionRating === "partial"}
                    onClick={() => {
                      saveCsQuestionRating("partial", today);
                      setQuestionRating("partial");
                    }}
                  >
                    ◐ PARTIAL
                  </ActionButton>
                  <ActionButton
                    active={questionRating === "didnt"}
                    onClick={() => {
                      saveCsQuestionRating("didnt", today);
                      setQuestionRating("didnt");
                    }}
                  >
                    ✗ DIDN'T
                  </ActionButton>
                </div>
              </>
            )}
          </Card>

          <Card>
            <Label>TODAY'S ONE THING</Label>
            <p className="mt-3 text-[15px] leading-7 text-white">{oneThing}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton active={oneThingDone} onClick={() => setOneThingDone(true)}>
                DONE
              </ActionButton>
              <ActionButton onClick={handleDifferentTask} disabled={getOneThingRegens(today) >= 2}>
                DIFFERENT TASK
              </ActionButton>
            </div>
          </Card>

          <Card className="border-white/12">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>CAN'T START?</Label>
                <p className="mt-2 text-[15px] text-white">Break the first action until starting is impossible to avoid.</p>
              </div>
              <ActionButton onClick={() => setShowStarter((current) => !current)}>{showStarter ? "CLOSE" : "CAN'T START?"}</ActionButton>
            </div>
            {showStarter && (
              <div className="mt-4 rounded-[10px] border border-white/7 bg-black/20 p-4">
                <p className="text-[14px] leading-6 text-white">{starterStep}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ActionButton onClick={() => setShowStarter(false)}>I DID IT</ActionButton>
                  <ActionButton onClick={handleStarterShrink}>STILL CAN'T</ActionButton>
                </div>
              </div>
            )}
          </Card>

          {shouldShowDeathWarning && (
            <Card className="at-risk-pulse border-[#ef4444]/65 bg-[#150c0c]">
              <Label>STREAK DEATH WARNING</Label>
              {mainHabits
                .filter((habit) => !completedToday.includes(habit.id) && getStreak(habit.id).current > 0)
                .slice(0, 1)
                .map((habit) => (
                  <div key={habit.id}>
                    <p className="mt-2 text-[16px] font-semibold text-[#ffb4b4]">
                      YOUR {habit.label.toUpperCase()} STREAK DIES TONIGHT.
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-white/70">
                      {getStreak(habit.id).current}-day streak. You have {24 - new Date().getHours()} hours.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <ActionButton onClick={() => handleComplete(habit)}>I'LL DO IT</ActionButton>
                      <ActionButton>I'M SKIPPING TODAY</ActionButton>
                    </div>
                  </div>
                ))}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <Label>ENERGY CHECK-IN</Label>
            <div className="mt-4 space-y-3">
              {([
                ["morning", "7 AM"],
                ["afternoon", "3 PM"],
                ["evening", "7 PM"],
              ] as const).map(([slot, label]) => (
                <div key={slot} className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-white/55">{label}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => {
                          saveEnergyScore(slot, score, today);
                          setEnergyScores(getEnergyScores(today));
                        }}
                        className={`h-11 w-11 rounded-[10px] border text-[12px] ${
                          energyScores[slot] === score ? "border-white bg-white text-black" : "border-white/8 bg-[#111111] text-white/65"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Label>HOW WAS TODAY?</Label>
            <div className="mt-4 space-y-2">
              {[
                [5, "◆◆◆◆◆ STRONG"],
                [4, "◆◆◆◆○ GOOD"],
                [3, "◆◆◆○○ OKAY"],
                [2, "◆◆○○○ LOW"],
                [1, "◆○○○○ VERY LOW"],
              ].map(([score, label]) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => {
                    saveMoodScore(Number(score), today);
                    setMood(Number(score));
                  }}
                  className={`flex min-h-11 w-full items-center rounded-[10px] border px-3 text-left text-[13px] ${
                    moodScore === score ? "border-white bg-white text-black" : "border-white/8 bg-[#111111] text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {shouldShowAccountability && (
            <Card>
              <Label>DAILY ACCOUNTABILITY</Label>
              <p className="mt-2 text-[14px] text-white">DID YOU DO WHAT YOU SAID TODAY?</p>
              <div className="mt-4 space-y-3">
                {([
                  ["GYM", "gymDone"],
                  ["CODING", "codingDone"],
                  ["LEETCODE", "lcDone"],
                ] as const).map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <p className="text-[12px] text-white/60">{label}</p>
                    <div className="flex gap-2">
                      <ActionButton
                        active={accountability[key] === true}
                        onClick={() => {
                          const next = { ...accountability, [key]: true };
                          saveAccountability(next, today);
                          setAccountability(next);
                        }}
                      >
                        YES
                      </ActionButton>
                      <ActionButton
                        active={accountability[key] === false}
                        onClick={() => {
                          const next = { ...accountability, [key]: false };
                          saveAccountability(next, today);
                          setAccountability(next);
                        }}
                      >
                        NO
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <Label>ROTATING QUOTE</Label>
            <motion.p
              key={quoteIndex}
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-3 text-[14px] leading-7 text-white/75"
            >
              {QUOTES[quoteIndex]}
            </motion.p>
          </Card>

          <Card>
            <Label>HONEST NUMBERS</Label>
            <div className="mt-3 space-y-2 text-[12px] text-white/65">
              <p>Day {getDayNumber()} of 577.</p>
              <p>Main habits done: {mainCompleteCount}/3.</p>
              <p>Medications done: {medsDoneCount}/{medicationHabits.length}.</p>
              <p>Days remaining: {getDaysToPlacement()}.</p>
              <p>Library check-in: {libraryCheckIn ? (libraryCheckIn.present ? "PRESENT" : "MISSED") : "NOT LOGGED"}.</p>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Card({
  children,
  className = "",
  toneClass = "",
}: {
  children: React.ReactNode;
  className?: string;
  toneClass?: string;
}) {
  return <section className={`rounded-[10px] border border-white/7 bg-[#0d0d0d] p-4 ${className} ${toneClass}`}>{children}</section>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] tracking-[0.18em] text-white/40">{children}</p>;
}

function ActionButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-[10px] border px-3 text-[11px] tracking-[0.08em] ${
        active ? "border-white bg-white text-black" : "border-white/8 bg-[#111111] text-white/75"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
