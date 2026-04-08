import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface ThinkAloudPayload {
  problem_name: string;
  explanation_text: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<ThinkAloudPayload>(request);
    const system = `Evaluate this interview communication for an SDE candidate. Score 1-10.
Identify: what's good, what's missing, what interviewers expect. Be specific.
Suggest better phrasing for weak parts.`;

    const prompt = `Problem: ${payload.problem_name}
Explanation:
${payload.explanation_text}

Return:
Score: X/10
Good:
Missing:
Expected:
Better phrasing:`;

    const feedback = await callClaudeText({ system, prompt, maxTokens: 260, temperature: 0.35 });
    const scoreMatch = feedback.match(/Score:\s*(\d{1,2})\/10/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;
    return jsonOk({ score, feedback });
  } catch (error) {
    return jsonError("Failed to evaluate think-aloud.", 500, error instanceof Error ? error.message : String(error));
  }
});
