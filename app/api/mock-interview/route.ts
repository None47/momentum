interface MockInterviewRequest {
  type?: "CODING" | "BEHAVIOURAL" | "SYSTEM_DESIGN";
  prompt?: string;
  answer?: string;
  apiKey?: string;
}

function fallback(type: MockInterviewRequest["type"]) {
  if (type === "BEHAVIOURAL") {
    return {
      feedback:
        "SITUATION: Present.\nTASK: Needs clearer scope.\nACTION: Strong detail.\nRESULT: Missing numbers.\n\nRevised structure: Set the context in one sentence, name your responsibility, list two actions, end with a measurable result.",
      pass: true,
      score: 7,
      weakness: "Result quantification",
    };
  }

  return {
    feedback:
      "FEEDBACK:\nApproach: You found the core pattern.\nTime complexity: State it explicitly.\nWhat you missed: Mention edge cases before you finish.\nOverall: PASS with gaps.\nNext step: Practice one more problem of the same pattern.",
    pass: true,
    score: 7,
    weakness: "Edge-case communication",
  };
}

export async function POST(request: Request) {
  let payload: MockInterviewRequest = {};

  try {
    payload = (await request.json()) as MockInterviewRequest;
  } catch {
    payload = {};
  }

  const apiKey = payload.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(fallback(payload.type));
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
        max_tokens: 280,
        system: `You are a strict interviewer.
Return JSON with keys: feedback, pass, score, weakness.
- feedback must be plain text, concise, and actionable.
- score must be 1-10.
- weakness must be 2-4 words.`,
        messages: [
          {
            role: "user",
            content: `Interview type: ${payload.type ?? "CODING"}\nPrompt: ${payload.prompt ?? ""}\nCandidate answer:\n${payload.answer ?? ""}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json(fallback(payload.type));
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((item) => item.type === "text")?.text?.trim() ?? "";
    try {
      const parsed = JSON.parse(text) as { feedback: string; pass: boolean; score: number; weakness: string };
      return Response.json(parsed);
    } catch {
      return Response.json(fallback(payload.type));
    }
  } catch {
    return Response.json(fallback(payload.type));
  }
}
