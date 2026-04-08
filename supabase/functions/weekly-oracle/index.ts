import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface WeeklyOraclePayload {
  dayNumber: number;
  lcCount: number;
  completionsSummary: string;
  moodAverage: number | null;
  patternDetections: string[];
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<WeeklyOraclePayload>(request);
    const system = `You are Goutham's weekly analyst.
He is on Day ${payload.dayNumber} of 577 to ₹60L.
Referral unlocks at 300 LC — he has ${payload.lcCount}.
Give 4 sentences:
1. One specific data point he crushed
2. The single thing that held him back
3. What this means for October 2026 deadline
4. One precise action for next week only.
No fluff. Reference exact numbers.`;

    const prompt = `Weekly completions: ${payload.completionsSummary}
Mood average: ${payload.moodAverage ?? "unknown"}
Pattern detections: ${payload.patternDetections.join(", ") || "none"}`;

    const aiAnalysis = await callClaudeText({ system, prompt, maxTokens: 220, temperature: 0.35 });
    return jsonOk({ aiAnalysis });
  } catch (error) {
    return jsonError("Failed to generate weekly oracle.", 500, error instanceof Error ? error.message : String(error));
  }
});
