-- Force all learner writes through the revision-controlled RPC.
-- Apply after 001_personal_study.sql. Existing version-1 app snapshots satisfy
-- this boundary contract; the application performs the deeper Zod validation.

alter table public.study_snapshots
  add constraint snapshot_contract check (coalesce(
    jsonb_typeof(payload) = 'object'
    and payload->>'version' = '1'
    and jsonb_typeof(payload->'profile') = 'object'
    and jsonb_typeof(payload->'attempts') = 'array'
    and jsonb_typeof(payload->'reviews') = 'object'
    and jsonb_typeof(payload->'mistakeReviews') = 'object'
    and jsonb_typeof(payload->'drafts') = 'object'
    and jsonb_typeof(payload->'mood') = 'object'
    and (
      jsonb_typeof(payload->'exam') = 'object'
      or payload->'exam' = 'null'::jsonb
    )
    and jsonb_typeof(payload->'updatedAt') = 'string',
    false
  ));

revoke insert, update, delete on public.study_snapshots from authenticated;
drop policy if exists "owner inserts snapshot" on public.study_snapshots;
drop policy if exists "owner updates snapshot" on public.study_snapshots;

create or replace function public.save_study_snapshot(
  p_payload jsonb,
  p_expected_revision integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  current_revision integer;
  next_revision integer;
begin
  if caller_id is null or not exists (
    select 1
    from public.allowed_learners
    where user_id = caller_id
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'invalid_revision';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));
  select revision
    into current_revision
    from public.study_snapshots
    where user_id = caller_id
    for update;
  if coalesce(current_revision, 0) <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  next_revision := coalesce(current_revision, 0) + 1;
  insert into public.study_snapshots(user_id, payload, revision, updated_at)
  values (caller_id, p_payload, next_revision, now())
  on conflict (user_id) do update
    set payload = excluded.payload,
        revision = excluded.revision,
        updated_at = excluded.updated_at;
  return next_revision;
end;
$$;

revoke all on function public.save_study_snapshot(jsonb, integer)
  from public, anon;
grant execute on function public.save_study_snapshot(jsonb, integer)
  to authenticated;
