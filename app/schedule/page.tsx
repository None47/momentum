"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  createScheduleBlockId,
  deleteScheduleBlock,
  ensureScheduleSeeded,
  formatDateKey,
  formatDurationLabel,
  formatMonthLabel,
  formatRangeLabel,
  formatTimeLabel,
  getScheduleBlocks,
  getScheduleOccurrences,
  getWeekDates,
  minutesToTimeString,
  parseDateKey,
  saveScheduleBlock,
  timeStringToMinutes,
  toggleScheduleBlockComplete,
  type RepeatRule,
  type ScheduleBlock,
  type ScheduleBlockOccurrence,
} from "@/lib/schedule-store";

const TIMELINE_START_MINUTE = 3 * 60;
const TIMELINE_END_MINUTE = 24 * 60;
const TIMELINE_PX_PER_MINUTE = 2.1;
const TIMELINE_GUTTER = 52;
const TIMELINE_LINE_LEFT = 70;
const TIMELINE_CONTENT_LEFT = 82;
const COLOR_OPTIONS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#fbbf24"];
const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom" },
];

type PositionedOccurrence = ScheduleBlockOccurrence & {
  visibleStart: number;
  visibleEnd: number;
  top: number;
  height: number;
  column: number;
  columns: number;
};

type GapEntry = {
  startMinute: number;
  endMinute: number;
  kind: "gap" | "end";
};

type DraftBlock = {
  id: string;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  color: string;
  repeat: RepeatRule;
  customDays: number[];
};

function getDraftBlock(dateKey: string, startTime = "09:00", endTime = "10:00"): DraftBlock {
  return {
    id: createScheduleBlockId(),
    title: "",
    dateKey,
    startTime,
    endTime,
    color: "#ef4444",
    repeat: "never",
    customDays: [1, 2, 3, 4, 5],
  };
}

function getMinutesForDisplay(minute: number) {
  const clamped = Math.max(TIMELINE_START_MINUTE, Math.min(TIMELINE_END_MINUTE, minute));
  return (clamped - TIMELINE_START_MINUTE) * TIMELINE_PX_PER_MINUTE;
}

function layoutOccurrences(occurrences: ScheduleBlockOccurrence[]) {
  const clipped = occurrences
    .map((occurrence) => ({
      ...occurrence,
      visibleStart: Math.max(occurrence.startMinute, TIMELINE_START_MINUTE),
      visibleEnd: Math.min(occurrence.endMinute, TIMELINE_END_MINUTE),
    }))
    .filter((occurrence) => occurrence.visibleEnd > occurrence.visibleStart);

  const positioned: PositionedOccurrence[] = [];
  let cluster: Array<Omit<PositionedOccurrence, "top" | "height" | "column" | "columns">> = [];
  let clusterEnd = -1;

  function finalizeCluster() {
    if (cluster.length === 0) return;

    const active: Array<{ column: number; end: number }> = [];
    const used = new Set<number>();
    let maxColumns = 1;
    const nextItems: PositionedOccurrence[] = [];

    for (const item of cluster) {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].end <= item.visibleStart) {
          used.delete(active[index].column);
          active.splice(index, 1);
        }
      }

      let column = 0;
      while (used.has(column)) {
        column += 1;
      }

      used.add(column);
      active.push({ column, end: item.visibleEnd });
      maxColumns = Math.max(maxColumns, active.length);

      nextItems.push({
        ...item,
        top: getMinutesForDisplay(item.visibleStart),
        height: Math.max(54, (item.visibleEnd - item.visibleStart) * TIMELINE_PX_PER_MINUTE),
        column,
        columns: 1,
      });
    }

    for (const item of nextItems) {
      item.columns = maxColumns;
      positioned.push(item);
    }

    cluster = [];
    clusterEnd = -1;
  }

  for (const occurrence of clipped) {
    if (cluster.length === 0) {
      cluster = [occurrence];
      clusterEnd = occurrence.visibleEnd;
      continue;
    }

    if (occurrence.visibleStart < clusterEnd) {
      cluster.push(occurrence);
      clusterEnd = Math.max(clusterEnd, occurrence.visibleEnd);
      continue;
    }

    finalizeCluster();
    cluster = [occurrence];
    clusterEnd = occurrence.visibleEnd;
  }

  finalizeCluster();

  return positioned;
}

