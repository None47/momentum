"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SimpleTabs from "@/components/layout/SimpleTabs";
import {
  deleteTask,
  getTaskStats,
  getTasks,
  saveTask,
  updateTask,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-store";

type Filter = "ALL" | "OPEN" | "DONE";

function emptyTask(): Omit<TaskItem, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "",
    notes: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  };
}

function priorityTone(priority: TaskPriority) {
  if (priority === "HIGH") return "text-[#ef4444] border-[#ef4444]/20 bg-[#17090a]";
  if (priority === "MEDIUM") return "text-[#fbbf24] border-[#fbbf24]/20 bg-[#181204]";
  return "text-[#10b981] border-[#10b981]/20 bg-[#08140f]";
}

export default function TodayPage() {
  const [draft, setDraft] = useState(emptyTask());
  const [filter, setFilter] = useState<Filter>("ALL");
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    const sync = () => setTasks(getTasks());
    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, []);

  const stats = getTaskStats();
  const filteredTasks = useMemo(() => {
    if (filter === "OPEN") return tasks.filter((task) => task.status !== "DONE");
    if (filter === "DONE") return tasks.filter((task) => task.status === "DONE");
    return tasks;
  }, [filter, tasks]);

  function addTask() {
    if (!draft.title.trim()) return;
    saveTask({
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setDraft(emptyTask());
    setTasks(getTasks());
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6">
      <SimpleTabs />
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(9,9,9,0.96))] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] tracking-[0.18em] text-white/45">TASK TRACKER</p>
            <h1 className="mt-3 text-[30px] font-semibold text-white">Simple to-do list. Nothing else.</h1>
            <p className="mt-2 text-[14px] text-white/55">Add tasks, track status, finish work.</p>
          </div>
          <Link href="/roadmap" className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-[12px] font-semibold text-white">
            OPEN ROADMAP
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-white/40">TOTAL</p>
            <p className="mt-2 text-[28px] font-semibold text-white">{stats.total}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-white/40">OPEN</p>
            <p className="mt-2 text-[28px] font-semibold text-[#fbbf24]">{stats.todo + stats.inProgress}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-white/40">DONE</p>
            <p className="mt-2 text-[28px] font-semibold text-[#10b981]">{stats.done}</p>
          </div>
        </div>
      </div>

      <section className="mt-5 rounded-[30px] border border-white/10 bg-[#090909] p-5">
        <p className="text-[11px] tracking-[0.16em] text-white/40">ADD TASK</p>
        <div className="mt-4 space-y-3">
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Task title"
            className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[14px] text-white"
          />
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            rows={4}
            className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[14px] text-white"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TaskStatus }))}
              className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white"
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
            <select
              value={draft.priority}
              onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
              className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
              className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white"
            />
          </div>
          <button
            type="button"
            onClick={addTask}
            className="w-full rounded-[20px] border border-white/12 bg-white px-4 py-3 text-[12px] font-semibold text-black"
          >
            ADD TASK
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[30px] border border-white/10 bg-[#090909] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.16em] text-white/40">TASKS</p>
          <div className="flex gap-2">
            {(["ALL", "OPEN", "DONE"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${filter === item ? "border-white/12 bg-white text-black" : "border-white/10 bg-black/20 text-white/65"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredTasks.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-6 text-center text-[14px] text-white/45">
              No tasks yet.
            </div>
          )}

          {filteredTasks.map((task) => (
            <article key={task.id} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold text-white">{task.title}</p>
                  {task.notes && <p className="mt-2 text-[13px] leading-6 text-white/65">{task.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="rounded-[14px] border border-[#ef4444]/20 bg-[#17090a] px-3 py-2 text-[11px] font-semibold text-[#ef4444]"
                >
                  DELETE
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                  {task.priority}
                </span>
                <span className="rounded-full border border-white/10 bg-[#111] px-3 py-2 text-[11px] font-semibold text-white/70">
                  {task.dueDate ? `DUE ${task.dueDate}` : "NO DUE DATE"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["TODO", "IN_PROGRESS", "DONE"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      updateTask(task.id, { status });
                      setTasks(getTasks());
                    }}
                    className={`rounded-[16px] border px-3 py-3 text-[11px] font-semibold ${
                      task.status === status ? "border-white/12 bg-white text-black" : "border-white/10 bg-[#111] text-white/65"
                    }`}
                  >
                    {status === "IN_PROGRESS" ? "IN PROGRESS" : status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
