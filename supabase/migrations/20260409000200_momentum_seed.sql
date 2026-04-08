do $$
declare
  seed_user uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.profile (
    id,
    name,
    display_name,
    current_phase,
    timezone,
    cgpa,
    backlogs_remaining,
    leetcode_count,
    leetcode_easy,
    leetcode_medium,
    leetcode_hard,
    momentum_score,
    github_username,
    linkedin_url
  )
  values (
    seed_user,
    'Goutham',
    'Sachi',
    1,
    'Asia/Kolkata',
    5.80,
    3,
    0,
    0,
    0,
    0,
    0,
    null,
    null
  )
  on conflict (id) do update set
    name = excluded.name,
    display_name = excluded.display_name,
    current_phase = excluded.current_phase,
    timezone = excluded.timezone,
    cgpa = excluded.cgpa,
    backlogs_remaining = excluded.backlogs_remaining,
    linkedin_url = excluded.linkedin_url;

  insert into public.habits (
    user_id,
    label,
    category,
    icon,
    xp_value,
    scheduled_time,
    is_critical,
    location_required,
    frequency,
    is_active,
    sort_order,
    note
  )
  values
    (seed_user, 'Thyronorm 37.5mcg', 'MEDICAL', '○', 50, '5:30 AM', true, 'ANYWHERE', 'daily', true, 1, 'CRITICAL — empty stomach.'),
    (seed_user, 'S-Celepra 10mg', 'MEDICAL', '○', 50, 'Breakfast', true, 'ANYWHERE', 'daily', true, 2, 'You stopped this medication twice before. Never stop again.'),
    (seed_user, 'Neurobion Forte', 'MEDICAL', '○', 30, 'After lunch', true, 'ANYWHERE', 'daily', true, 3, null),
    (seed_user, 'Amigold 100mg', 'MEDICAL', '○', 30, '9:00 PM', true, 'ANYWHERE', 'daily', true, 4, null),
    (seed_user, 'Vitamin D 60,000 IU', 'MEDICAL', '○', 50, 'Sunday', true, 'ANYWHERE', 'weekly_sunday', true, 5, null),
    (seed_user, 'Gym 1 hour', 'BODY', '◆', 80, '5:40 AM', false, 'ANYWHERE', 'weekdays', true, 6, null),
    (seed_user, 'Drink 3L water', 'BODY', '◈', 40, 'All day', false, 'ANYWHERE', 'daily', true, 7, null),
    (seed_user, 'Eat 2200+ calories', 'BODY', '◇', 60, 'All day', false, 'ANYWHERE', 'daily', true, 8, null),
    (seed_user, 'Sleep 7.5 hours', 'BODY', '◉', 70, '10:00 PM', false, 'ANYWHERE', 'daily', true, 9, null),
    (seed_user, '2hrs coding/building', 'GRIND', '▸', 100, '3:30 PM', false, 'LIBRARY', 'daily', true, 10, 'LIBRARY ONLY'),
    (seed_user, 'LeetCode 2 problems', 'GRIND', '◈', 80, '6:00 PM', false, 'LIBRARY', 'daily', true, 11, 'LIBRARY ONLY'),
    (seed_user, 'College attendance', 'GRIND', '▲', 30, '8:30 AM', false, 'ANYWHERE', 'weekdays', true, 12, null),
    (seed_user, 'No Instagram', 'MIND', '◐', 60, 'All day', false, 'ANYWHERE', 'daily', true, 13, null),
    (seed_user, 'Journal entry', 'MIND', '●', 40, '9:30 PM', false, 'ANYWHERE', 'daily', true, 14, null)
  on conflict (user_id, sort_order) do update set
    label = excluded.label,
    category = excluded.category,
    icon = excluded.icon,
    xp_value = excluded.xp_value,
    scheduled_time = excluded.scheduled_time,
    is_critical = excluded.is_critical,
    location_required = excluded.location_required,
    frequency = excluded.frequency,
    is_active = excluded.is_active,
    note = excluded.note;

  insert into public.milestones (user_id, label, target_date, achieved, achieved_date)
  values
    (seed_user, '100 LC Easy solved', date '2026-06-30', false, null),
    (seed_user, 'First internship secured', date '2026-06-30', false, null),
    (seed_user, 'All backlogs cleared', date '2026-12-31', false, null),
    (seed_user, 'CGPA 7.0+', date '2026-12-31', false, null),
    (seed_user, 'Use cousin''s referrals', date '2026-10-31', false, null),
    (seed_user, '400 LeetCode total', date '2026-12-31', false, null),
    (seed_user, 'CGPA 7.5+', date '2027-05-31', false, null),
    (seed_user, '600 LeetCode total', date '2027-05-31', false, null),
    (seed_user, '750+ LeetCode total', date '2027-10-20', false, null),
    (seed_user, '₹60L offer received', date '2027-10-20', false, null)
  on conflict (user_id, label) do update set
    target_date = excluded.target_date,
    achieved = excluded.achieved,
    achieved_date = excluded.achieved_date;

  insert into public.spaced_repetition_cards (
    user_id,
    category,
    pattern_name,
    front_text,
    back_text,
    template_code,
    next_review_date,
    review_count
  )
  values
    (seed_user, 'dsa-pattern', 'Two Pointers', 'When a sorted structure lets two indices move toward a condition, name the core signals, invariants, and failure modes.', 'Use Two Pointers when relative movement shrinks search space without revisiting work. Decide whether pointers move inward, forward together, or at variable speed. Track invariant, stop condition, and what each move proves. Common clues: sorted arrays, palindrome checks, pair sums, partitioning, duplicate cleanup.', 'left=0; right=n-1; while left<right: decide by condition, move one pointer with proof', current_date, 0),
    (seed_user, 'dsa-pattern', 'Sliding Window', 'Explain fixed vs variable sliding window. What determines expand, shrink, and answer update?', 'Use Sliding Window for contiguous subarray or substring problems. Expand to include new information, shrink when constraint breaks, and update answer only when the window meaning is valid. Track counts or sums incrementally so each index moves at most once.', 'for right in range(n): add(nums[right]); while invalid: remove(nums[left]); left += 1; update answer', current_date, 0),
    (seed_user, 'dsa-pattern', 'Binary Search', 'State the invariant that makes binary search safe, and the standard template for first true or exact match.', 'Binary Search works on monotonic answer spaces, not just sorted arrays. Define low, high, and a predicate that flips once. Maintain the invariant for every iteration, compute mid carefully, and choose whether the goal is exact value, first true, or last false.', 'lo, hi = bounds; while lo < hi: mid=(lo+hi)//2; if predicate(mid): hi=mid else: lo=mid+1', current_date, 0),
    (seed_user, 'dsa-pattern', 'BFS', 'When is BFS the right graph or tree traversal, and what information should each queue node carry?', 'Use BFS when distance in edges matters or when you want layer-order traversal. Queue nodes often carry value plus metadata like depth, path length, or state mask. Mark visited at enqueue time to avoid duplicates. Level-by-level processing helps shortest-path reasoning on unweighted graphs.', 'queue=[start]; visited={start}; while queue: node=queue.pop(0); for nxt in neighbors(node): if nxt not in visited: visited.add(nxt); queue.append(nxt)', current_date, 0),
    (seed_user, 'dsa-pattern', 'DFS', 'What makes DFS useful beyond traversal, and when should you choose recursion vs explicit stack?', 'Use DFS to explore structure deeply: components, backtracking states, cycle checks, topological reasoning, tree DP. Recursion is cleaner when depth is safe and state naturally unwinds. Use an explicit stack when recursion depth is risky or control must be precise. Always define enter, explore, and leave actions clearly.', 'def dfs(node): mark(node); for nxt in neighbors(node): if unseen(nxt): dfs(nxt)', current_date, 0),
    (seed_user, 'dsa-pattern', 'Dynamic Programming 1D', 'How do you detect a 1D DP problem and derive state, transition, base case, and iteration order?', '1D DP appears when one dimension of progress is enough to describe future decisions. Define dp[i] as the best, count, or feasibility up to i. Write the recurrence from smaller solved states, initialize base cases explicitly, and choose forward or backward iteration based on dependencies.', 'dp=[base]*n; for i in range(...): dp[i]=combine(dp[prev states])', current_date, 0),
    (seed_user, 'dsa-pattern', 'Dynamic Programming 2D', 'What extra dimension usually creates 2D DP, and how do you keep transitions readable?', '2D DP appears when one index is not enough: two strings, two positions, capacity plus item, row plus column. Name both dimensions in words before coding. Fill base rows and columns, then derive each cell from already-computed neighbors. If memory matters, compress to rolling rows only after the recurrence is stable.', 'dp=[[0]*(m+1) for _ in range(n+1)]; for i in range(...): for j in range(...): dp[i][j]=transition(...)', current_date, 0),
    (seed_user, 'dsa-pattern', 'Monotonic Stack', 'What kind of “next greater / smaller” problems justify a monotonic stack, and what stays monotonic?', 'Use a Monotonic Stack when each element waits for the next stronger element on one side. Keep indices, not just values, when distance matters. Pop while the current value breaks monotonicity, resolve answers for popped items, then push the current index. This turns nested scanning into linear time.', 'stack=[]; for i,val in enumerate(nums): while stack and nums[stack[-1]] < val: ans[stack.pop()] = i; stack.append(i)', current_date, 0),
    (seed_user, 'dsa-pattern', 'Heap Top-K', 'Why is a heap better than full sorting for streaming or top-k queries?', 'Use a heap when you only care about the best k items or repeated access to the minimum or maximum. A min-heap of size k keeps the current top k largest values efficiently. For repeated scheduling or merge tasks, heap operations give cheap next-item retrieval without sorting everything each time.', 'heap=[]; for item in items: push item; if len(heap)>k: pop smallest', current_date, 0),
    (seed_user, 'dsa-pattern', 'Union Find', 'What problems map to connectivity queries, and what do path compression plus union by rank actually buy you?', 'Union Find handles dynamic connectivity: are these nodes connected, how many components remain, which merge creates a cycle. Path compression flattens parent chains during find. Union by rank or size keeps trees shallow. Together they make repeated finds nearly constant-time in practice.', 'find(x): parent[x]=find(parent[x]) until root; union(a,b): connect roots if different', current_date, 0),
    (seed_user, 'dsa-pattern', 'Backtracking', 'How do you define the decision tree, pruning rule, and undo step in backtracking problems?', 'Backtracking explores all valid constructions by making a choice, recursing, then undoing it. The critical parts are state representation, pruning invalid branches early, and restoring state after each recursive call. Think in terms of choices per level and what invariant makes a partial solution still viable.', 'def backtrack(state): if done: record; for choice in choices: apply(choice); if valid: backtrack(state); undo(choice)', current_date, 0),
    (seed_user, 'dsa-pattern', 'Trie', 'When does a Trie beat hashing, and what should each node store besides child pointers?', 'Use a Trie for prefix-heavy workloads: autocomplete, prefix counts, dictionary search, wildcard DFS. Each node usually stores child pointers and an end-of-word marker; counts or word indices can be added for frequency tasks. The win is shared-prefix traversal instead of repeatedly scanning whole strings.', 'node=root; for ch in word: node=node.children.setdefault(ch, TrieNode()); node.end=True', current_date, 0)
  on conflict (user_id, pattern_name) do update set
    category = excluded.category,
    front_text = excluded.front_text,
    back_text = excluded.back_text,
    template_code = excluded.template_code,
    next_review_date = excluded.next_review_date;

  insert into public.progress_letter (user_id, letter_text, ai_additions)
  values (
    seed_user,
    'To Goutham on October 2027,
You did it. From near-zero coding skills at Sir MVIT to a software engineer earning ₹60L. You started on March 23, 2026 with 0 LeetCode problems and no real coding experience.
You proved that a tier-3 college kid from Hospet can compete with IIT graduates. You used the referrals wisely.
The 577 days were hard. The hostel tried to pull you back. Depression made some days feel impossible. You showed up anyway.
— Goutham, March 2026',
    '[]'::jsonb
  )
  on conflict (user_id) do update set
    letter_text = excluded.letter_text;

  insert into public.exercises (user_id, name, category)
  values
    (seed_user, 'Flat Bench Press', 'push'),
    (seed_user, 'Incline DB Press', 'push'),
    (seed_user, 'Overhead Press', 'push'),
    (seed_user, 'Lateral Raises', 'push'),
    (seed_user, 'Tricep Pushdown', 'push'),
    (seed_user, 'Skull Crushers', 'push'),
    (seed_user, 'Chest Dips', 'push'),
    (seed_user, 'Deadlift', 'pull'),
    (seed_user, 'Pull Ups/Lat Pulldown', 'pull'),
    (seed_user, 'Seated Cable Row', 'pull'),
    (seed_user, 'Single Arm DB Row', 'pull'),
    (seed_user, 'Face Pulls', 'pull'),
    (seed_user, 'Barbell Curl', 'pull'),
    (seed_user, 'Hammer Curl', 'pull'),
    (seed_user, 'Reverse Curl', 'pull'),
    (seed_user, 'Barbell Squat', 'legs'),
    (seed_user, 'Romanian Deadlift', 'legs'),
    (seed_user, 'Leg Press', 'legs'),
    (seed_user, 'Leg Extension', 'legs'),
    (seed_user, 'Leg Curl', 'legs'),
    (seed_user, 'Standing Calf Raises', 'legs'),
    (seed_user, 'Lunges', 'legs'),
    (seed_user, 'Hip Thrust', 'legs')
  on conflict (user_id, name) do nothing;

  insert into public.time_blocks (
    user_id,
    title,
    date,
    start_time,
    end_time,
    color,
    category,
    repeat_type
  )
  values
    (seed_user, 'Sleep', current_date, time '22:30', time '05:30', '#10b981', 'RECOVERY', 'daily'),
    (seed_user, 'Wake + Thyronorm', current_date, time '05:30', time '05:40', '#ef4444', 'MEDICAL', 'daily'),
    (seed_user, '◆ GYM', current_date, time '05:40', time '06:40', '#f97316', 'BODY', 'weekdays'),
    (seed_user, 'Morning routine', current_date, time '06:40', time '08:30', '#111111', 'RECOVERY', 'daily'),
    (seed_user, '◈ College', current_date, time '08:30', time '14:30', '#3b82f6', 'GRIND', 'weekdays'),
    (seed_user, 'Lunch + travel', current_date, time '14:30', time '15:30', '#111111', 'RECOVERY', 'daily'),
    (seed_user, '▸ CODING — BUILD', current_date, time '15:30', time '17:30', '#3b82f6', 'GRIND', 'daily'),
    (seed_user, 'Break', current_date, time '17:30', time '18:00', '#111111', 'RECOVERY', 'daily'),
    (seed_user, '◈ LEETCODE', current_date, time '18:00', time '20:00', '#3b82f6', 'GRIND', 'daily'),
    (seed_user, 'Return + dinner', current_date, time '20:00', time '21:00', '#111111', 'RECOVERY', 'daily'),
    (seed_user, 'Wind down', current_date, time '21:00', time '21:30', '#111111', 'RECOVERY', 'daily'),
    (seed_user, 'Sleep buffer', current_date, time '22:00', time '22:30', '#10b981', 'RECOVERY', 'daily')
  on conflict do nothing;

  insert into public.backlog_subjects (user_id, subject_name, status, target_study_hours)
  values
    (seed_user, 'DS Theory', 'pending', 40),
    (seed_user, 'DS Lab', 'pending', 24),
    (seed_user, 'Pending Backlog 3', 'pending', 32)
  on conflict (user_id, subject_name) do update set
    status = excluded.status,
    target_study_hours = excluded.target_study_hours;

  insert into public.network_contacts (
    user_id,
    name,
    company,
    role,
    linkedin_url,
    relationship_strength,
    notes
  )
  values
    (seed_user, 'Cousin', 'Apple / Microsoft / Amazon / Flipkart / Walmart', 'Referral contact', null, 5, 'Referral unlock target: after 300 LC, 5 projects, and stronger CGPA.'),
    (seed_user, 'Saurabh Kumar Singh', 'Amazon', 'Senior from Sir MVIT', 'https://linkedin.com/in/sau1606', 3, 'Messaged on March 12, 2026. Proof that this path is possible.')
  on conflict do nothing;
end
$$;
