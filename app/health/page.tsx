"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { getTodayDate } from "@/lib/constants";
import { getScore } from "@/lib/store";
import { getBodyMetrics, addBodyMetric, getMedCompletions, toggleMed, getMedStreak, getMedConsecutiveMissed, getCalorieLog, addMealEntry, getTodayCalories, type BodyMetricEntry, type MealEntry } from "@/lib/health-store";
import { getGymThisWeek } from "@/lib/gym-store";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

import GymTracker from "@/components/health/GymTracker";

const MEDS = [
  { id: "thyronorm", label: "Thyronorm 37.5mcg", time: "5:30 AM", critical: true, icon: "💊" },
  { id: "scelepra", label: "S-Celepra 10mg", time: "Breakfast", critical: true, icon: "💊" },
  { id: "neurobion", label: "Neurobion Forte", time: "After lunch", critical: false, icon: "💊" },
  { id: "amigold", label: "Amigold 100mg", time: "9:00 PM", critical: false, icon: "💊" },
  { id: "vitamind", label: "Vitamin D 60,000 IU", time: "Sunday only", critical: false, icon: "💊" },
];

const QUICK_MEALS: { label: string; cal: number }[] = [
  { label: "Oats bowl", cal: 380 }, { label: "6 eggs", cal: 420 }, { label: "Protein shake", cal: 150 },
  { label: "Curd bowl", cal: 180 }, { label: "Rice + dal", cal: 550 }, { label: "Chicken meal", cal: 480 },
  { label: "Banana x2", cal: 180 }, { label: "Peanut butter toast", cal: 320 },
];

