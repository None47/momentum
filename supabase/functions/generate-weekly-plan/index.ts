import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface WeeklyPlanPayload {
  sleep_avg: number | null;
  weak_category: string | null;
  last_week_summary: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<WeeklyPlanPayload>(request);
    const system = `Generate Goutham's 7-day study plan.
Account for: college 8:30-2:30, library 3:30-8 PM. Max 2 LC problems per day.
One specific learning task per day.
Name exact problems by number.
Name exact videos by channel + duration.
Monday = hardest topic. Sunday = rest.
If sleep avg < 6hrs: reduce intensity 30%.
If weak in [category]: add 3 from there.
Format: 7 days, 4 lines max each.`;

    const prompt = `Sleep average: ${payload.sleep_avg ?? "unknown"}
Weak category: ${payload.weak_category ?? "none"}
Last week summary: ${payload.last_week_summary}`;

    const planText = await callClaudeText({ system, prompt, maxTokens: 500, temperature: 0.45 });
    const plan = planText.split("\n").map((line) => line.trim()).filter(Boolean);
    return jsonOk({ planText, plan });
  } catch (error) {
    return jsonError("Failed to generate weekly plan.", 500, error instanceof Error ? error.message : String(error));
  }
});