function getGapEntries(occurrences: ScheduleBlockOccurrence[]) {
  const ranges = occurrences
    .filter((occurrence) => !occurrence.completed)
    .map((occurrence) => ({
      startMinute: Math.max(occurrence.startMinute, TIMELINE_START_MINUTE),
      endMinute: Math.min(occurrence.endMinute, TIMELINE_END_MINUTE),
    }))
    .filter((range) => range.endMinute > range.startMinute)
    .sort((left, right) => left.startMinute - right.startMinute);

  const merged: Array<{ startMinute: number; endMinute: number }> = [];

  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.startMinute > last.endMinute) {
      merged.push({ ...range });
      continue;
    }
    last.endMinute = Math.max(last.endMinute, range.endMinute);
  }

  const gaps: GapEntry[] = [];
  let cursor = TIMELINE_START_MINUTE;

  for (const range of merged) {
    if (range.startMinute - cursor > 15) {
      gaps.push({ startMinute: cursor, endMinute: range.startMinute, kind: "gap" });
    }
    cursor = Math.max(cursor, range.endMinute);
  }

  if (TIMELINE_END_MINUTE - cursor > 15) {
    gaps.push({ startMinute: cursor, endMinute: TIMELINE_END_MINUTE, kind: "end" });
  }

  return gaps;
}

