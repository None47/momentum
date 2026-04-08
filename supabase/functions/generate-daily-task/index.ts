import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface DailyTaskPayload {
  current_day: number;
  phase: number;
  lc_count: number;
  weak_categories: string[];
  recent_completions: string[];
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<DailyTaskPayload>(request);
    const system = `Generate ONE specific task for Goutham today.
Rules: completable in 45-90 min. Specific problem name or video. No generic advice.
Format: WHAT + HOW LONG + WHY NOW.
Max 3 sentences.`;

    const prompt = `Current day: ${payload.current_day}
Phase: ${payload.phase}
LeetCode count: ${payload.lc_count}
Weak categories: ${payload.weak_categories.join(", ") || "none"}
Recent completions: ${payload.recent_completions.join(", ") || "none"}`;

    const task = await callClaudeText({ system, prompt, maxTokens: 160, temperature: 0.45 });
    return jsonOk({ task });
  } catch (error) {
    return jsonError("Failed to generate daily task.", 500, error instanceof Error ? error.message : String(error));
  }
});
