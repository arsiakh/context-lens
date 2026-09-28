-- Core saved-library schema. This migration intentionally precedes the
-- upsert_book function so a fresh project can replay every migration in order.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index if not exists books_user_title_ci_idx
  on public.books (user_id, lower(title));

create unique index if not exists books_id_user_idx
  on public.books (id, user_id);

create index if not exists books_user_created_idx
  on public.books (user_id, created_at desc);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null,
  passage_text text not null check (btrim(passage_text) <> ''),
  annotations jsonb not null,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  constraint notes_book_owner_fk
    foreign key (book_id, user_id)
    references public.books(id, user_id)
    on delete cascade
);

create index if not exists notes_user_book_created_idx
  on public.notes (user_id, book_id, created_at asc);

-- `create table if not exists` does not modify a table that was provisioned
-- manually before migrations were introduced. Add the owner-safe composite
-- foreign key to those projects when it is missing.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_book_owner_fk'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_book_owner_fk
      foreign key (book_id, user_id)
      references public.books(id, user_id)
      on delete cascade;
  end if;
end;
$$;

alter table public.books enable row level security;
alter table public.notes enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own"
  on public.books for select
  using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own"
  on public.books for insert
  with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own"
  on public.books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own"
  on public.books for delete
  using (auth.uid() = user_id);

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
  on public.notes for delete
  using (auth.uid() = user_id);

revoke all on public.books from anon;
revoke all on public.notes from anon;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