function getWeekdayLabel(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function getMonthShort(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function getDateNumber(dateKey: string) {
  return parseDateKey(dateKey).getDate();
}

function isToday(dateKey: string) {
  return dateKey === formatDateKey(new Date());
}

function getTimelineHeight() {
  return (TIMELINE_END_MINUTE - TIMELINE_START_MINUTE) * TIMELINE_PX_PER_MINUTE;
}

function getRepeatSummary(draft: DraftBlock) {
  if (draft.repeat !== "custom") return draft.repeat;
  if (draft.customDays.length === 0) return "custom";
  return draft.customDays
    .slice()
    .sort((left, right) => left - right)
    .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
    .join(", ");
}

export default function SchedulePage() {
  const todayKey = formatDateKey(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => {
    ensureScheduleSeeded();
    return getScheduleBlocks();
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftBlock>(() => getDraftBlock(todayKey));
  const [error, setError] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const occurrences = useMemo(() => {
    void blocks;
    return getScheduleOccurrences(selectedDateKey);
  }, [blocks, selectedDateKey]);
  const positionedOccurrences = useMemo(() => layoutOccurrences(occurrences), [occurrences]);
  const gapEntries = useMemo(() => getGapEntries(occurrences), [occurrences]);
  const weekDates = useMemo(() => getWeekDates(selectedDateKey), [selectedDateKey]);

  const currentMinute = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  useEffect(() => {
    if (!timelineRef.current || selectedDateKey !== todayKey) return;
    const scrollTop = Math.max(0, getMinutesForDisplay(currentMinute) - 220);
    timelineRef.current.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, [currentMinute, selectedDateKey, todayKey]);

  function refreshBlocks() {
    setBlocks(getScheduleBlocks());
  }

  function openCreateSheet(startMinute?: number, endMinute?: number) {
    const start = minutesToTimeString(startMinute ?? 9 * 60);
    const end = minutesToTimeString(endMinute ?? 10 * 60);
    setEditingBlockId(null);
    setDraft(getDraftBlock(selectedDateKey, start, end));
    setError(null);
    setSheetOpen(true);
  }

  function openEditSheet(blockId: string) {
    const block = blocks.find((entry) => entry.id === blockId);
    if (!block) return;
    setEditingBlockId(blockId);
    setDraft({
      id: block.id,
      title: block.title,
      dateKey: block.dateKey,
      startTime: block.startTime,
      endTime: block.endTime,
      color: block.color,
      repeat: block.repeat,
      customDays: block.customDays,
    });
    setError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setError(null);
  }

  function handleSave() {
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      setError("Add a title.");
      return;
    }

    if (draft.repeat === "custom" && draft.customDays.length === 0) {
      setError("Choose at least one day for a custom repeat.");
      return;
    }

    const startMinute = timeStringToMinutes(draft.startTime);
    const endMinute = timeStringToMinutes(draft.endTime);
    if (startMinute === endMinute) {
      setError("Start and end times cannot match.");
      return;
    }

    saveScheduleBlock({
      id: editingBlockId ?? draft.id,
      title: trimmedTitle,
      dateKey: draft.dateKey,
      startTime: draft.startTime,
      endTime: draft.endTime,
      color: draft.color,
      repeat: draft.repeat,
      customDays: draft.customDays,
    });
    refreshBlocks();
    closeSheet();
  }

  function handleDelete() {
    if (!editingBlockId) return;
    deleteScheduleBlock(editingBlockId);
    refreshBlocks();
    closeSheet();
  }

  function handleToggleComplete(blockId: string) {
    toggleScheduleBlockComplete(selectedDateKey, blockId);
    refreshBlocks();
  }

  const currentLineTop =
    selectedDateKey === todayKey &&
    currentMinute >= TIMELINE_START_MINUTE &&
    currentMinute <= TIMELINE_END_MINUTE
      ? getMinutesForDisplay(currentMinute)
      : null;

  return (
    <main
      className="mx-auto min-h-screen max-w-lg px-0 pb-36 pt-4"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif',
      }}
    >
      <section className="px-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[34px] font-bold tracking-[-0.04em] text-white">{formatMonthLabel(selectedDateKey)}</p>
            <p className="mt-1 text-[13px] text-[#7c7c80]">Time blocks</p>
          </div>
          <button
            onClick={() => openCreateSheet()}
            className="rounded-full border border-[#2b2b2f] bg-[#151517] px-4 py-2 text-[12px] font-medium text-[#b4b4ba]"
          >
            + New
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {weekDates.map((dateKey) => {
            const dayIsToday = isToday(dateKey);
            const dayIsSelected = dateKey === selectedDateKey;
            const monthLabel = getMonthShort(dateKey);
            const sameMonth = monthLabel === getMonthShort(selectedDateKey);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                className={`min-w-[72px] rounded-[22px] border px-3 py-3 text-left transition ${
                  dayIsSelected ? "border-[#3a3a3f] bg-[#101012]" : "border-transparent bg-transparent"
                }`}
              >
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[#6e6e73]">{getWeekdayLabel(dateKey)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-[10px] px-2 text-[17px] font-semibold ${
                      dayIsToday ? "bg-[#ef4444] text-white" : "text-white"
                    }`}
                  >
                    {getDateNumber(dateKey)}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8d8d93]">
                    {dayIsToday ? "TODAY" : sameMonth ? "" : monthLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <div
          ref={timelineRef}
          className="overflow-y-auto px-4"
          style={{ height: "calc(100dvh - 255px)" }}
        >
          <div
            className="relative"
            style={{
              height: `${getTimelineHeight()}px`,
            }}
          >
            <div
              className="absolute top-0 bottom-0 w-px bg-[#ef4444]/90"
              style={{ left: `${TIMELINE_LINE_LEFT}px` }}
            />

            {Array.from({ length: 21 }, (_, index) => {
              const hour = index + 3;
              const minute = hour * 60;
              const top = getMinutesForDisplay(minute);

              return (
                <div key={hour}>
                  <span
                    className="absolute text-[12px] font-medium text-[#5b5b60]"
                    style={{ left: "0px", top: `${top - 8}px` }}
                  >
                    {String(hour).padStart(2, "0")}
                  </span>
                  <div
                    className="absolute h-px bg-[#101013]"
                    style={{ left: `${TIMELINE_CONTENT_LEFT}px`, right: "0px", top: `${top}px` }}
                  />
                </div>
              );
            })}

            {gapEntries.map((gap, index) => {
              const top = getMinutesForDisplay(gap.startMinute);
              const bottom = getMinutesForDisplay(gap.endMinute);
              const height = bottom - top;
              const gapLabel =
                gap.kind === "end"
                  ? `End of day: ${formatDurationLabel(gap.endMinute - gap.startMinute)}`
                  : `Free time: ${formatDurationLabel(gap.endMinute - gap.startMinute)}`;
              const buttonTop = top + Math.min(Math.max(14, height * 0.35), Math.max(14, height - 74));

              return (
                <div
                  key={`${gap.kind}-${gap.startMinute}-${gap.endMinute}-${index}`}
                  className="absolute text-center"
                  style={{ left: `${TIMELINE_CONTENT_LEFT}px`, right: "8px", top: `${buttonTop}px` }}
                >
                  <p className="text-[12px] font-medium text-[#6f6f74]">{gapLabel}</p>
                  <button
                    onClick={() => openCreateSheet(gap.startMinute, Math.min(gap.startMinute + 60, gap.endMinute))}
                    className="mt-2 rounded-full border border-[#2b2b2f] bg-[#101012] px-3 py-2 text-[12px] font-medium text-[#8d8d93]"
                  >
                    + Create time block
                  </button>
                  {gap.kind === "end" && (
                    <div className="mt-8 flex justify-center text-[#6f6f74]">
                      <MoonIcon />
                    </div>
                  )}
                </div>
              );
            })}

            {positionedOccurrences.map((occurrence) => {
              const widthOffset = occurrence.columns > 1 ? 10 : 0;
              const width = `calc(${100 / occurrence.columns}% - ${widthOffset}px)`;
              const left = `calc(${TIMELINE_CONTENT_LEFT}px + ${(100 / occurrence.columns) * occurrence.column}% + ${
                occurrence.column * 10
              }px)`;
              const blockStyle: CSSProperties = {
                top: `${occurrence.top}px`,
                height: `${occurrence.height}px`,
                left,
                width,
                opacity: occurrence.completed ? 0.4 : 1,
              };

              return (
                <button
                  key={`${occurrence.blockId}-${occurrence.segment}-${occurrence.startMinute}`}
                  onClick={() => openEditSheet(occurrence.blockId)}
                  className="absolute overflow-hidden rounded-[20px] border border-[#2a2a2d] bg-[#1c1c1e] px-4 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
                  style={blockStyle}
                >
                  <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: occurrence.color }} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-2">
                      <CalendarIcon />
                      <div className="min-w-0">
                        <p className="truncate pr-1 text-[17px] font-semibold leading-5 text-white">{occurrence.title}</p>
                        <p className="mt-2 text-[14px] leading-5 text-[#8d8d93]">
                          {formatRangeLabel(timeStringToMinutes(occurrence.startLabel), timeStringToMinutes(occurrence.endLabel))} (
                          {occurrence.durationLabel})
                        </p>
                      </div>
                    </div>
                    <button
                      aria-label={`Mark ${occurrence.title} complete`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleComplete(occurrence.blockId);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-[#ef4444] bg-transparent"
                    >
                      {occurrence.completed && <CheckIcon />}
                    </button>
                  </div>
                </button>
              );
            })}

            {currentLineTop !== null && (
              <>
                <span
                  className="absolute z-20 text-[12px] font-semibold text-[#ef4444]"
                  style={{ left: "0px", top: `${currentLineTop - 10}px` }}
                >
                  {formatTimeLabel(currentMinute)}
                </span>
                <div
                  className="absolute z-20 h-px bg-[#ef4444]"
                  style={{ left: `${TIMELINE_GUTTER}px`, right: "0px", top: `${currentLineTop}px` }}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {sheetOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80">
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] border border-white/10 bg-[#111113] px-5 pb-8 pt-5">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-white/10" />
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[18px] font-semibold text-white">
                  {editingBlockId ? "Edit time block" : "Create time block"}
                </p>
                <p className="mt-1 text-[12px] text-[#8d8d93]">{getRepeatSummary(draft)}</p>
              </div>
              <button onClick={closeSheet} className="text-[13px] font-medium text-[#8d8d93]">
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[12px] font-medium text-[#8d8d93]">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="New time block"
                  className="mt-2 w-full rounded-2xl border border-[#2b2b2f] bg-[#1a1a1d] px-4 py-3 text-[16px] text-white placeholder:text-[#5f5f65]"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-[#8d8d93]">Date</span>
                <input
                  type="date"
                  value={draft.dateKey}
                  onChange={(event) => setDraft((current) => ({ ...current, dateKey: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#2b2b2f] bg-[#1a1a1d] px-4 py-3 text-[16px] text-white"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-[#8d8d93]">Start</span>
                  <input
                    type="time"
                    value={draft.startTime}
                    onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#2b2b2f] bg-[#1a1a1d] px-4 py-3 text-[16px] text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-[#8d8d93]">End</span>
                  <input
                    type="time"
                    value={draft.endTime}
                    onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#2b2b2f] bg-[#1a1a1d] px-4 py-3 text-[16px] text-white"
                  />
                </label>
              </div>

              <div>
                <span className="text-[12px] font-medium text-[#8d8d93]">Color</span>
                <div className="mt-2 flex gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setDraft((current) => ({ ...current, color }))}
                      className={`h-9 w-9 rounded-full border-2 ${draft.color === color ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[12px] font-medium text-[#8d8d93]">Repeat</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDraft((current) => ({ ...current, repeat: option.value }))}
                      className={`rounded-2xl border px-3 py-2 text-[12px] font-medium ${
                        draft.repeat === option.value
                          ? "border-[#ef4444] bg-[#2a1010] text-white"
                          : "border-[#2b2b2f] bg-[#1a1a1d] text-[#9a9aa1]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.repeat === "custom" && (
                <div>
                  <span className="text-[12px] font-medium text-[#8d8d93]">Custom days</span>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => {
                      const active = draft.customDays.includes(index);
                      return (
                        <button
                          key={`${label}-${index}`}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              customDays: active
                                ? current.customDays.filter((day) => day !== index)
                                : [...current.customDays, index],
                            }))
                          }
                          className={`rounded-2xl border py-2 text-[12px] font-semibold ${
                            active
                              ? "border-[#ef4444] bg-[#2a1010] text-white"
                              : "border-[#2b2b2f] bg-[#1a1a1d] text-[#9a9aa1]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && <p className="text-[13px] text-[#ff7a7a]">{error}</p>}

              <button
                onClick={handleSave}
                className="w-full rounded-[20px] bg-[#ef4444] px-4 py-3 text-[15px] font-semibold text-white"
              >
                Save
              </button>

              {editingBlockId && (
                <button
                  onClick={handleDelete}
                  className="w-full rounded-[20px] border border-[#5a1d1d] bg-[#1d0b0b] px-4 py-3 text-[15px] font-semibold text-[#ff7a7a]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M6 3v3" />
      <path d="M14 3v3" />
      <path d="M3 8.5h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[#ef4444]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 9 9 0 1 0 20 14.5Z" />
    </svg>
  );
}
