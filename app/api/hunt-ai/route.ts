type HuntAction =
  | "network-message"
  | "project-bullet"
  | "project-rating"
  | "resume-score"
  | "letter-update"
  | "linkedin-headline"
  | "linkedin-about"
  | "internship-email";

interface HuntAiPayload {
  action?: HuntAction;
  name?: string;
  company?: string;
  role?: string;
  apiKey?: string;
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
    case "linkedin-headline":
      return {
        text: `Option 1: SDE Aspirant | Building AI-powered apps with Next.js + Claude API
Option 2: CS Student | Full-Stack Developer | LeetCode ${payload.lcCount ?? 0} | MOMENTUM App Creator
Option 3: Future SDE @ Amazon/Microsoft | Python · Next.js · Supabase | Open to internships`,
      };
    case "linkedin-about":
      return {
        text: `I am a CS student at Sir MVIT Bangalore building toward SDE roles at top tech companies by 2027. Right now I am focused on disciplined execution: solving LeetCode consistently, strengthening Python and full-stack foundations, and shipping projects that show real engineering proof. My current flagship project is MOMENTUM, a personal operating system built with Next.js, Supabase, and Claude API integrations. I care about clean product thinking, visible progress, and becoming the kind of engineer who can deliver reliably under pressure. I am actively looking for internship and software engineering opportunities where I can contribute from week one, learn quickly, and grow through strong technical feedback.`,
      };
    case "internship-email":
      return {
        text: `Subject: ${payload.role ?? "Developer Intern"} — Sir MVIT Student, MOMENTUM App Creator

Hi ${payload.name ?? "[Name]"},

I'm Goutham, a 2nd year CS student at Sir MVIT Bangalore. I built MOMENTUM, a full-stack habit tracking app using Next.js, Supabase, and the Claude API.

I'm looking for a Python/backend internship for 2-3 months starting June 2026. I've been solving LeetCode daily and would contribute meaningfully from week 1.

Would you be open to a 15-min call?

Goutham M S`,
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

  if (action === "linkedin-headline") {
    return `Write 3 LinkedIn headline options.
Rules:
- Plain text only.
- Label them Option 1, Option 2, Option 3.
- Make them recruiter-friendly, concise, and specific.
- Mention stack or proof, not hype.`;
  }

  if (action === "linkedin-about") {
    return `Write a LinkedIn About section.
Rules:
- 120 to 170 words.
- First person.
- Professional and grounded.
- Mention target roles, current project, stack, and learning focus.
- No emojis.`;
  }

  if (action === "internship-email") {
    return `Write a personalized cold email for an internship.
Rules:
- Plain text only.
- Include a subject line.
- 4 short paragraphs max.
- Specific, respectful, and direct.
- No emojis or fluff.`;
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
    case "linkedin-headline":
      return `Projects: ${payload.progress ?? "MOMENTUM"}
Stats: ${payload.stats ?? "No stats"}
LeetCode solved: ${payload.lcCount ?? 0}`;
    case "linkedin-about":
      return `Role target: ${payload.role ?? "SDE internships and entry-level SDE roles"}
Current project: ${payload.progress ?? "MOMENTUM"}
Stack and proof: ${payload.stats ?? "Next.js, Supabase, Claude API"}`;
    case "internship-email":
      return `Company: ${payload.company ?? "Unknown"}
Role: ${payload.role ?? "Intern"}
Recipient: ${payload.name ?? "Hiring Manager"}
Proof: ${payload.progress ?? "Built MOMENTUM"}
Stats: ${payload.stats ?? "Sir MVIT student, internship-ready"}`;
    default:
      return "";
  }
}

export async function POST(request: Request) {
  let payload: HuntAiPayload = {};

  try {
    payload = (await request.json()) as HuntAiPayload;
  } catch {
    payload = {};
  }

  if (!payload.action) {
    return Response.json({ text: "" }, { status: 400 });
  }

  const apiKey = payload.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;

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
