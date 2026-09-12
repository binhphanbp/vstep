-- Emergency schema rollback for 002_harden_snapshots.sql.
-- Take a database backup first. This reopens direct owner DML and should only
-- be used to restore an older application release that cannot call the RPC.

alter table public.study_snapshots
  drop constraint if exists snapshot_contract;

create policy "owner inserts snapshot" on public.study_snapshots
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.allowed_learners
      where user_id = (select auth.uid())
    )
  );
create policy "owner updates snapshot" on public.study_snapshots
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.allowed_learners
      where user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.allowed_learners
      where user_id = (select auth.uid())
    )
  );
grant insert, update on public.study_snapshots to authenticated;

alter function public.save_study_snapshot(jsonb, integer) security invoker;
