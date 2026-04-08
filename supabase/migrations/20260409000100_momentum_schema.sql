create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.momentum_day_number(ref_date date default current_date)
returns integer
language sql
stable
as $$
  select greatest(1, ((ref_date - date '2026-03-23') + 1)::integer);
$$;

create or replace function public.momentum_days_to_placement(ref_date date default current_date)
returns integer
language sql
stable
as $$
  select greatest(0, ((date '2027-10-20' - ref_date) + 1)::integer);
$$;

create or replace function public.sync_profile_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.days_since_day1 = public.momentum_day_number(current_date);
  new.days_to_placement = public.momentum_days_to_placement(current_date);
  return new;
end;
$$;

create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  momentum_score integer not null default 0 check (momentum_score >= 0),
  current_phase integer not null default 1 check (current_phase between 1 and 4),
  days_since_day1 integer not null default public.momentum_day_number(current_date),
  days_to_placement integer not null default public.momentum_days_to_placement(current_date),
  leetcode_count integer not null default 0 check (leetcode_count >= 0),
  leetcode_easy integer not null default 0 check (leetcode_easy >= 0),
  leetcode_medium integer not null default 0 check (leetcode_medium >= 0),
  leetcode_hard integer not null default 0 check (leetcode_hard >= 0),
  cgpa numeric(3,2),
  backlogs_remaining integer not null default 3 check (backlogs_remaining >= 0),
  active_streak integer not null default 0 check (active_streak >= 0),
  comeback_mode boolean not null default false,
  double_xp_until timestamptz,
  github_username text,
  linkedin_url text,
  anthropic_api_key text,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  label text not null,
  category text not null check (category in ('MEDICAL', 'BODY', 'GRIND', 'MIND', 'RECOVERY')),
  icon text not null,
  xp_value integer not null check (xp_value >= 0),
  scheduled_time text,
  is_critical boolean not null default false,
  location_required text not null default 'ANYWHERE',
  frequency text not null check (frequency in ('daily', 'weekdays', 'weekly_sunday')),
  is_active boolean not null default true,
  sort_order integer not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, sort_order)
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default timezone('utc', now()),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  bonus_type text check (bonus_type in ('CRITICAL HIT', 'DOUBLE XP') or bonus_type is null),
  bonus_multiplier numeric(4,2) not null default 1.0 check (bonus_multiplier >= 1.0),
  unique (user_id, habit_id, date)
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  grace_days_used integer not null default 0 check (grace_days_used >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, habit_id)
);

create table if not exists public.leetcode_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  problem_name text not null,
  problem_number integer,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text,
  time_to_solve integer check (time_to_solve >= 0),
  solved_alone boolean not null default false,
  explanation_text text,
  explanation_score integer check (explanation_score between 1 and 10),
  next_review_date date,
  review_count integer not null default 0 check (review_count >= 0),
  mastered boolean not null default false,
  company_tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  split_type text not null check (split_type in ('push', 'pull', 'legs', 'cardio', 'rest')),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  total_volume_kg numeric(10,2) not null default 0 check (total_volume_kg >= 0),
  prs_hit integer not null default 0 check (prs_hit >= 0),
  energy_rating integer check (energy_rating between 1 and 5),
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'cardio', 'other')),
  best_weight_kg numeric(10,2) not null default 0 check (best_weight_kg >= 0),
  best_reps integer not null default 0 check (best_reps >= 0),
  total_sessions integer not null default 0 check (total_sessions >= 0),
  total_reps integer not null default 0 check (total_reps >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2),
  tsh_level numeric(6,2),
  testosterone_level numeric(6,2),
  energy_level integer check (energy_level between 1 and 5),
  mood_score integer check (mood_score between 1 and 5),
  sleep_hours numeric(4,2) check (sleep_hours >= 0),
  calories_eaten integer check (calories_eaten >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table if not exists public.mood_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table if not exists public.energy_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  time_of_day text not null check (time_of_day in ('morning', 'afternoon', 'evening')),
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date, time_of_day)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  raw_text text not null,
  ai_expanded_text text,
  mood_score integer check (mood_score between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  week_number integer not null,
  week_start_date date not null,
  habits_completion_pct numeric(5,2) check (habits_completion_pct between 0 and 100),
  leetcode_count integer not null default 0 check (leetcode_count >= 0),
  coding_hours numeric(6,2) not null default 0 check (coding_hours >= 0),
  gym_sessions integer not null default 0 check (gym_sessions >= 0),
  mood_avg numeric(3,2),
  energy_avg numeric(3,2),
  sleep_avg numeric(4,2),
  library_days integer not null default 0 check (library_days >= 0),
  breakdown_reasons jsonb not null default '[]'::jsonb,
  biggest_win text,
  biggest_regret text,
  ai_analysis text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, week_start_date)
);

