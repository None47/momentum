const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

function requireEnv(key: string): string {
  const value = Deno.env.get(key)?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export interface ClaudeTextParams {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callClaudeText({
  system,
  prompt,
  maxTokens = 350,
  temperature = 0.4,
}: ClaudeTextParams): Promise<string> {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.find((item) => item.type === "text")?.text?.trim();
  if (!text) {
    throw new Error("Anthropic response did not include text content.");
  }

  return text;
}
