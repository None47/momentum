type HuntAction =
  | "network-message"
  | "project-bullet"
  | "project-rating"
  | "resume-score"
  | "letter-update";

interface HuntAiPayload {
  action?: HuntAction;
  name?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  stats?: string;
  progress?: string;
  projectName?: string;
  stack?: string;
  oneLiner?: string;
  facts?: string[];
  resumeText?: string;
  dayLabel?: string;
  lcCount?: number;
  sessions?: number;
  streak?: number;
}

function fallbackResponse(payload: HuntAiPayload) {
  switch (payload.action) {
    case "network-message":
      return {
        text: `Hey ${payload.name ?? "there"}, quick update on my progress: ${payload.progress ?? "I stayed consistent this month"}.
I am still building toward the referral milestone and wanted to keep you posted.
How are things at ${payload.company ?? "your team"}?`,
      };
    case "project-bullet":
      return {
        text: `Built ${payload.projectName ?? "a project"} using ${payload.stack ?? "a modern stack"} that ${payload.oneLiner ?? "solves a concrete problem"} and created strong interview talking points.`,
      };
    case "project-rating":
      return {
        text: `Project Quality: 3/5
Technical complexity: 3/5
Uniqueness: 4/5
Interview talking points: 3/5
Resume impact: 3/5
To reach 4/5: add authentication, tests, and visible metrics.
To reach 5/5: get real users or production usage proof.`,
      };
    case "resume-score":
      return {
        text: `ATS Score: 67/100
Missing keywords: Docker, CI/CD, AWS Lambda
Weak sections: Projects need stronger metrics
Strong sections: Skills list is aligned for SDE
Action: Add 2 AWS services and quantify project outcomes.`,
      };
    case "letter-update":
      return {
        text: `${payload.dayLabel ?? "Day update"}: You have now solved ${payload.lcCount ?? 0} problems and completed ${payload.sessions ?? 0} sessions. Your streak is ${payload.streak ?? 0} days. Keep going.`,
      };
    default:
      return { text: "" };
  }
}

function buildSystemPrompt(action: HuntAction) {
  if (action === "network-message") {
    return `Write a short WhatsApp or LinkedIn update message.
Rules:
- Sound professional, warm, and specific.
- Not desperate.
- 3 short paragraphs max.
- No emojis.
- Mention progress and ask one light closing question.`;
  }

  if (action === "project-bullet") {
    return `Write one strong resume bullet.
Rules:
- Start with Built, Created, or Developed.
- Mention stack.
- Mention impact, metric, or why it matters.
- One sentence only.
- No fluff.`;
  }

  if (action === "project-rating") {
    return `Rate the project for FAANG-style resume/interview value.
Rules:
- Use plain text.
- First line must be: Project Quality: X/5
- Then 4 lines: Technical complexity, Uniqueness, Interview talking points, Resume impact.
- Then 2 concise improvement lines.`;
  }

  if (action === "resume-score") {
    return `Score this resume for an Amazon SDE-style ATS screen.
Rules:
- Plain text only.
- First line must be: ATS Score: X/100
- Then list missing keywords, weak sections, strong sections, and one action line.
- Be concrete and concise.`;
  }

  return `Write one paragraph to append to a long-term progress letter.
Rules:
- 2 to 4 sentences.
- Reflect real progress data.
- Sound serious and grounded.
- No hype.`;
}

function buildUserPrompt(payload: HuntAiPayload) {
  switch (payload.action) {
    case "network-message":
      return `Name: ${payload.name ?? "Unknown"}
Company: ${payload.company ?? "Unknown"}
Role: ${payload.role ?? "Unknown"}
Progress update: ${payload.progress ?? "No update provided"}
Additional stats: ${payload.stats ?? "None"}`;
    case "project-bullet":
      return `Project: ${payload.projectName ?? "Unknown"}
Stack: ${payload.stack ?? "Unknown"}
One line: ${payload.oneLiner ?? "Unknown"}
Facts: ${(payload.facts ?? []).join("; ") || "None"}`;
    case "project-rating":
      return `Project: ${payload.projectName ?? "Unknown"}
Stack: ${payload.stack ?? "Unknown"}
Summary: ${payload.oneLiner ?? "Unknown"}
Facts: ${(payload.facts ?? []).join("; ") || "None"}`;
    case "resume-score":
      return payload.resumeText ?? "No resume text provided";
    case "letter-update":
      return `Label: ${payload.dayLabel ?? "Day update"}
LeetCode solved: ${payload.lcCount ?? 0}
Coding sessions: ${payload.sessions ?? 0}
Streak: ${payload.streak ?? 0}`;
    default:
      return "";
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let payload: HuntAiPayload = {};

  try {
    payload = (await request.json()) as HuntAiPayload;
  } catch {
    payload = {};
  }

  if (!payload.action) {
    return Response.json({ text: "" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(fallbackResponse(payload));
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
        max_tokens: 300,
        system: buildSystemPrompt(payload.action),
        messages: [{ role: "user", content: buildUserPrompt(payload) }],
      }),
    });

    if (!response.ok) {
      return Response.json(fallbackResponse(payload));
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((item) => item.type === "text")?.text?.trim();

    return Response.json({ text: text || fallbackResponse(payload).text });
  } catch {
    return Response.json(fallbackResponse(payload));
  }
}
