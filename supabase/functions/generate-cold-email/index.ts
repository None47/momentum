import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface ColdEmailPayload {
  company: string;
  role: string;
  project_info: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<ColdEmailPayload>(request);
    const system = `Write a personalized cold email for a software role.
Plain text only.
Include a subject line.
Specific, respectful, and direct.
No fluff.`;

    const prompt = `Company: ${payload.company}
Role: ${payload.role}
Project info: ${payload.project_info}`;

    const email = await callClaudeText({ system, prompt, maxTokens: 220, temperature: 0.45 });
    return jsonOk({ email });
  } catch (error) {
    return jsonError("Failed to generate cold email.", 500, error instanceof Error ? error.message : String(error));
  }
});
