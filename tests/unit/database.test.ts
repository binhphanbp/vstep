import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { freshState } from "../../src/lib/learning";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}
describe("Supabase migration on a PostgreSQL engine", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values ('${owner}'),('${other}');`,
    );
    await db.exec(
      readFileSync("supabase/migrations/001_personal_study.sql", "utf8"),
    );
    await db.exec(
      readFileSync("supabase/migrations/002_harden_snapshots.sql", "utf8"),
    );
    await db.query("insert into public.allowed_learners values ($1)", [owner]);
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  it("allows the approved owner to save an initial snapshot", async () => {
    await asUser(owner);
    const { rows } = await db.query<{ revision: number }>(
      "select public.save_study_snapshot($1::jsonb,0) as revision",
      [JSON.stringify(freshState())],
    );
    expect(rows[0].revision).toBe(1);
    expect(
      (await db.query("select * from public.study_snapshots")).rows,
    ).toHaveLength(1);
  });
  it("rejects a stale revision and preserves the previous snapshot", async () => {
    await asUser(owner);
    await expect(
      db.query("select public.save_study_snapshot($1::jsonb,0)", [
        JSON.stringify(freshState()),
      ]),
    ).rejects.toThrow("revision_conflict");
    expect(
      (
        await db.query<{ revision: number }>(
          "select revision from public.study_snapshots",
        )
      ).rows[0].revision,
    ).toBe(1);
  });
  it("increments revisions for a current update", async () => {
    await asUser(owner);
    const { rows } = await db.query<{ revision: number }>(
      "select public.save_study_snapshot($1::jsonb,1) as revision",
      [JSON.stringify(freshState())],
    );
    expect(rows[0].revision).toBe(2);
  });
  it("denies an unapproved account and hides the owner snapshot", async () => {
    await asUser(other);
    expect(
      (await db.query("select * from public.study_snapshots")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.save_study_snapshot($1::jsonb,0)", [
        JSON.stringify(freshState()),
      ]),
    ).rejects.toThrow("not_authorized");
    await expect(
      db.query(
        "insert into public.study_snapshots(user_id,payload) values ($1,$2)",
        [other, JSON.stringify(freshState())],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("does not let a learner self-enrol or write another owner’s row", async () => {
    await asUser(other);
    await expect(
      db.query("insert into public.allowed_learners values ($1)", [other]),
    ).rejects.toThrow(/permission denied/);
    await asUser(owner);
    await expect(
      db.query(
        "insert into public.study_snapshots(user_id,payload) values ($1,$2)",
        [other, JSON.stringify(freshState())],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("forces the approved owner through the revision-controlled RPC", async () => {
    await asUser(owner);
    await expect(
      db.query(
        "update public.study_snapshots set payload = $1::jsonb where user_id = $2",
        [JSON.stringify(freshState()), owner],
      ),
    ).rejects.toThrow(/permission denied/);
    expect(
      (
        await db.query<{ revision: number }>(
          "select revision from public.study_snapshots",
        )
      ).rows[0].revision,
    ).toBe(2);
  });
  it("denies anonymous reads and RPC execution", async () => {
    await db.exec("reset role; set role anon");
    await expect(
      db.query("select * from public.study_snapshots"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("select public.save_study_snapshot($1::jsonb,0)", [
        JSON.stringify(freshState()),
      ]),
    ).rejects.toThrow(/permission denied/);
  });
  it("rejects malformed snapshot versions at the database boundary", async () => {
    await asUser(owner);
    await expect(
      db.query("select public.save_study_snapshot($1::jsonb,2)", ["{}"]),
    ).rejects.toThrow(/check constraint/);
  });
  it("rejects a version-only object at the database boundary", async () => {
    await asUser(owner);
    await expect(
      db.query("select public.save_study_snapshot($1::jsonb,2)", [
        JSON.stringify({ version: 1 }),
      ]),
    ).rejects.toThrow(/snapshot_contract/);
  });
});
