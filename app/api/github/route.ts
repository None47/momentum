interface PushEvent {
  type?: string;
  created_at?: string;
  payload?: {
    commits?: Array<{ sha?: string }>;
  };
}

function buildFallback(username: string) {
  return {
    username,
    todayHasCommit: false,
    streak: 0,
    longestStreak: 0,
    totalCommitsYear: 0,
    mostActiveDay: "None yet",
    weeklyCommitCount: 0,
    advice: "No GitHub data yet. Make one visible commit today.",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return Response.json(buildFallback(""), { status: 400 });
  }

  try {
    const response = await fetch(`https://api.github.com/users/${username}/events`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return Response.json(buildFallback(username));
    }

    const events = (await response.json()) as PushEvent[];
    const pushes = events.filter((event) => event.type === "PushEvent");
    const countsByDate = pushes.reduce<Record<string, number>>((acc, event) => {
      const date = event.created_at?.split("T")[0];
      if (!date) return acc;
      acc[date] = (acc[date] ?? 0) + (event.payload?.commits?.length ?? 1);
      return acc;
    }, {});

    const today = new Date().toISOString().split("T")[0];
    let streak = 0;
    const cursor = new Date(`${today}T00:00:00`);
    while (countsByDate[cursor.toISOString().split("T")[0]]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let longestStreak = 0;
    let current = 0;
    for (let index = 0; index < 366; index += 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const key = date.toISOString().split("T")[0];
      if (countsByDate[key]) {
        current += 1;
        longestStreak = Math.max(longestStreak, current);
      } else {
        current = 0;
      }
    }

    const weekdayCounts = Object.entries(countsByDate).reduce<Record<string, number>>((acc, [date, count]) => {
      const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
      acc[day] = (acc[day] ?? 0) + count;
      return acc;
    }, {});
    const mostActiveDay = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
    const weeklyCommitCount = Object.entries(countsByDate)
      .filter(([date]) => {
        const diff = (new Date(today).getTime() - new Date(date).getTime()) / 86400000;
        return diff >= 0 && diff < 7;
      })
      .reduce((sum, [, count]) => sum + count, 0);

    return Response.json({
      username,
      todayHasCommit: Boolean(countsByDate[today]),
      streak,
      longestStreak,
      totalCommitsYear: Object.values(countsByDate).reduce((sum, count) => sum + count, 0),
      mostActiveDay,
      weeklyCommitCount,
      advice:
        weeklyCommitCount >= 3
          ? "Good. Make sure at least two commits ship real functionality, not just surface edits."
          : "Push something visible this week. Recruiters read the graph as proof of consistency.",
    });
  } catch {
    return Response.json(buildFallback(username));
  }
}
