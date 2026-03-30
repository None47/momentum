"use client";

import { useState, useMemo, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROADMAP_TOPICS, PHASE_META, type RoadmapTopic, type TopicStatus, type PhaseNumber, type LCProblem, type Resource } from "@/lib/roadmap-data";
import { setTopicStatus, getAllTopicStatuses, getSubtopicsDone, toggleSubtopic, getLCDone, toggleLC, getTopicNotes, setTopicNotes, getLCCounter, incrementLC, decrementLC, type LCCounter } from "@/lib/roadmap-store";
import { getDaysToPlacement } from "@/lib/constants";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { getScore } from "@/lib/store";

type FilterMode = "ALL" | 1 | 2 | 3 | 4 | "IN_PROGRESS" | "DONE";

const STATUS_CYCLE: TopicStatus[] = ["NOT_STARTED", "IN_PROGRESS", "DONE"];
const STATUS_LABELS: Record<TopicStatus, string> = { NOT_STARTED: "NOT STARTED", IN_PROGRESS: "IN PROGRESS", DONE: "DONE" };
const STATUS_COLORS: Record<TopicStatus, string> = { NOT_STARTED: "#525252", IN_PROGRESS: "#fbbf24", DONE: "#10b981" };
const DIFF_COLORS: Record<string, string> = { Easy: "#10b981", Medium: "#fbbf24", Hard: "#ef4444" };
const RES_ICONS: Record<string, string> = { youtube: "▶", website: "🌐", book: "📖", course: "🎓" };

