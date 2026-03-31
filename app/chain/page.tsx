"use client";

import {
  CORE_HABITS,
  addDays,
  getCurrentHabitStreak,
  getDaysSinceStart,
  getLongestHabitStreak,
  getShowedUpDays,
  getTodayKey,
  getTotalCompletedForHabit,
  isHabitDoneOnDate,
} from "@/lib/momentum";

function getLastThirtyDays() {
  const today = getTodayKey();
  const days: string[] = [];

  for (let index = 29; index >= 0; index -= 1) {
    days.push(addDays(today, -index));
  }

  return days;
}

export default function ChainPage() {
  const days = getLastThirtyDays();
  const showedUp = getShowedUpDays();
  const totalDays = getDaysSinceStart();
  const completionRate = totalDays > 0 ? Math.round((showedUp / totalDays) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
      <p className="text-[12px] tracking-[0.18em] text-white/45">CHAIN</p>
      <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
        You showed up {showedUp} of {totalDays} days ({completionRate}%)
      </p>

      <section className="mt-8 space-y-6">
        {CORE_HABITS.map((habit) => (
          <div key={habit.id} className="rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[18px] font-semibold tracking-[0.08em] text-white">{habit.name}</p>
              <p className="text-[12px] tracking-[0.14em] text-white/45">LAST 30 DAYS</p>
            </div>

            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-1.5">
                {days.map((day, index) => {
                  const done = isHabitDoneOnDate(habit.id, day);
                  const previousDone = index > 0 ? isHabitDoneOnDate(habit.id, days[index - 1]) : false;
                  const showBreak = index > 0 && previousDone && !done;

                  return (
                    <div key={day} className="flex items-center gap-1.5">
                      {index > 0 && (
                        <span className={`text-[10px] ${showBreak ? "text-[#ff5c5c]" : "text-white/18"}`}>
                          {showBreak ? "X" : "·"}
                        </span>
                      )}
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]"
                        style={{
                          borderColor: done ? habit.color : "rgba(255,92,92,0.28)",
                          backgroundColor: done ? habit.color : "rgba(255,92,92,0.08)",
                          color: done ? "#050505" : "#ff8d8d",
                        }}
                      >
                        {done ? "●" : "○"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 space-y-2 text-[14px] text-white/72">
              <p>Current: {getCurrentHabitStreak(habit.id)} days</p>
              <p>Longest ever: {getLongestHabitStreak(habit.id)} days</p>
              <p>
                Total completed: {getTotalCompletedForHabit(habit.id)}/{getDaysSinceStart()}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
