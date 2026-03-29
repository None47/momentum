import { getCoachFallback, type WorkoutSession } from "@/lib/gym-store";

export async function POST(request: Request) {
  const { sessions } = (await request.json()) as { sessions?: WorkoutSession[] };
  const safeSessions = Array.isArray(sessions) ? sessions.slice(0, 4) : [];
  const fallback = getCoachFallback(safeSessions);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || safeSessions.length === 0) {
    return Response.json({ lines: fallback });
  }

  try {
    const prompt = [
      "You are a concise strength coach.",
      "Return exactly 3 sentences as a JSON array of strings.",
      "Sentence 1: what is improving.",
      "Sentence 2: what is stalling.",
      "Sentence 3: one specific fix for the next session.",
      "Keep each sentence under 30 words.",
      `Sessions: ${JSON.stringify(safeSessions)}`,
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return Response.json({ lines: fallback });
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((item) => item.type === "text")?.text ?? "";
    const lines = JSON.parse(text) as string[];

    if (!Array.isArray(lines) || lines.length !== 3) {
      return Response.json({ lines: fallback });
    }

    return Response.json({ lines });
  } catch {
    return Response.json({ lines: fallback });
  }
}
