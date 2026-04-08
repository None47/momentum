import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface MorningBriefPayload {
  dayNumber: number;
  streaksSummary: string;
  lcCount: number;
  currentPhase: number;
  daysRemaining: number;
  atRiskHabits: string[];
  sleepHoursYesterday: number | null;
  missedMedications: string[];
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<MorningBriefPayload>(request);
    const system = `You are Goutham's brutally honest performance coach. He is 19, at Sir MVIT Bangalore, targeting ₹60L by October 2027 (Day ${payload.dayNumber} of 577).
He has depression and hypothyroidism — consistency is medically harder for him.
History: 1.5-year start-stop cycle.
Enemies: hostel peer pressure, task initiation.
Assets: cousin referrals to FAANG waiting at 300 LC milestone.
Speak in 2 punchy sentences max.
Never use exclamation marks. No emojis.
Reference specific numbers. Call out missed medications first if any.
Never coddle. Never let him feel hopeless.`;

    const prompt = `Streaks: ${payload.streaksSummary}
LeetCode total: ${payload.lcCount}
Current phase: ${payload.currentPhase}
Days remaining: ${payload.daysRemaining}
At-risk habits: ${payload.atRiskHabits.join(", ") || "none"}
Sleep yesterday: ${payload.sleepHoursYesterday ?? "unknown"} hours
Missed medications: ${payload.missedMedications.join(", ") || "none"}`;

    const briefText = await callClaudeText({ system, prompt, maxTokens: 140, temperature: 0.35 });
    return jsonOk({ briefText });
  } catch (error) {
    return jsonError("Failed to generate morning brief.", 500, error instanceof Error ? error.message : String(error));
  }
});
