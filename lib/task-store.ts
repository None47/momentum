export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = "momentum_task_tracker_v1";

function read<T>(fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("momentum:data-changed"));
}

export function getTasks() {
  return read<TaskItem[]>([]).sort((a, b) => {
    if (a.status !== b.status) {
      const order = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
      return order[a.status] - order[b.status];
    }
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function saveTask(task: TaskItem) {
  const tasks = getTasks();
  const index = tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.unshift(task);
  }
  write(tasks);
}

export function updateTask(id: string, updates: Partial<Omit<TaskItem, "id" | "createdAt">>) {
  const tasks = getTasks();
  const index = tasks.findIndex((item) => item.id === id);
  if (index < 0) return;
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: Date.now(),
  };
  write(tasks);
}

export function deleteTask(id: string) {
  write(getTasks().filter((item) => item.id !== id));
}

export function getTaskStats() {
  const tasks = getTasks();
  return {
    total: tasks.length,
    todo: tasks.filter((item) => item.status === "TODO").length,
    inProgress: tasks.filter((item) => item.status === "IN_PROGRESS").length,
    done: tasks.filter((item) => item.status === "DONE").length,
  };
}