create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  brief_text text not null,
  brief_type text not null check (brief_type in ('morning', 'weekly_oracle', 'comeback')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date, brief_type)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  label text not null,
  target_date date not null,
  achieved boolean not null default false,
  achieved_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, label)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  title text not null,
  description_one_line text not null,
  status text not null check (status in ('in_progress', 'complete', 'abandoned')),
  stack text[] not null default '{}',
  github_url text,
  live_url text,
  quality_rating integer check (quality_rating between 1 and 5),
  resume_bullet text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  company text not null,
  role text not null,
  applied_date date,
  source text,
  status text not null,
  ctc_range text,
  contact_name text,
  contact_linkedin text,
  referral_used boolean not null default false,
  which_cousin text,
  notes text,
  next_followup_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.network_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  company text,
  role text,
  linkedin_url text,
  last_contact_date date,
  relationship_strength integer check (relationship_strength between 1 and 5),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name, company)
);

create table if not exists public.spaced_repetition_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  category text not null,
  pattern_name text not null,
  front_text text not null,
  back_text text not null,
  template_code text,
  next_review_date date,
  review_count integer not null default 0 check (review_count >= 0),
  difficulty_rating text check (difficulty_rating in ('remembered', 'hint', 'forgot') or difficulty_rating is null),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, pattern_name)
);

create table if not exists public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  type text not null check (type in ('coding', 'behavioural', 'oa', 'system')),
  company text,
  problem_text text,
  user_answer text,
  claude_feedback text,
  score integer check (score between 1 and 10),
  pass_fail boolean,
  time_used_minutes integer check (time_used_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.win_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  category text not null,
  description text not null,
  auto_generated boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sleep_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  hours_slept numeric(4,2) not null check (hours_slept >= 0),
  cognition_score text not null check (cognition_score in ('impaired', 'sub', 'peak', 'optimal')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  week_start_date date not null,
  plan_text jsonb not null default '[]'::jsonb,
  adherence_pct integer check (adherence_pct between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, week_start_date)
);

create table if not exists public.accountability_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  gym_done boolean,
  coding_done boolean,
  lc_done boolean,
  reason_missed text,
  honesty_streak_day integer check (honesty_streak_day >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table if not exists public.cs_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  date date not null,
  question_text text not null,
  answer_text text,
  category text,
  user_rating text check (user_rating in ('knew', 'partial', 'didnt') or user_rating is null),
  next_review_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.linkedin_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  week_number integer not null,
  task_text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.backlog_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  subject_name text not null,
  status text not null,
  exam_date date,
  study_hours_logged numeric(5,2) not null default 0 check (study_hours_logged >= 0),
  target_study_hours numeric(5,2) not null default 0 check (target_study_hours >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, subject_name)
);

create table if not exists public.college_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  subject_name text not null,
  semester integer,
  classes_attended integer not null default 0 check (classes_attended >= 0),
  total_classes integer not null default 0 check (total_classes >= 0),
  internal_marks numeric(5,2),
  expected_grade text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, subject_name, semester)
);

create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  color text,
  category text,
  repeat_type text,
  is_checked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date, start_time, end_time, title)
);

