create table public.session_scores (
  session_id text not null,
  user_id uuid not null,
  session_date timestamp with time zone null default now(),
  confidence real null,
  clarity real null,
  engagement real null,
  nervousness real null,
  overall real null,
  filler_ratio real null,
  pitch_variance_normalized real null,
  posture_stability_index real null,
  pause_ratio real null,
  gesture_score real null,
  topic_title text null default 'Untitled Session'::text,
  duration_label text null default '--'::text,
  is_first_session boolean null default false,
  raw_result jsonb null,
  constraint session_scores_pkey primary key (session_id),
  constraint session_scores_user_id_fkey foreign KEY (user_id) references user_profiles (id) on delete CASCADE,
  constraint session_scores_engagement_check check (
    (
      (engagement >= (0)::double precision)
      and (engagement <= (1)::double precision)
    )
  ),
  constraint session_scores_clarity_check check (
    (
      (clarity >= (0)::double precision)
      and (clarity <= (1)::double precision)
    )
  ),
  constraint session_scores_overall_check check (
    (
      (overall >= (0)::double precision)
      and (overall <= (1)::double precision)
    )
  ),
  constraint session_scores_nervousness_check check (
    (
      (nervousness >= (0)::double precision)
      and (nervousness <= (1)::double precision)
    )
  ),
  constraint session_scores_confidence_check check (
    (
      (confidence >= (0)::double precision)
      and (confidence <= (1)::double precision)
    )
  )
) TABLESPACE pg_default;


create table public.user_profiles (
  id uuid not null,
  display_name text null,
  speaking_goals text[] null default '{}'::text[],
  updated_at timestamp with time zone null default now(),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.motivational_tips (
  id uuid not null default gen_random_uuid (),
  streak_milestone integer not null,
  skill_focus text not null,
  tip_text text not null,
  created_at timestamp with time zone not null default now(),
  constraint motivational_tips_pkey primary key (id),
  constraint motivational_tips_skill_focus_check check (
    (
      skill_focus = any (
        array[
          'confidence'::text,
          'clarity'::text,
          'engagement'::text,
          'nervousness'::text,
          'overall'::text
        ]
      )
    )
  ),
  constraint motivational_tips_streak_milestone_check check ((streak_milestone = any (array[3, 7, 14, 30])))
) TABLESPACE pg_default;

create index IF not exists idx_tips_milestone_skill on public.motivational_tips using btree (streak_milestone, skill_focus) TABLESPACE pg_default;