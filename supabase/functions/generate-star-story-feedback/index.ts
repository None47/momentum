import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface StarStoryPayload {
  story_text: string;
  company: string;
  principle: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<StarStoryPayload>(request);
    const system = `Evaluate a behavioural interview answer using the STAR framework.
Be specific about missing context, ownership, metrics, and reflection.
Return actionable improvements.`;

    const prompt = `Company: ${payload.company}
Principle: ${payload.principle}
Story:
${payload.story_text}

Return:
STAR score: X/10
Situation:
Task:
Action:
Result:
Fix next:`;

    const feedback = await callClaudeText({ system, prompt, maxTokens: 260, temperature: 0.35 });
    const scoreMatch = feedback.match(/STAR score:\s*(\d{1,2})\/10/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;
    return jsonOk({ score, feedback });
  } catch (error) {
    return jsonError("Failed to generate STAR story feedback.", 500, error instanceof Error ? error.message : String(error));
  }
});
