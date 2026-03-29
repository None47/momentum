"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTodayDate } from "@/lib/constants";
import { getScore, getJournalEntry, saveJournalEntry, getAllJournalEntries } from "@/lib/store";
import { MOOD_SYMBOLS, MOOD_LABELS } from "@/lib/types";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import PhaseIndicator from "@/components/layout/PhaseIndicator";

export default function JournalPage() {
  const today = getTodayDate();

  const [mounted, setMounted] = useState(false);
  const [score, setScore] = useState(0);
  const [rawText, setRawText] = useState("");
  const [mood, setMood] = useState(3);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [allEntries, setAllEntries] = useState<Record<string, { raw: string; expanded: string | null; mood: number }>>({});

  useEffect(() => {
    setMounted(true);
    setScore(getScore());
    const entries = getAllJournalEntries();
    setAllEntries(entries);
    const todayEntry = entries[today];
    if (todayEntry) {
      setRawText(todayEntry.raw);
      setMood(todayEntry.mood);
    }
  }, [today]);

  const saveEntry = () => {
    if (!rawText.trim()) return;
    saveJournalEntry(today, { raw: rawText.trim(), expanded: null, mood });
    setAllEntries((prev) => ({ ...prev, [today]: { raw: rawText.trim(), expanded: null, mood } }));
  };

  const pastDates = useMemo(() => {
    return Object.keys(allEntries)
      .filter((d) => d !== today)
      .sort((a, b) => b.localeCompare(a));
  }, [allEntries, today]);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">
      <span className="text-[11px] text-[#525252] tracking-widest">MOMENTUM</span>
    </div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <PhaseIndicator />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">JOURNAL</h1>
        <p className="text-[10px] text-[#525252] mb-6">Write anything.</p>

        <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-4 mb-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onBlur={saveEntry}
            placeholder="Write anything. Even two lines."
            rows={3}
            className="w-full bg-transparent text-[12px] text-[#e5e5e5] placeholder-[#525252] resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex items-center gap-3 mt-3 mb-1">
            <span className="text-[9px] text-[#525252]">Mood:</span>
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => { setMood(m); }}
                className={`text-sm transition-all ${mood === m ? "text-[#e5e5e5] scale-125" : "text-[#525252]"}`}
                title={MOOD_LABELS[m]}
              >
                {MOOD_SYMBOLS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={saveEntry}
            disabled={!rawText.trim()}
            className="mt-2 text-[10px] tracking-[0.15em] text-[#3b82f6] hover:text-[#60a5fa] disabled:opacity-30 transition-colors"
          >
            SAVE →
          </button>
        </div>

        {/* Past entries */}
        <div className="space-y-2">
          {pastDates.map((date) => {
            const entry = allEntries[date];
            return (
              <div key={date} className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3">
                <button onClick={() => toggleExpand(date)} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#525252]">{date}</span>
                    <span className="text-sm">{MOOD_SYMBOLS[entry.mood]}</span>
                  </div>
                  <span className="text-[10px] text-[#525252]">{expandedDates.has(date) ? "▾" : "▸"}</span>
                </button>
                <p className="text-[11px] text-[#737373] mt-1 line-clamp-1">{entry.raw}</p>
                <AnimatePresence>
                  {expandedDates.has(date) && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-[#e5e5e5] mt-2 leading-relaxed">
                      {entry.raw}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
