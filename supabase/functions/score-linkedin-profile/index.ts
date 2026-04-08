import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface LinkedinScorePayload {
  profile_data: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<LinkedinScorePayload>(request);
    const system = `Score a LinkedIn profile for internship and entry-level SDE opportunities.
Return a score and specific improvements.
Be concrete about headline, about section, proof, keywords, and credibility.`;

    const prompt = `Profile data:
${payload.profile_data}

Return:
Score: X/100
Strengths:
Gaps:
Top fixes:`;

    const feedback = await callClaudeText({ system, prompt, maxTokens: 240, temperature: 0.35 });
    const scoreMatch = feedback.match(/Score:\s*(\d{1,3})\/100/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;
    return jsonOk({ score, feedback });
  } catch (error) {
    return jsonError("Failed to score LinkedIn profile.", 500, error instanceof Error ? error.message : String(error));
  }
});