export default function HealthPage() {
  const today = getTodayDate();
  const [mounted, setMounted] = useState(false);
  const [score, setScoreVal] = useState(0);
  const [section, setSection] = useState<"meds" | "body" | "gym" | "calories">("meds");

  // Meds state
  const [medsDone, setMedsDone] = useState<string[]>([]);
  const [medStreaks, setMedStreaks] = useState<Record<string, number>>({});

  // Body metrics
  const [metrics, setMetrics] = useState<BodyMetricEntry[]>([]);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [mf, setMf] = useState({ weight: 96, energy: 3, mood: 3, tsh: "", testosterone: "" });

  // Calories
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [todayCal, setTodayCal] = useState(0);

  useEffect(() => {
    setMounted(true);
    setScoreVal(getScore());
    setMedsDone(getMedCompletions(today));
    const streaks: Record<string, number> = {};
    MEDS.forEach((m) => { streaks[m.id] = getMedStreak(m.id); });
    setMedStreaks(streaks);
    setMetrics(getBodyMetrics());
    setMeals(getCalorieLog(today));
    setTodayCal(getTodayCalories(today));
  }, [today]);

  const handleMedToggle = (medId: string) => {
    const updated = toggleMed(today, medId);
    setMedsDone([...updated]);
    setMedStreaks((prev) => ({ ...prev, [medId]: getMedStreak(medId) }));
  };

  const handleAddMetric = () => {
    const entry: BodyMetricEntry = { date: today, weight: mf.weight, energy: mf.energy, mood: mf.mood, tsh: mf.tsh ? parseFloat(mf.tsh) : undefined, testosterone: mf.testosterone ? parseFloat(mf.testosterone) : undefined };
    addBodyMetric(entry);
    setMetrics(getBodyMetrics());
    setShowMetricForm(false);
  };

  const handleQuickMeal = (meal: { label: string; cal: number }, mealTime: MealEntry["meal"]) => {
    addMealEntry(today, { label: meal.label, calories: meal.cal, meal: mealTime });
    setMeals(getCalorieLog(today));
    setTodayCal(getTodayCalories(today));
  };

  // Weight chart data
  const weightData = useMemo(() => {
    if (metrics.length === 0) return [{ date: "Start", weight: 96 }];
    return metrics.map((m) => ({ date: m.date.slice(5), weight: m.weight }));
  }, [metrics]);

  const latestWeight = metrics.length > 0 ? metrics[metrics.length - 1].weight : 96;
  const gymThisWeek = getGymThisWeek();
  const allMedsDoneToday = MEDS.every((m) => medsDone.includes(m.id));
  const medStreakMin = Object.values(medStreaks).length > 0 ? Math.min(...Object.values(medStreaks)) : 0;
  const calColor = todayCal < 1800 ? "#ef4444" : todayCal <= 2400 ? "#10b981" : "#fbbf24";

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><span className="text-[11px] text-[#525252] tracking-widest">MOMENTUM</span></div>;

  return (
    <div className="min-h-screen pb-20">
      <Header score={score} />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-sm tracking-[0.3em] text-[#e5e5e5] font-bold mb-1">HEALTH</h1>
        <p className="text-[10px] text-[#525252] mb-4">Body is the vehicle. Maintain it.</p>

        {/* Top cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold text-[#e5e5e5] tabular-nums">{latestWeight}</span>
            <p className="text-[7px] text-[#525252]">KG → 82</p>
            <div className="h-[2px] bg-[#1a1a1a] mt-1 rounded-full overflow-hidden"><div className="h-full bg-[#10b981]" style={{ width: `${Math.max(0, Math.min(100, ((96 - latestWeight) / 14) * 100))}%` }} /></div>
          </div>
          <div className={`border rounded-sm p-2 text-center ${allMedsDoneToday ? "border-[#10b981]/30 bg-[#0a1a0a]" : "border-[#ef4444]/30 bg-[#1a0808]"}`}>
            <span className={`text-lg font-bold tabular-nums ${allMedsDoneToday ? "text-[#10b981]" : "text-[#ef4444]"}`}>{medStreakMin}</span>
            <p className="text-[7px] text-[#525252]">MED STREAK</p>
          </div>
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold text-[#3b82f6] tabular-nums">{gymThisWeek}</span>
            <p className="text-[7px] text-[#525252]">GYM / 5</p>
          </div>
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-2 text-center">
            <span className="text-lg font-bold tabular-nums" style={{ color: calColor }}>{todayCal}</span>
            <p className="text-[7px] text-[#525252]">CAL TODAY</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-4">
          {(["meds", "body", "gym", "calories"] as const).map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`flex-1 py-1.5 text-[9px] tracking-[0.1em] uppercase border rounded-sm transition-colors ${section === s ? "border-[#e5e5e5] text-[#e5e5e5] bg-[#1a1a1a]" : "border-[#1a1a1a] text-[#525252]"}`}>{s}</button>
          ))}
        </div>

        {/* MEDS Section */}
        {section === "meds" && (
          <div className="space-y-1.5">
            {MEDS.map((med) => {
              const done = medsDone.includes(med.id);
              const streak = medStreaks[med.id] || 0;
              const missed = getMedConsecutiveMissed(med.id);
              const showWarning = med.id === "scelepra" && missed >= 2;
              return (
                <div key={med.id} className={`border rounded-sm p-3 ${med.critical ? "border-l-2 border-l-[#ef4444]" : ""} ${done ? "border-[#10b981]/20 bg-[#0a1a0a]" : "border-[#1a1a1a] bg-[#0d0d0d]"}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleMedToggle(med.id)} className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${done ? "bg-[#10b981]/20 border-[#10b981]/40" : "border-[#2a2a2a]"}`}>
                      {done && <span className="text-[10px] text-[#10b981]">✓</span>}
                    </button>
                    <div className="flex-1">
                      <span className={`text-[11px] ${done ? "text-[#525252] line-through" : "text-[#e5e5e5]"}`}>{med.icon} {med.label}</span>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[8px] text-[#525252]">{med.time}</span>
                        {med.critical && <span className="text-[8px] text-[#ef4444] font-bold">CRITICAL</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums ${streak >= 7 ? "text-[#10b981]" : "text-[#525252]"}`}>{streak}d</span>
                  </div>
                  {showWarning && (
                    <div className="mt-2 px-2 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-sm">
                      <p className="text-[9px] text-[#ef4444] font-bold">⚠ YOU STOPPED THIS BEFORE. DO NOT STOP AGAIN.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BODY Section */}
        {section === "body" && (
          <div>
            <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 mb-4">
              <span className="text-[9px] tracking-[0.15em] text-[#525252] uppercase">Weight Trend</span>
              <div className="flex items-end gap-2 mt-1 mb-2">
                <span className="text-2xl font-bold text-[#e5e5e5] tabular-nums">{latestWeight}</span>
                <span className="text-[10px] text-[#525252] mb-1">kg → 82kg target</span>
              </div>
              {metrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={weightData}><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} /><YAxis domain={[78, 100]} tick={{ fontSize: 8, fill: "#525252" }} axisLine={false} tickLine={false} width={25} /><ReferenceLine y={82} stroke="#10b981" strokeDasharray="3 3" /><Tooltip contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", fontSize: 10 }} /><Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} /></LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[10px] text-[#525252] text-center py-8">Log your first weigh-in to start tracking</p>
              )}
            </div>
            <button onClick={() => setShowMetricForm(!showMetricForm)} className="w-full py-2 text-[10px] tracking-[0.15em] border border-[#1a1a1a] text-[#e5e5e5] rounded-sm hover:bg-[#1a1a1a] transition-colors mb-3">+ LOG BODY METRICS</button>
            <AnimatePresence>
              {showMetricForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm p-3 mb-3 space-y-2">
                    <NumInput label="Weight (kg)" value={mf.weight} onChange={(v) => setMf({ ...mf, weight: v })} min={50} max={150} step={0.5} />
                    <NumInput label="Energy (1-5)" value={mf.energy} onChange={(v) => setMf({ ...mf, energy: v })} min={1} max={5} />
                    <NumInput label="Mood (1-5)" value={mf.mood} onChange={(v) => setMf({ ...mf, mood: v })} min={1} max={5} />
                    <div><label className="text-[9px] text-[#525252]">TSH (optional)</label><input type="text" value={mf.tsh} onChange={(e) => setMf({ ...mf, tsh: e.target.value })} placeholder="e.g. 4.2" className="w-full mt-1 bg-transparent border border-[#1a1a1a] rounded-sm px-2 py-1.5 text-[11px] text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#3b82f6]" /></div>
                    <button onClick={handleAddMetric} className="w-full py-2 text-[10px] tracking-[0.15em] bg-[#3b82f6] text-white rounded-sm hover:bg-[#2563eb] transition-colors">SAVE</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* History */}
            {metrics.slice().reverse().slice(0, 10).map((m, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a] text-[10px]">
                <span className="text-[#525252]">{m.date}</span>
                <span className="text-[#e5e5e5] font-bold tabular-nums">{m.weight}kg</span>
                <span className="text-[#525252]">E:{m.energy} M:{m.mood}</span>
              </div>
            ))}
          </div>
        )}

        {/* GYM Section */}
        {section === "gym" && (
          <div className="mb-8">
            <GymTracker bodyMetrics={metrics} />
          </div>
        )}

        {/* CALORIES Section */}
        {section === "calories" && (
          <div>
            <div className="border rounded-sm p-4 mb-4" style={{ borderColor: `${calColor}30`, backgroundColor: `${calColor}08` }}>
              <div className="flex items-end justify-between">
                <div><span className="text-3xl font-bold tabular-nums" style={{ color: calColor }}>{todayCal}</span><span className="text-[10px] text-[#525252] ml-2">/ 2,200 cal</span></div>
                <span className="text-[9px] font-bold" style={{ color: calColor }}>{todayCal < 1800 ? "UNDEREATING" : todayCal <= 2400 ? "ON TARGET" : "OVER"}</span>
              </div>
              <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden mt-2"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (todayCal / 2400) * 100)}%`, backgroundColor: calColor }} /></div>
            </div>
            {/* Quick add */}
            <span className="text-[9px] tracking-[0.15em] text-[#525252] uppercase mb-2 block">Quick Add</span>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {QUICK_MEALS.map((meal) => (
                <button key={meal.label} onClick={() => handleQuickMeal(meal, "afternoon")} className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-sm px-2 py-2 text-left hover:bg-[#1a1a1a] transition-colors">
                  <span className="text-[10px] text-[#e5e5e5]">+{meal.label}</span>
                  <span className="text-[9px] text-[#525252] ml-1">({meal.cal}cal)</span>
                </button>
              ))}
            </div>
            {/* Today's log */}
            <span className="text-[9px] tracking-[0.15em] text-[#525252] uppercase mb-2 block">Today&apos;s Meals</span>
            {meals.length > 0 ? meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a] text-[10px]">
                <span className="text-[#e5e5e5]">{m.label}</span>
                <span className="text-[#fbbf24] font-bold tabular-nums">{m.calories} cal</span>
              </div>
            )) : <p className="text-[10px] text-[#525252] text-center py-6">Tap a quick-add button above to log your first meal</p>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-[9px] text-[#525252]">{label}</label>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(min, value - step))} className="w-6 h-6 border border-[#1a1a1a] rounded-sm text-[11px] text-[#525252] hover:text-[#e5e5e5] hover:border-[#525252] transition-colors">−</button>
        <span className="w-10 text-center text-[11px] text-[#e5e5e5] font-bold tabular-nums">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="w-6 h-6 border border-[#1a1a1a] rounded-sm text-[11px] text-[#525252] hover:text-[#e5e5e5] hover:border-[#525252] transition-colors">+</button>
      </div>
    </div>
  );
}
