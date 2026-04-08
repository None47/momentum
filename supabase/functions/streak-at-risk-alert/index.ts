import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface StreakAlertPayload {
  habitName: string;
  streakDays: number;
  hoursLeft: number;
  isCritical: boolean;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<StreakAlertPayload>(request);
    const system = `Write one sentence for a red danger banner inside a high-discipline productivity app.
No emojis.
No fluff.
Use exact numbers.
If the habit is medical, sound more urgent without sounding melodramatic.`;

    const prompt = `Habit: ${payload.habitName}
Current streak: ${payload.streakDays} days
Hours left before midnight: ${payload.hoursLeft}
Critical medical habit: ${payload.isCritical ? "yes" : "no"}`;

    const message = await callClaudeText({ system, prompt, maxTokens: 70, temperature: 0.3 });
    return jsonOk({ message });
  } catch (error) {
    return jsonError("Failed to generate streak alert.", 500, error instanceof Error ? error.message : String(error));
  }
});
