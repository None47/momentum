"use client";

import { useEffect, useState } from "react";
import {
  formatDateKey,
  formatDurationLabel,
  formatMonthLabel,
  formatTimeLabel,
  getScheduleOccurrences,
  getWeekDates,
  toggleScheduleBlockComplete,
  type ScheduleBlockOccurrence,
} from "@/lib/schedule-store";

const HOUR_ROWS = Array.from({ length: 24 }, (_, index) => index);

function formatLongDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function isToday(dateKey: string) {
  return dateKey === formatDateKey(new Date());
}

function getCurrentMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function ScheduleCard({
  item,
  selectedDate,
  onToggle,
}: {
  item: ScheduleBlockOccurrence;
  selectedDate: string;
  onToggle: (blockId: string) => void;
}) {
  const activeNow = isToday(selectedDate) && getCurrentMinute() >= item.startMinute && getCurrentMinute() < item.endMinute;

  return (
    <button
      type="button"
      onClick={() => onToggle(item.blockId)}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        item.completed
          ? "border-emerald-400/25 bg-emerald-500/10"
          : "border-white/10 bg-[#0b0b0b]"
      } ${activeNow ? "ring-1 ring-[#f4f4f5]/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-white/45">
            {item.segment === "carry" ? "CONTINUED BLOCK" : "TIME BLOCK"}
          </p>
          <p className="mt-2 text-[18px] font-semibold text-white">{item.title}</p>
          <p className="mt-2 text-[12px] text-white/55">
            {formatTimeLabel(item.startMinute)} to {formatTimeLabel(item.endMinute)}
          </p>
          <p className="mt-1 text-[11px] text-white/38">{item.durationLabel}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.12em] ${
            item.completed
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/65"
          }`}
        >
          {item.completed ? "DONE" : "OPEN"}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{
            width: "100%",
            background: item.color,
            opacity: item.completed ? 0.35 : 0.9,
          }}
        />
      </div>
    </button>
  );
}

export default function ScheduleBoard() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [occurrences, setOccurrences] = useState<ScheduleBlockOccurrence[]>([]);
  const [currentMinute, setCurrentMinute] = useState(() => getCurrentMinute());

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
    if (isToday(dateKey)) {
      setCurrentMinute(getCurrentMinute());
    }
  }

  useEffect(() => {
    const sync = () => setOccurrences(getScheduleOccurrences(selectedDate));
    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, [selectedDate]);

  useEffect(() => {
    if (!isToday(selectedDate)) return;
    const timer = window.setInterval(() => setCurrentMinute(getCurrentMinute()), 60_000);
    return () => window.clearInterval(timer);
  }, [selectedDate]);

  const weekDates = getWeekDates(selectedDate);
  const completedCount = occurrences.filter((item) => item.completed).length;
  const totalMinutes = occurrences.reduce((sum, item) => sum + Math.max(0, item.endMinute - item.startMinute), 0);

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => selectDate(shiftDate(selectedDate, -1))}
            className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white/75"
          >
            PREV
          </button>
          <div className="text-center">
            <p className="text-[11px] tracking-[0.18em] text-white/45">{formatMonthLabel(selectedDate).toUpperCase()}</p>
            <p className="mt-2 text-[22px] font-semibold text-white">{formatLongDate(selectedDate)}</p>
          </div>
          <button
            type="button"
            onClick={() => selectDate(shiftDate(selectedDate, 1))}
            className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white/75"
          >
            NEXT
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {weekDates.map((dateKey) => {
            const active = dateKey === selectedDate;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => selectDate(dateKey)}
                className={`rounded-[18px] border px-2 py-3 text-center transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/8 bg-black/20 text-white/65"
                }`}
              >
                <p className="text-[10px] font-semibold tracking-[0.12em]">
                  {new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </p>
                <p className="mt-1 text-[15px] font-semibold">
                  {new Date(`${dateKey}T00:00:00`).getDate()}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatChip label="Blocks" value={String(occurrences.length)} />
          <StatChip label="Finished" value={`${completedCount}/${occurrences.length || 0}`} />
          <StatChip label="Planned" value={formatDurationLabel(totalMinutes)} />
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-white/45">DAY TIMELINE</p>
            <p className="mt-2 text-[18px] font-semibold text-white">
              {occurrences.length === 0 ? "No blocks scheduled." : `${occurrences.length} blocks lined up.`}
            </p>
          </div>
          {isToday(selectedDate) && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-emerald-200">
              NOW {formatTimeLabel(currentMinute)}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {occurrences.map((item) => (
            <ScheduleCard
              key={`${item.blockId}-${item.segment}-${item.startMinute}`}
              item={item}
              selectedDate={selectedDate}
              onToggle={(blockId) => {
                toggleScheduleBlockComplete(selectedDate, blockId);
                setOccurrences(getScheduleOccurrences(selectedDate));
              }}
            />
          ))}
          {occurrences.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-black/20 px-4 py-8 text-center text-[13px] text-white/45">
              No scheduled blocks for this day yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.18em] text-white/45">HOUR MAP</p>
        <div className="mt-4 space-y-2">
          {HOUR_ROWS.map((hour) => {
            const rowStart = hour * 60;
            const rowEnd = rowStart + 60;
            const rowBlocks = occurrences.filter((item) => item.startMinute < rowEnd && item.endMinute > rowStart);
            const nowInRow = isToday(selectedDate) && currentMinute >= rowStart && currentMinute < rowEnd;

            return (
              <div key={hour} className="grid grid-cols-[56px_1fr] items-center gap-3">
                <p className={`text-[11px] ${nowInRow ? "text-white" : "text-white/35"}`}>{formatTimeLabel(rowStart)}</p>
                <div className={`rounded-[16px] border px-3 py-3 ${nowInRow ? "border-white/20 bg-white/6" : "border-white/8 bg-black/20"}`}>
                  {rowBlocks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {rowBlocks.map((item) => (
                        <span
                          key={`${hour}-${item.blockId}-${item.segment}`}
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${item.color}22`,
                            color: item.color,
                            border: `1px solid ${item.color}33`,
                          }}
                        >
                          {item.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-white/28">Free</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[10px] tracking-[0.14em] text-white/40">{label.toUpperCase()}</p>
      <p className="mt-2 text-[16px] font-semibold text-white">{value}</p>
    </div>
  );
}
