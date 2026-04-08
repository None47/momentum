import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface OaFeedbackPayload {
  problem_text: string;
  user_approach: string;
  time_used: number;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<OaFeedbackPayload>(request);
    const system = `Evaluate an online assessment submission for an SDE candidate.
Return a pass/fail recommendation plus specific feedback.
Be concrete about correctness risk, complexity, and implementation gaps.`;

    const prompt = `Problem:
${payload.problem_text}

User approach:
${payload.user_approach}

Time used: ${payload.time_used} minutes

Return:
Result: PASS or FAIL
Feedback:
Next fix:`;

    const feedback = await callClaudeText({ system, prompt, maxTokens: 280, temperature: 0.35 });
    const passFail = /\bPASS\b/i.test(feedback) && !/\bFAIL\b/i.test(feedback) ? "PASS" : /\bFAIL\b/i.test(feedback) ? "FAIL" : null;
    return jsonOk({ passFail, feedback });
  } catch (error) {
    return jsonError("Failed to generate OA feedback.", 500, error instanceof Error ? error.message : String(error));
  }
});
