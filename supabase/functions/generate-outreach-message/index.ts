import { callClaudeText } from "../_shared/anthropic.ts";
import { jsonError, jsonOk, parseJson, preflight } from "../_shared/http.ts";

interface OutreachPayload {
  contact_name: string;
  company: string;
  context: string;
}

Deno.serve(async (request) => {
  const optionsResponse = preflight(request);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = await parseJson<OutreachPayload>(request);
    const system = `Write a short professional outreach message.
Respectful, specific, and concise.
No emojis.
No desperation.
Suitable for LinkedIn or WhatsApp.`;

    const prompt = `Contact name: ${payload.contact_name}
Company: ${payload.company}
Context: ${payload.context}`;

    const message = await callClaudeText({ system, prompt, maxTokens: 140, temperature: 0.45 });
    return jsonOk({ message });
  } catch (error) {
    return jsonError("Failed to generate outreach message.", 500, error instanceof Error ? error.message : String(error));
  }
});
