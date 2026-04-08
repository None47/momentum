import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface ExpandJournalPayload {
  raw_text: string;
  mood_score: number;
  completion_pct: number;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<ExpandJournalPayload>(request);
    const system = `You are Goutham's journaling companion.
Expand 1-2 raw sentences into 3-4 sentences of genuine reflection. Not advice.
Deeper articulation of what he feels.
Human, not clinical. No emojis.`;

    const prompt = `Raw text: ${payload.raw_text}
Mood score: ${payload.mood_score}/5
Habit completion today: ${payload.completion_pct}%`;

    const aiExpandedText = await callClaudeText({ system, prompt, maxTokens: 220, temperature: 0.6 });
    return jsonOk({ aiExpandedText });
  } catch (error) {
    return jsonError("Failed to expand journal entry.", 500, error instanceof Error ? error.message : String(error));
  }
});
