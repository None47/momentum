import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface ResumeBulletPayload {
  project_title: string;
  stack: string[];
  description: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<ResumeBulletPayload>(request);
    const system = `Write one strong resume bullet in XYZ format for a software project.
Make it recruiter-readable.
Mention stack and visible impact.
One sentence only.`;

    const prompt = `Project title: ${payload.project_title}
Stack: ${payload.stack.join(", ")}
Description: ${payload.description}`;

    const resumeBullet = await callClaudeText({ system, prompt, maxTokens: 90, temperature: 0.35 });
    return jsonOk({ resumeBullet });
  } catch (error) {
    return jsonError("Failed to generate resume bullet.", 500, error instanceof Error ? error.message : String(error));
  }
});
