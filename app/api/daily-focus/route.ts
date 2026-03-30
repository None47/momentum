const FALLBACK_TASK =
  "Solve Two Sum (#1) on LeetCode. Watch the NeetCode explanation first for 8 minutes, then solve it yourself. Total time: 45 minutes.";

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({ task: FALLBACK_TASK });
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
        max_tokens: 180,
        system:
          "Goutham is Day 8 of his 577-day journey to ₹60L. He's in Phase 1 (Foundation). He has solved 0 LeetCode problems total. He's learning Python basics. Generate ONE specific micro-task for today. Format: What to do + exact resource + time it takes. Max 3 sentences. No fluff. Be specific.",
        messages: [
          {
            role: "user",
            content: "Generate a different task than the last one if possible.",
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ task: FALLBACK_TASK });
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const task = data.content?.find((item) => item.type === "text")?.text?.trim();

    return Response.json({ task: task || FALLBACK_TASK });
  } catch {
    return Response.json({ task: FALLBACK_TASK });
  }
}
