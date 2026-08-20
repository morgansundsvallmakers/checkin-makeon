import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production security migrations are represented in order", async () => {
  const migrationNames = await readdir(new URL("../supabase/migrations", import.meta.url));
  const expectedMigrations = [
    "20260819205528_add_public_leaderboard_function.sql",
    "20260819205940_rank_public_leaderboard_ties.sql",
    "20260819210618_add_public_checkin_function.sql",
    "20260819211923_restrict_member_attendance_select_rls.sql",
    "20260819212920_remove_public_attendance_insert_policy.sql",
  ];

  assert.deepEqual(
    migrationNames.filter((name) => expectedMigrations.includes(name)).sort(),
    expectedMigrations,
  );
});

test("admin page requires an active admin role", async () => {
  const adminRoute = await read("src/routes/admin.tsx");

  assert.match(adminRoute, /\.select\("role,aktiv"\)/);
  assert.match(adminRoute, /r\.role === "admin" && r\.aktiv === true/);
});

test("registration trigger is the only account-to-role mechanism", async () => {
  const candidateMigration = await read(
    "supabase/migrations/20260722135654_register_inactive_admin_candidates.sql",
  );
  const adminFunctions = await read("src/lib/admins.functions.ts");

  assert.match(candidateMigration, /insert into public\.user_roles/);
  assert.match(candidateMigration, /make_active/);
  assert.doesNotMatch(adminFunctions, /createAdminFn|auth\.admin\.createUser/);
});

test("admin status changes are atomic and database-protected", async () => {
  const migration = await read("supabase/migrations/20260813120201_protect_admin_activation.sql");

  assert.match(migration, /revoke update on table public\.user_roles from anon, authenticated/);
  assert.match(migration, /public\.has_role\(caller_id, 'admin'/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /target_user_id = caller_id/);
  assert.match(migration, /active_admin_count <= 1/);
});

test("historical public table policies are removed by the final migration chain", async () => {
  const initialMigration = await read(
    "supabase/migrations/20260709063703_157f86e8-47af-4277-9351-9ea27a75d791.sql",
  );
  const restrictSelect = await read(
    "supabase/migrations/20260819211923_restrict_member_attendance_select_rls.sql",
  );
  const restrictInsert = await read(
    "supabase/migrations/20260819212920_remove_public_attendance_insert_policy.sql",
  );

  assert.match(initialMigration, /alter table public\.members enable row level security/i);
  assert.match(initialMigration, /alter table public\.attendance enable row level security/i);
  assert.match(initialMigration, /Public can check in for active events/);
  assert.match(restrictSelect, /drop policy if exists "Public can view members"/i);
  assert.match(restrictSelect, /drop policy if exists "Public can view attendance"/i);
  assert.match(restrictSelect, /create policy "Admins can view members"/i);
  assert.match(restrictSelect, /create policy "Admins can view attendance"/i);
  assert.match(restrictSelect, /to authenticated/i);
  assert.match(restrictSelect, /public\.has_role\(auth\.uid\(\), 'admin'/i);
  assert.doesNotMatch(restrictSelect, /to anon/i);
  assert.match(restrictInsert, /drop policy if exists "Public can check in for active events"/i);
  assert.doesNotMatch(restrictInsert, /create policy/i);
});

test("public leaderboard access is exposed only through the intended RPC", async () => {
  const accessMigration = await read(
    "supabase/migrations/20260819205528_add_public_leaderboard_function.sql",
  );
  const leaderboardMigration = await read(
    "supabase/migrations/20260819205940_rank_public_leaderboard_ties.sql",
  );
  const leaderboardRoute = await read("src/routes/leaderboard.tsx");

  assert.match(leaderboardMigration, /function public\.get_public_leaderboard/i);
  assert.match(leaderboardMigration, /security definer/i);
  assert.match(leaderboardMigration, /set search_path = public/i);
  assert.match(leaderboardMigration, /rank\(\) over \(order by v\.visit_count desc\)/i);
  assert.match(leaderboardMigration, /Europe\/Stockholm/);
  assert.match(
    accessMigration,
    /revoke all on function public\.get_public_leaderboard\(text\) from public/i,
  );
  assert.match(
    accessMigration,
    /grant execute on function public\.get_public_leaderboard\(text\) to anon, authenticated/i,
  );
  assert.match(leaderboardRoute, /\.rpc\("get_public_leaderboard"/);
  assert.doesNotMatch(leaderboardRoute, /\.from\("members"\)|\.from\("attendance"\)/);
});

test("public check-in access is exposed only through the intended RPC", async () => {
  const checkInMigration = await read(
    "supabase/migrations/20260819210618_add_public_checkin_function.sql",
  );
  const checkInRoute = await read("src/routes/index.tsx");

  assert.match(checkInMigration, /function public\.check_in_member/i);
  assert.match(checkInMigration, /security definer/i);
  assert.match(checkInMigration, /set search_path = public/i);
  assert.match(checkInMigration, /on conflict \(member_id, event_id\) do nothing/i);
  assert.match(checkInMigration, /Europe\/Stockholm/);
  assert.match(
    checkInMigration,
    /revoke all on function public\.check_in_member\(text\) from public/i,
  );
  assert.match(
    checkInMigration,
    /grant execute on function public\.check_in_member\(text\) to anon, authenticated/i,
  );
  assert.match(checkInRoute, /\.rpc\("check_in_member"/);
  assert.doesNotMatch(checkInRoute, /\.from\("members"\)|\.from\("attendance"\)/);
});
