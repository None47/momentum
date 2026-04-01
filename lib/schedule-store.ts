export type RepeatRule = "never" | "daily" | "weekdays" | "weekends" | "custom";

export interface ScheduleBlock {
  id: string;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  color: string;
  repeat: RepeatRule;
  customDays: number[];
}

export interface ScheduleBlockOccurrence {
  blockId: string;
  occurrenceDateKey: string;
  title: string;
  color: string;
  startMinute: number;
  endMinute: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  completed: boolean;
  segment: "carry" | "main";
}

const STORAGE_KEYS = {
  blocks: "momentum_schedule_blocks_v1",
  completed: "momentum_schedule_completed_v1",
} as const;

const DEFAULT_BLOCKS: ScheduleBlock[] = [
  {
    id: "sleep-default",
    title: "Sleep",
    dateKey: "2026-04-01",
    startTime: "22:30",
    endTime: "05:30",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "running-default",
    title: "Running/jogging",
    dateKey: "2026-04-01",
    startTime: "05:00",
    endTime: "05:30",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "gym-default",
    title: "Gym",
    dateKey: "2026-04-01",
    startTime: "05:30",
    endTime: "08:00",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "coding-morning-default",
    title: "Coding",
    dateKey: "2026-04-01",
    startTime: "05:30",
    endTime: "07:30",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "lunch-default",
    title: "Lunch",
    dateKey: "2026-04-01",
    startTime: "12:50",
    endTime: "13:35",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "coding-afternoon-default",
    title: "Coding",
    dateKey: "2026-04-01",
    startTime: "13:35",
    endTime: "17:00",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "dinner-default",
    title: "Dinner",
    dateKey: "2026-04-01",
    startTime: "19:30",
    endTime: "19:50",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
  {
    id: "coding-evening-default",
    title: "Coding",
    dateKey: "2026-04-01",
    startTime: "19:50",
    endTime: "22:00",
    color: "#ef4444",
    repeat: "daily",
    customDays: [],
  },
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

export function addDays(dateKey: string, days: number) {
  const next = parseDateKey(dateKey);
  next.setDate(next.getDate() + days);
  return formatDateKey(next);
}

export function timeStringToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(value: number) {
  const total = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

export function formatMonthLabel(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatTimeLabel(value: number) {
  const total = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const hour12 = hours % 12 || 12;
  const meridiem = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${pad(minutes)} ${meridiem}`;
}

export function formatRangeLabel(startMinute: number, endMinute: number) {
  return `${formatTimeLabel(startMinute)} – ${formatTimeLabel(endMinute)}`;
}

export function formatDurationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }

  return parts.join(", ") || "0 min";
}

function getStoredBlocks() {
  return readStorage<ScheduleBlock[]>(STORAGE_KEYS.blocks, []);
}

function getCompletionMap() {
  return readStorage<Record<string, string[]>>(STORAGE_KEYS.completed, {});
}

function writeBlocks(blocks: ScheduleBlock[]) {
  writeStorage(STORAGE_KEYS.blocks, blocks);
}

function writeCompletions(completed: Record<string, string[]>) {
  writeStorage(STORAGE_KEYS.completed, completed);
}

export function ensureScheduleSeeded() {
  const blocks = getStoredBlocks();
  if (blocks.length > 0) return blocks;
  writeBlocks(DEFAULT_BLOCKS);
  return DEFAULT_BLOCKS;
}

export function getScheduleBlocks() {
  return ensureScheduleSeeded().slice().sort((left, right) => {
    const startDiff = timeStringToMinutes(left.startTime) - timeStringToMinutes(right.startTime);
    if (startDiff !== 0) return startDiff;
    return left.title.localeCompare(right.title);
  });
}

export function saveScheduleBlock(block: ScheduleBlock) {
  const blocks = ensureScheduleSeeded();
  const nextBlocks = blocks.some((entry) => entry.id === block.id)
    ? blocks.map((entry) => (entry.id === block.id ? block : entry))
    : [...blocks, block];
  writeBlocks(nextBlocks);
  return nextBlocks;
}

export function deleteScheduleBlock(blockId: string) {
  const blocks = ensureScheduleSeeded().filter((block) => block.id !== blockId);
  writeBlocks(blocks);

  const completed = getCompletionMap();
  const nextCompleted = Object.fromEntries(
    Object.entries(completed).map(([dateKey, blockIds]) => [
      dateKey,
      blockIds.filter((entry) => entry !== blockId),
    ]),
  );
  writeCompletions(nextCompleted);
  return blocks;
}

export function isScheduleBlockComplete(dateKey: string, blockId: string) {
  const completed = getCompletionMap();
  return completed[dateKey]?.includes(blockId) ?? false;
}

export function toggleScheduleBlockComplete(dateKey: string, blockId: string) {
  const completed = getCompletionMap();
  const dayEntries = new Set(completed[dateKey] ?? []);
  if (dayEntries.has(blockId)) {
    dayEntries.delete(blockId);
  } else {
    dayEntries.add(blockId);
  }
  completed[dateKey] = Array.from(dayEntries);
  writeCompletions(completed);
  return completed[dateKey];
}

function repeatsOnDate(block: ScheduleBlock, dateKey: string) {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();

  switch (block.repeat) {
    case "never":
      return block.dateKey === dateKey;
    case "daily":
      return dateKey >= block.dateKey;
    case "weekdays":
      return dateKey >= block.dateKey && dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dateKey >= block.dateKey && (dayOfWeek === 0 || dayOfWeek === 6);
    case "custom":
      return dateKey >= block.dateKey && block.customDays.includes(dayOfWeek);
    default:
      return false;
  }
}

export function getScheduleOccurrences(dateKey: string) {
  const blocks = getScheduleBlocks();
  const previousDateKey = addDays(dateKey, -1);
  const occurrences: ScheduleBlockOccurrence[] = [];

  for (const block of blocks) {
    const startMinute = timeStringToMinutes(block.startTime);
    const rawEndMinute = timeStringToMinutes(block.endTime);
    const crossesMidnight = rawEndMinute <= startMinute;
    const endMinute = crossesMidnight ? rawEndMinute + 1440 : rawEndMinute;
    const durationMinutes = endMinute - startMinute;

    if (crossesMidnight && repeatsOnDate(block, previousDateKey)) {
      occurrences.push({
        blockId: block.id,
        occurrenceDateKey: dateKey,
        title: block.title,
        color: block.color,
        startMinute: 0,
        endMinute: rawEndMinute,
        startLabel: block.startTime,
        endLabel: block.endTime,
        durationLabel: formatDurationLabel(durationMinutes),
        completed: isScheduleBlockComplete(dateKey, block.id),
        segment: "carry",
      });
    }

    if (repeatsOnDate(block, dateKey)) {
      occurrences.push({
        blockId: block.id,
        occurrenceDateKey: dateKey,
        title: block.title,
        color: block.color,
        startMinute,
        endMinute: crossesMidnight ? 1440 : endMinute,
        startLabel: block.startTime,
        endLabel: block.endTime,
        durationLabel: formatDurationLabel(durationMinutes),
        completed: isScheduleBlockComplete(dateKey, block.id),
        segment: "main",
      });
    }
  }

  return occurrences.sort((left, right) => {
    if (left.startMinute !== right.startMinute) {
      return left.startMinute - right.startMinute;
    }
    if (left.endMinute !== right.endMinute) {
      return left.endMinute - right.endMinute;
    }
    return left.title.localeCompare(right.title);
  });
}

export function getWeekDates(dateKey: string) {
  const date = parseDateKey(dateKey);
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(sunday);
    next.setDate(sunday.getDate() + index);
    return formatDateKey(next);
  });
}

export function createScheduleBlockId() {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
