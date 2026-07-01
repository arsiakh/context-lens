-- PostgreSQL owns the case-insensitive conflict handling because PostgREST's
-- on_conflict parameter only accepts plain column names, not lower(title).
create or replace function public.upsert_book(p_title text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_book_id uuid;
  v_title text := btrim(p_title);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_title is null or v_title = '' then
    raise exception 'Book title is required' using errcode = '22023';
  end if;

  insert into public.books (user_id, title)
  values (auth.uid(), v_title)
  on conflict (user_id, (lower(title)))
  do update set title = excluded.title
  returning id into v_book_id;

  return v_book_id;
end;
$$;

revoke all on function public.upsert_book(text) from public;
grant execute on function public.upsert_book(text) to authenticated;
