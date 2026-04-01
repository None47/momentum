interface WeeklyPlanRequest {
  review?: {
    lcDelta?: number;
    libraryAdherence?: string;
    note?: string;
  };
  targets?: {
    lcProblems?: number;
    codingSessions?: number;
    focusSkill?: string;
  };
  blockers?: string[];
  otherBlocker?: string;
}

function buildFallbackPlan(payload: WeeklyPlanRequest) {
  const focus = payload.targets?.focusSkill || "Arrays";
  const lcTarget = payload.targets?.lcProblems ?? 8;
  const codingTarget = payload.targets?.codingSessions ?? 4;
  const dailyLc = Math.max(1, Math.ceil(lcTarget / 5));
  const blockerLine =
    payload.blockers && payload.blockers.length > 0
      ? `Keep sessions short if ${payload.blockers[0].toLowerCase()} hits.`
      : "Protect the first 45 minutes of each session from distractions.";

  return [
    `Monday: Solve ${dailyLc} ${focus} problems and review 3 spaced repetition cards.`,
    `Tuesday: Solve ${dailyLc} problems, then do one ${focus} pattern recap for 20 minutes.`,
    `Wednesday: Build one project feature for 90 minutes. ${blockerLine}`,
    `Thursday: Solve ${dailyLc} Medium problems and clear all due reviews.`,
    `Friday: Finish ${Math.max(1, lcTarget - dailyLc * 4)} LeetCode problems and review every problem solved this week.`,
    `Weekly target: ${codingTarget} coding sessions with honest timer logs.`,
  ];
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let payload: WeeklyPlanRequest = {};

  try {
    payload = (await request.json()) as WeeklyPlanRequest;
  } catch {
    payload = {};
  }

  if (!apiKey) {
    return Response.json({ plan: buildFallbackPlan(payload) });
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
        max_tokens: 260,
        system: `You are building a five day study plan for Goutham.
Rules:
- Return 5 lines only, Monday to Friday.
- Each line must be specific and fit in 1 sentence.
- Mix LeetCode, review, and project work.
- Reflect blockers realistically.
- No motivational filler.`,
        messages: [
          {
            role: "user",
            content: `Review: LC delta ${payload.review?.lcDelta ?? 0}, library adherence ${payload.review?.libraryAdherence ?? "MOST_DAYS"}, note: ${payload.review?.note ?? "none"}.
Targets: ${payload.targets?.lcProblems ?? 8} LC problems, ${payload.targets?.codingSessions ?? 4} coding sessions, focus skill ${payload.targets?.focusSkill ?? "Arrays"}.
Blockers: ${(payload.blockers ?? []).join(", ") || "none"} ${payload.otherBlocker ?? ""}.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ plan: buildFallbackPlan(payload) });
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((item) => item.type === "text")?.text ?? "";
    const plan = text
      .split("\n")
      .map((line) => line.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean)
      .slice(0, 5);

    return Response.json({ plan: plan.length > 0 ? plan : buildFallbackPlan(payload) });
  } catch {
    return Response.json({ plan: buildFallbackPlan(payload) });
  }
}
