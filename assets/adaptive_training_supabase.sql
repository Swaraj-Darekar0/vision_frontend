-- Adaptive Training System - frontend-aligned Supabase migration draft

alter table public.user_profiles
  add column if not exists identity text default null,
  add column if not exists work_domain text default null,
  add column if not exists interest_areas text[] default '{}',
  add column if not exists speaking_goal text default null,
  add column if not exists practice_frequency text default null,
  add column if not exists speaker_level text default null
    check (speaker_level in ('developing', 'competent', 'advanced')),
  add column if not exists subscription_status text default 'free'
    check (subscription_status in ('free', 'active', 'expired')),
  add column if not exists subscription_plan text default null
    check (subscription_plan in ('weekly', 'monthly') or subscription_plan is null),
  add column if not exists subscription_start timestamptz default null,
  add column if not exists subscription_end timestamptz default null,
  add column if not exists onboarding_complete boolean default false,
  add column if not exists diagnostic_complete boolean default false;

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  week_number integer not null,
  week_start_date date not null,
  speaker_level text not null check (speaker_level in ('developing', 'competent', 'advanced')),
  sessions_per_day integer not null default 1,
  plan_data jsonb not null,
  generated_at timestamptz not null default now(),
  is_current boolean not null default true,
  constraint weekly_plans_user_week_unique unique (user_id, week_number)
);

create index if not exists idx_weekly_plans_user_current
  on public.weekly_plans (user_id, is_current);

alter table public.weekly_plans enable row level security;

drop policy if exists "Users read own weekly plan" on public.weekly_plans;
create policy "Users read own weekly plan"
  on public.weekly_plans for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own weekly plan" on public.weekly_plans;
create policy "Users insert own weekly plan"
  on public.weekly_plans for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own weekly plan" on public.weekly_plans;
create policy "Users update own weekly plan"
  on public.weekly_plans for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  week_number integer not null,
  week_start_date date not null,
  completion_rate real not null,
  avg_overall_score real not null,
  avg_confidence real,
  avg_clarity real,
  avg_engagement real,
  avg_nervousness real,
  weakest_metric text,
  strongest_metric text,
  missed_days integer[] default '{}',
  review_narrative text not null,
  generated_at timestamptz not null default now(),
  shown_to_user boolean not null default false,
  constraint weekly_reviews_user_week_unique unique (user_id, week_number)
);

alter table public.weekly_reviews enable row level security;

drop policy if exists "Users read own reviews" on public.weekly_reviews;
create policy "Users read own reviews"
  on public.weekly_reviews for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own reviews" on public.weekly_reviews;
create policy "Users insert own reviews"
  on public.weekly_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own reviews" on public.weekly_reviews;
create policy "Users update own reviews"
  on public.weekly_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.personal_bests (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  overall real default 0,
  confidence real default 0,
  clarity real default 0,
  engagement real default 0,
  nervousness real default 0,
  posture_stability real default 0,
  gesture_score real default 0,
  filler_ratio real default 1,
  speech_rate_score real default 0,
  updated_at timestamptz not null default now()
);

alter table public.personal_bests enable row level security;

drop policy if exists "Users read own personal bests" on public.personal_bests;
create policy "Users read own personal bests"
  on public.personal_bests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own personal bests" on public.personal_bests;
create policy "Users upsert own personal bests"
  on public.personal_bests for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.session_scores
  add column if not exists week_number integer default null,
  add column if not exists plan_day integer default null,
  add column if not exists plan_session_num integer default null,
  add column if not exists is_recovery boolean default false,
  add column if not exists target_skill text default null;

create index if not exists idx_session_scores_user_week
  on public.session_scores (user_id, week_number);

create index if not exists idx_weekly_reviews_user_shown
  on public.weekly_reviews (user_id, shown_to_user);
