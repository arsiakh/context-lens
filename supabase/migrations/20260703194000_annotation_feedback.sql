create table if not exists public.annotation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  annotation_id text not null,
  annotation_type text not null check (annotation_type in ('vocab', 'inBookRef', 'realWorldRef')),
  created_at timestamptz not null default now()
);

create index if not exists annotation_feedback_user_created_idx
  on public.annotation_feedback(user_id, created_at desc);

alter table public.annotation_feedback enable row level security;

create policy "annotation_feedback_select_own"
  on public.annotation_feedback
  for select
  using (auth.uid() = user_id);

create policy "annotation_feedback_insert_own"
  on public.annotation_feedback
  for insert
  with check (auth.uid() = user_id);