create table if not exists public.progress_letter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profile(id) on delete cascade,
  letter_text text not null,
  ai_additions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profile_sync_derived_fields
before insert or update on public.profile
for each row
execute function public.sync_profile_derived_fields();

create trigger profile_set_updated_at
before update on public.profile
for each row
execute function public.set_updated_at();

create trigger habits_set_updated_at
before update on public.habits
for each row
execute function public.set_updated_at();

create trigger streaks_set_updated_at
before update on public.streaks
for each row
execute function public.set_updated_at();

create trigger leetcode_log_set_updated_at
before update on public.leetcode_log
for each row
execute function public.set_updated_at();

create trigger gym_sessions_set_updated_at
before update on public.gym_sessions
for each row
execute function public.set_updated_at();

create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.set_updated_at();

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row
execute function public.set_updated_at();

create trigger weekly_reports_set_updated_at
before update on public.weekly_reports
for each row
execute function public.set_updated_at();

create trigger milestones_set_updated_at
before update on public.milestones
for each row
execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

create trigger network_contacts_set_updated_at
before update on public.network_contacts
for each row
execute function public.set_updated_at();

create trigger spaced_repetition_cards_set_updated_at
before update on public.spaced_repetition_cards
for each row
execute function public.set_updated_at();

create trigger mock_interviews_set_updated_at
before update on public.mock_interviews
for each row
execute function public.set_updated_at();

create trigger study_plans_set_updated_at
before update on public.study_plans
for each row
execute function public.set_updated_at();

create trigger accountability_checks_set_updated_at
before update on public.accountability_checks
for each row
execute function public.set_updated_at();

create trigger cs_questions_set_updated_at
before update on public.cs_questions
for each row
execute function public.set_updated_at();

create trigger linkedin_tasks_set_updated_at
before update on public.linkedin_tasks
for each row
execute function public.set_updated_at();

create trigger backlog_subjects_set_updated_at
before update on public.backlog_subjects
for each row
execute function public.set_updated_at();

create trigger college_subjects_set_updated_at
before update on public.college_subjects
for each row
execute function public.set_updated_at();

create trigger time_blocks_set_updated_at
before update on public.time_blocks
for each row
execute function public.set_updated_at();

create trigger progress_letter_set_updated_at
before update on public.progress_letter
for each row
execute function public.set_updated_at();

create index if not exists completions_user_date_idx on public.completions (user_id, date desc);
create index if not exists completions_habit_date_idx on public.completions (habit_id, date desc);
create index if not exists completions_user_habit_idx on public.completions (user_id, habit_id);
create index if not exists habits_user_sort_idx on public.habits (user_id, sort_order);
create index if not exists habits_user_category_idx on public.habits (user_id, category, is_active);
create index if not exists streaks_user_idx on public.streaks (user_id, current_streak desc);
create index if not exists leetcode_log_user_date_idx on public.leetcode_log (user_id, date desc);
create index if not exists leetcode_log_user_next_review_idx on public.leetcode_log (user_id, next_review_date);
create index if not exists leetcode_log_company_tags_idx on public.leetcode_log using gin (company_tags);
create index if not exists gym_sessions_user_date_idx on public.gym_sessions (user_id, date desc);
create index if not exists exercises_user_category_idx on public.exercises (user_id, category);
create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date desc);
create index if not exists mood_log_user_date_idx on public.mood_log (user_id, date desc);
create index if not exists energy_log_user_date_idx on public.energy_log (user_id, date desc);
create index if not exists journal_entries_user_date_idx on public.journal_entries (user_id, date desc);
create index if not exists weekly_reports_user_week_idx on public.weekly_reports (user_id, week_start_date desc);
create index if not exists ai_briefs_user_date_idx on public.ai_briefs (user_id, date desc, brief_type);
create index if not exists milestones_user_achieved_idx on public.milestones (user_id, achieved, target_date);
create index if not exists projects_user_status_idx on public.projects (user_id, status);
create index if not exists applications_user_status_idx on public.applications (user_id, status, applied_date desc);
create index if not exists network_contacts_user_contact_idx on public.network_contacts (user_id, last_contact_date desc);
create index if not exists spaced_repetition_cards_user_review_idx on public.spaced_repetition_cards (user_id, next_review_date);
create index if not exists mock_interviews_user_date_idx on public.mock_interviews (user_id, date desc);
create index if not exists win_log_user_date_idx on public.win_log (user_id, date desc);
create index if not exists sleep_log_user_date_idx on public.sleep_log (user_id, date desc);
create index if not exists study_plans_user_week_idx on public.study_plans (user_id, week_start_date desc);
create index if not exists accountability_checks_user_date_idx on public.accountability_checks (user_id, date desc);
create index if not exists cs_questions_user_review_idx on public.cs_questions (user_id, next_review_date);
create index if not exists linkedin_tasks_user_week_idx on public.linkedin_tasks (user_id, week_number);
create index if not exists backlog_subjects_user_status_idx on public.backlog_subjects (user_id, status);
create index if not exists college_subjects_user_semester_idx on public.college_subjects (user_id, semester);
create index if not exists time_blocks_user_date_idx on public.time_blocks (user_id, date, start_time);