export default function RoadmapPage() {
  const score = useSyncExternalStore(
    () => () => {},
    () => getScore(),
    () => 0,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>(() => getAllTopicStatuses());
  const [subtopics, setSubtopics] = useState<Record<string, boolean[]>>(() => {
    const s: Record<string, boolean[]> = {};
    ROADMAP_TOPICS.forEach((t) => {
      s[t.id] = getSubtopicsDone(t.id, t.subtopics.length);
    });
    return s;
  });
  const [lcChecks, setLcChecks] = useState<Record<string, boolean[]>>(() => {
    const l: Record<string, boolean[]> = {};
    ROADMAP_TOPICS.forEach((t) => {
      l[t.id] = getLCDone(t.id, t.leetcode.length);
    });
    return l;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const n: Record<string, string> = {};
    ROADMAP_TOPICS.forEach((t) => {
      n[t.id] = getTopicNotes(t.id);
    });
    return n;
  });
  const [lcCounter, setLcCounter] = useState<LCCounter>(() => getLCCounter());

  const handleStatusCycle = useCallback((topicId: string) => {
    const current = statuses[topicId] || "NOT_STARTED";
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    const next = STATUS_CYCLE[nextIdx];
    setTopicStatus(topicId, next);
    setStatuses((prev) => ({ ...prev, [topicId]: next }));
  }, [statuses]);

  const handleSubtopicToggle = useCallback((topicId: string, idx: number, count: number) => {
    const updated = toggleSubtopic(topicId, idx, count);
    setSubtopics((prev) => ({ ...prev, [topicId]: [...updated] }));
  }, []);

  const handleLCToggle = useCallback((topicId: string, idx: number, count: number) => {
    const updated = toggleLC(topicId, idx, count);
    setLcChecks((prev) => ({ ...prev, [topicId]: [...updated] }));
  }, []);

  const handleNotesChange = useCallback((topicId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [topicId]: text }));
    setTopicNotes(topicId, text);
  }, []);

  const handleMarkAllDone = useCallback((topic: RoadmapTopic) => {
    setTopicStatus(topic.id, "DONE");
    setStatuses((prev) => ({ ...prev, [topic.id]: "DONE" }));
    const allSubs = new Array(topic.subtopics.length).fill(true);
    const allLC = new Array(topic.leetcode.length).fill(true);
    setSubtopics((prev) => ({ ...prev, [topic.id]: allSubs }));
    setLcChecks((prev) => ({ ...prev, [topic.id]: allLC }));
    // persist
    allSubs.forEach((_, i) => {
      if (!subtopics[topic.id]?.[i]) toggleSubtopic(topic.id, i, topic.subtopics.length);
    });
    allLC.forEach((_, i) => {
      if (!lcChecks[topic.id]?.[i]) toggleLC(topic.id, i, topic.leetcode.length);
    });
  }, [subtopics, lcChecks]);

  const handleLCCount = useCallback((diff: "easy" | "medium" | "hard", inc: boolean) => {
    const updated = inc ? incrementLC(diff) : decrementLC(diff);
    setLcCounter({ ...updated });
  }, []);

  // Filtered topics
  const filteredTopics = useMemo(() => {
    let topics = ROADMAP_TOPICS;
    if (search) {
      const q = search.toLowerCase();
      topics = topics.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (filter === "IN_PROGRESS") topics = topics.filter((t) => (statuses[t.id] || "NOT_STARTED") === "IN_PROGRESS");
    else if (filter === "DONE") topics = topics.filter((t) => (statuses[t.id] || "NOT_STARTED") === "DONE");
    else if (typeof filter === "number") topics = topics.filter((t) => t.phase === filter);
    return topics;
  }, [search, filter, statuses]);

  // Phase stats
  const phaseStats = useMemo(() => {
    const result: Record<number, { total: number; done: number }> = {};
    ([1, 2, 3, 4] as PhaseNumber[]).forEach((p) => {
      const phaseTopics = ROADMAP_TOPICS.filter((t) => t.phase === p);
      const done = phaseTopics.filter((t) => (statuses[t.id] || "NOT_STARTED") === "DONE").length;
      result[p] = { total: phaseTopics.length, done };
    });
    return result;
  }, [statuses]);

  const totalDone = Object.values(statuses).filter((s) => s === "DONE").length;
  const totalTopics = ROADMAP_TOPICS.length;
  const totalLC = lcCounter.easy + lcCounter.medium + lcCounter.hard;
  const totalHours = ROADMAP_TOPICS.reduce((a, t) => a + t.estimatedHours, 0);

  return (
    <div className="min-h-screen pb-36">
      <Header score={score} />

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Title */}
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">THE ROADMAP</h1>
        <p className="text-[10px] text-[#525252] mb-4">{totalDone}/{totalTopics} topics · ~{totalHours} total hours · {getDaysToPlacement()} days left</p>

        {/* Global stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold text-[#e5e5e5] tabular-nums">{totalDone}</span>
            <p className="text-[8px] text-[#525252]">TOPICS DONE</p>
          </div>
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold text-[#3b82f6] tabular-nums">{totalLC}</span>
            <p className="text-[8px] text-[#525252]">LC SOLVED</p>
          </div>
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold text-[#fbbf24] tabular-nums">{Math.round((totalDone / totalTopics) * 100)}%</span>
            <p className="text-[8px] text-[#525252]">PROGRESS</p>
          </div>
        </div>

        {/* LC Counter */}
        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] tracking-[0.15em] text-[#525252] uppercase">LeetCode Counter</span>
            <span className="text-sm font-bold text-[#e5e5e5] tabular-nums">{totalLC} <span className="text-[#525252] text-[10px]">/ 750</span></span>
          </div>
          <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-[#10b981] via-[#fbbf24] to-[#ef4444] transition-all duration-500" style={{ width: `${Math.min(100, (totalLC / 750) * 100)}%` }} />
          </div>
          <div className="flex gap-3">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <div key={d} className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase" style={{ color: DIFF_COLORS[d.charAt(0).toUpperCase() + d.slice(1)] }}>{d}</span>
                  <span className="text-sm font-bold text-[#e5e5e5] ml-2 tabular-nums">{lcCounter[d]}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleLCCount(d, false)} className="w-5 h-5 border border-[#1a1a1a] rounded-sm text-[10px] text-[#525252] hover:text-[#e5e5e5] hover:border-[#525252] transition-colors">−</button>
                  <button onClick={() => handleLCCount(d, true)} className="w-5 h-5 border border-[#1a1a1a] rounded-sm text-[10px] text-[#525252] hover:text-[#e5e5e5] hover:border-[#525252] transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics..."
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm px-3 py-2 text-[11px] text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#3b82f6] transition-colors mb-3"
        />

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
          {([["ALL", "All"], [1, "Phase 1"], [2, "Phase 2"], [3, "Phase 3"], [4, "Phase 4"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"]] as [FilterMode, string][]).map(([val, label]) => (
            <button key={String(val)} onClick={() => setFilter(val)}
              className={`px-2.5 py-1 text-[9px] tracking-[0.1em] whitespace-nowrap rounded-sm border transition-colors ${filter === val ? "border-[#e5e5e5] text-[#e5e5e5] bg-[#1a1a1a]" : "border-[#1a1a1a] text-[#525252] hover:text-[#737373]"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Phase sections */}
        {([1, 2, 3, 4] as PhaseNumber[]).map((phase) => {
          const phaseTopics = filteredTopics.filter((t) => t.phase === phase);
          if (phaseTopics.length === 0) return null;
          const meta = PHASE_META[phase];
          const stats = phaseStats[phase];
          const phasePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

          return (
            <div key={phase} className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[10px] tracking-[0.25em] font-bold" style={{ color: meta.color }}>PHASE {phase}: {meta.label}</h2>
                <span className="text-[9px] text-[#525252] tabular-nums">{stats.done}/{stats.total} · {phasePct}%</span>
              </div>
              <p className="text-[8px] text-[#525252] mb-1">{meta.dateRange} · {meta.target}</p>
              <div className="h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
                <div className="h-full transition-all duration-700" style={{ width: `${phasePct}%`, backgroundColor: meta.color }} />
              </div>

              <div className="space-y-1">
                {phaseTopics.map((topic) => {
                  const status = statuses[topic.id] || "NOT_STARTED";
                  const subs = subtopics[topic.id] || new Array(topic.subtopics.length).fill(false);
                  const lcs = lcChecks[topic.id] || new Array(topic.leetcode.length).fill(false);
                  const subsDone = subs.filter(Boolean).length;
                  const lcsDone = lcs.filter(Boolean).length;
                  const isExpanded = expandedId === topic.id;

                  return (
                    <div key={topic.id} className={`border rounded-sm transition-colors ${isExpanded ? "border-[#2a2a2a] bg-[#0a0a0a]" : "border-[#1a1a1a] bg-[#0d0d0d]"}`}
                      style={{ borderLeftWidth: "2px", borderLeftColor: meta.color }}>

                      {/* Collapsed header */}
                      <button onClick={() => setExpandedId(isExpanded ? null : topic.id)} className="w-full px-3 py-2.5 flex items-center gap-2 text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-medium truncate ${status === "DONE" ? "text-[#525252] line-through" : "text-[#e5e5e5]"}`}>{topic.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] px-1 py-0.5 rounded-sm bg-[#1a1a1a]" style={{ color: meta.color }}>{topic.category}</span>
                            <span className="text-[8px] text-[#525252]">{topic.estimatedHours}h</span>
                            {topic.subtopics.length > 0 && <span className="text-[8px] text-[#525252]">{subsDone}/{topic.subtopics.length}</span>}
                            {topic.leetcode.length > 0 && <span className="text-[8px] text-[#3b82f6]">{lcsDone}/{topic.leetcode.length} LC</span>}
                          </div>
                        </div>
                        <span className="text-[8px] tracking-[0.1em] font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0" style={{ color: STATUS_COLORS[status], backgroundColor: `${STATUS_COLORS[status]}15` }}>{STATUS_LABELS[status]}</span>
                        <span className="text-[10px] text-[#525252] flex-shrink-0">{isExpanded ? "▾" : "▸"}</span>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-3 pb-3 border-t border-[#1a1a1a] pt-3">

                              {/* Status toggle */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] text-[#525252]">Status:</span>
                                <button onClick={() => handleStatusCycle(topic.id)}
                                  className="text-[10px] font-bold tracking-[0.1em] px-2 py-1 rounded-sm border transition-colors"
                                  style={{ color: STATUS_COLORS[status], borderColor: `${STATUS_COLORS[status]}40`, backgroundColor: `${STATUS_COLORS[status]}10` }}>
                                  {STATUS_LABELS[status]} →
                                </button>
                                <span className="text-[8px] text-[#525252] ml-auto">Est: {topic.estimatedHours}h</span>
                              </div>

                              {/* Subtopics */}
                              {topic.subtopics.length > 0 && (
                                <div className="mb-3">
                                  <span className="text-[9px] tracking-[0.15em] text-[#737373] uppercase">Subtopics</span>
                                  <div className="mt-1 space-y-0.5">
                                    {topic.subtopics.map((sub, i) => (
                                      <button key={i} onClick={() => handleSubtopicToggle(topic.id, i, topic.subtopics.length)}
                                        className="w-full flex items-center gap-2 py-1 px-1 rounded-sm hover:bg-[#1a1a1a] transition-colors text-left">
                                        <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center flex-shrink-0 text-[8px] ${subs[i] ? "bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]" : "border-[#2a2a2a]"}`}>
                                          {subs[i] ? "✓" : ""}
                                        </span>
                                        <span className={`text-[11px] ${subs[i] ? "text-[#525252] line-through" : "text-[#d4d4d4]"}`}>{sub}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Resources */}
                              {topic.resources.length > 0 && (
                                <div className="mb-3">
                                  <span className="text-[9px] tracking-[0.15em] text-[#737373] uppercase">Resources</span>
                                  <div className="mt-1 space-y-1">
                                    {topic.resources.map((res: Resource, i: number) => (
                                      <a key={i} href={res.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                                        <span className="text-[10px]">{RES_ICONS[res.type]}</span>
                                        <span className="truncate">{res.title}</span>
                                        <span className="text-[8px] text-[#525252] flex-shrink-0">{res.type.toUpperCase()}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* LeetCode problems */}
                              {topic.leetcode.length > 0 && (
                                <div className="mb-3">
                                  <span className="text-[9px] tracking-[0.15em] text-[#737373] uppercase">LeetCode Problems</span>
                                  <div className="mt-1 space-y-0.5">
                                    {topic.leetcode.map((lc: LCProblem, i: number) => (
                                      <button key={i} onClick={() => handleLCToggle(topic.id, i, topic.leetcode.length)}
                                        className="w-full flex items-center gap-2 py-1 px-1 rounded-sm hover:bg-[#1a1a1a] transition-colors text-left">
                                        <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center flex-shrink-0 text-[8px] ${lcs[i] ? "bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]" : "border-[#2a2a2a]"}`}>
                                          {lcs[i] ? "✓" : ""}
                                        </span>
                                        <a href={`https://leetcode.com/problems/${lc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                          className={`text-[11px] flex-1 ${lcs[i] ? "text-[#525252] line-through" : "text-[#d4d4d4] hover:text-[#3b82f6]"}`}>
                                          #{lc.id} {lc.title}
                                        </a>
                                        <span className="text-[8px] font-bold" style={{ color: DIFF_COLORS[lc.difficulty] }}>{lc.difficulty[0]}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div className="mb-3">
                                <span className="text-[9px] tracking-[0.15em] text-[#737373] uppercase">Notes</span>
                                <textarea
                                  value={notes[topic.id] || ""}
                                  onChange={(e) => handleNotesChange(topic.id, e.target.value)}
                                  placeholder="Your notes..."
                                  rows={2}
                                  className="w-full mt-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm px-2 py-1.5 text-[11px] text-[#d4d4d4] placeholder-[#525252] resize-none focus:outline-none focus:border-[#3b82f6] transition-colors"
                                />
                              </div>

                              {/* Mark all done */}
                              <button onClick={() => handleMarkAllDone(topic)}
                                className="w-full py-2 text-[10px] tracking-[0.15em] font-bold border border-[#10b981]/30 text-[#10b981] rounded-sm hover:bg-[#10b981]/10 transition-colors">
                                MARK ALL DONE ✓
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {/* Referral readiness bar */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-2">
          <ReferralMeter lcCount={totalLC} projectsDone={Object.values(statuses).filter(s => s === "DONE").length} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function ReferralMeter({ lcCount, projectsDone }: { lcCount: number; projectsDone: number }) {
  const meters = [
    { label: "LeetCode", value: lcCount, target: 300, color: "#3b82f6" },
    { label: "Projects", value: Math.min(projectsDone, 5), target: 5, color: "#a855f7" },
    { label: "CGPA", value: 6.5, target: 7.5, color: "#f97316" },
  ];

  const allReady = meters.every((m) => m.value >= m.target);
  const needed: string[] = [];
  if (lcCount < 300) needed.push(`${300 - lcCount} LC`);
  if (projectsDone < 5) needed.push(`${5 - Math.min(projectsDone, 5)} projects`);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[8px] tracking-[0.15em] text-[#525252] uppercase">Referral Readiness</span>
        <span className={`text-[8px] tracking-[0.1em] font-bold ${allReady ? "text-[#fbbf24]" : "text-[#ef4444]"}`}>
          {allReady ? "✦ READY TO USE" : `NOT READY — ${needed.join(" + ")} needed`}
        </span>
      </div>
      <div className="flex gap-2">
        {meters.map((m) => (
          <div key={m.label} className="flex-1">
            <div className="flex items-center justify-between text-[7px] text-[#525252] mb-0.5">
              <span>{m.label}</span><span>{m.value}/{m.target}</span>
            </div>
            <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%`, backgroundColor: m.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
