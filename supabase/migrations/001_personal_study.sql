-- Run once in a new Supabase project. Disable public signups in Auth settings.
-- Create the learner in Supabase Auth, then explicitly allow their UUID below.
create table public.allowed_learners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.allowed_learners enable row level security;
create policy "learner can read own membership" on public.allowed_learners
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.allowed_learners from anon, authenticated;
grant select on public.allowed_learners to authenticated;

create table public.study_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (coalesce(jsonb_typeof(payload) = 'object' and payload->>'version' = '1', false)),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint snapshot_size check (octet_length(payload::text) <= 10485760)
);
alter table public.study_snapshots enable row level security;
create policy "owner reads snapshot" on public.study_snapshots for select to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.allowed_learners where user_id = (select auth.uid())));
create policy "owner inserts snapshot" on public.study_snapshots for insert to authenticated
  with check (user_id = (select auth.uid()) and exists(select 1 from public.allowed_learners where user_id = (select auth.uid())));
create policy "owner updates snapshot" on public.study_snapshots for update to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.allowed_learners where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.allowed_learners where user_id = (select auth.uid())));
revoke all on public.study_snapshots from anon, authenticated;
grant select, insert, update on public.study_snapshots to authenticated;

-- Security invoker retains RLS. Advisory lock serialises first insert and updates.
create function public.save_study_snapshot(p_payload jsonb, p_expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare current_revision integer; next_revision integer;
begin
  if auth.uid() is null or not exists(select 1 from public.allowed_learners where user_id = auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'invalid_revision'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select revision into current_revision from public.study_snapshots where user_id = auth.uid() for update;
  if coalesce(current_revision, 0) <> p_expected_revision then raise exception 'revision_conflict'; end if;
  next_revision := coalesce(current_revision, 0) + 1;
  insert into public.study_snapshots(user_id, payload, revision, updated_at)
  values (auth.uid(), p_payload, next_revision, now())
  on conflict (user_id) do update set payload = excluded.payload, revision = excluded.revision, updated_at = excluded.updated_at;
  return next_revision;
end;
$$;
revoke all on function public.save_study_snapshot(jsonb, integer) from public, anon;
grant execute on function public.save_study_snapshot(jsonb, integer) to authenticated;

-- After creating the learner manually, run with their actual Auth UUID:
-- insert into public.allowed_learners(user_id) values ('YOUR_AUTH_USER_UUID');