alter table public.profile enable row level security;
alter table public.habits enable row level security;
alter table public.completions enable row level security;
alter table public.streaks enable row level security;
alter table public.leetcode_log enable row level security;
alter table public.gym_sessions enable row level security;
alter table public.exercises enable row level security;
alter table public.body_metrics enable row level security;
alter table public.mood_log enable row level security;
alter table public.energy_log enable row level security;
alter table public.journal_entries enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.ai_briefs enable row level security;
alter table public.milestones enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;
alter table public.network_contacts enable row level security;
alter table public.spaced_repetition_cards enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.win_log enable row level security;
alter table public.sleep_log enable row level security;
alter table public.study_plans enable row level security;
alter table public.accountability_checks enable row level security;
alter table public.cs_questions enable row level security;
alter table public.linkedin_tasks enable row level security;
alter table public.backlog_subjects enable row level security;
alter table public.college_subjects enable row level security;
alter table public.time_blocks enable row level security;
alter table public.progress_letter enable row level security;

create policy "profile_owner_all" on public.profile
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "habits_owner_all" on public.habits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "completions_owner_all" on public.completions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "streaks_owner_all" on public.streaks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "leetcode_log_owner_all" on public.leetcode_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "gym_sessions_owner_all" on public.gym_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "exercises_owner_all" on public.exercises
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "body_metrics_owner_all" on public.body_metrics
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mood_log_owner_all" on public.mood_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "energy_log_owner_all" on public.energy_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "journal_entries_owner_all" on public.journal_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weekly_reports_owner_all" on public.weekly_reports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_briefs_owner_all" on public.ai_briefs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "milestones_owner_all" on public.milestones
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projects_owner_all" on public.projects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "applications_owner_all" on public.applications
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "network_contacts_owner_all" on public.network_contacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "spaced_repetition_cards_owner_all" on public.spaced_repetition_cards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mock_interviews_owner_all" on public.mock_interviews
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "win_log_owner_all" on public.win_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sleep_log_owner_all" on public.sleep_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "study_plans_owner_all" on public.study_plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "accountability_checks_owner_all" on public.accountability_checks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "cs_questions_owner_all" on public.cs_questions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "linkedin_tasks_owner_all" on public.linkedin_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "backlog_subjects_owner_all" on public.backlog_subjects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "college_subjects_owner_all" on public.college_subjects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "time_blocks_owner_all" on public.time_blocks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "progress_letter_owner_all" on public.progress_letter
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'completions'
  ) then
    alter publication supabase_realtime add table public.completions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'streaks'
  ) then
    alter publication supabase_realtime add table public.streaks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile'
  ) then
    alter publication supabase_realtime add table public.profile;
  end if;
end
$$;
