const FALLBACK_TASK =
  "Solve Two Sum on LeetCode in 45 minutes. Watch the NeetCode explanation for 8 minutes, then solve it yourself. This matters now because you need one repeatable pattern today.";

interface TaskRequest {
  dayNumber?: number;
  phase?: string;
  lcCount?: number;
  focusArea?: string;
  previousTask?: string | null;
  regenerate?: boolean;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let payload: TaskRequest = {};

  try {
    payload = (await request.json()) as TaskRequest;
  } catch {
    payload = {};
  }

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
        max_tokens: 220,
        system: `You are coaching Goutham, a 19-year-old CSE student at Sir MVIT Bangalore.
He is on Day ${payload.dayNumber ?? 1} of 577 days to get a ₹60L job by October 2027.
Current phase: ${payload.phase ?? "Foundation"}
LeetCode solved: ${payload.lcCount ?? 0} total
Current focus: ${payload.focusArea ?? "Python basics and DSA"}

Give him ONE specific task for today.
Rules:
- One task only. Not a list.
- Must be completable in 45-90 minutes.
- Must be specific: exact problem name, exact video link, exact chapter, or exact repo task.
- Tell him exactly what to do and how long it will take.
- No motivation speech.
- Format: WHAT + HOW LONG + WHY IT MATTERS NOW.
- Max 4 sentences.`,
        messages: [
          {
            role: "user",
            content: payload.regenerate
              ? `Generate a different task than this if possible: ${payload.previousTask ?? "none"}`
              : "Generate today's one thing.",
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
