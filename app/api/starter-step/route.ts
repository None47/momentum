interface StarterRequest {
  category?: string;
}

const FALLBACKS: Record<string, string> = {
  LEETCODE: "Okay. Just open your phone browser. That is step 1. Then open leetcode.com.",
  CODING: "Okay. Just open VS Code. Do not type anything yet. Opening it counts as the next step.",
  GYM: "Okay. Sit on the edge of the bed and put on one shoe. That is the whole step.",
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let payload: StarterRequest = {};

  try {
    payload = (await request.json()) as StarterRequest;
  } catch {
    payload = {};
  }

  if (!apiKey) {
    return Response.json({ step: FALLBACKS[payload.category ?? "CODING"] ?? FALLBACKS.CODING });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 120,
        system: "You are helping a depressed student with executive dysfunction start a task. Return one tiny step only. Keep it under 20 words.",
        messages: [
          {
            role: "user",
            content: `Task category: ${payload.category ?? "CODING"}. The user still cannot start. Give a smaller next step.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ step: FALLBACKS[payload.category ?? "CODING"] ?? FALLBACKS.CODING });
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const step = data.content?.find((item) => item.type === "text")?.text?.trim();
    return Response.json({ step: step || FALLBACKS[payload.category ?? "CODING"] || FALLBACKS.CODING });
  } catch {
    return Response.json({ step: FALLBACKS[payload.category ?? "CODING"] ?? FALLBACKS.CODING });
  }
}
