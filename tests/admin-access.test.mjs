import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
  canCloseInviteModal,
  createExclusiveAdminMutation,
  getAdminStatusChangeBlockReason,
  identifyCurrentAdminUser,
} from "../src/components/admin/admins-panel.logic.ts";

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

test("admin invitations are server-side, authorized, and cleaned up on role failure", async () => {
  const adminFunctions = await read("src/lib/admins.functions.ts");

  assert.match(
    adminFunctions,
    /inviteAdmin = createServerFn\(\{ method: "POST" \}\)[\s\S]*\.middleware\(\[requireSupabaseAuth\]\)/,
  );
  assert.match(adminFunctions, /\.validator\(\(data\) =>/);
  assert.match(adminFunctions, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(100\)/);
  assert.match(adminFunctions, /email: z\.string\(\)\.trim\(\)\.email\(\)\.max\(254\)/);
  assert.match(adminFunctions, /role\.role === "admin" && role\.aktiv === true/);
  assert.match(adminFunctions, /new URL\("\/update-password", getRequestUrl\(\)\.origin\)/);
  assert.match(
    adminFunctions,
    /inviteUserByEmail\(data\.email, \{[\s\S]*data: \{ name: data\.name \}/,
  );
  assert.match(
    adminFunctions,
    /\.upsert\([\s\S]*role: "admin", aktiv: true[\s\S]*onConflict: "user_id,role"/,
  );
  assert.match(adminFunctions, /auth\.admin\.deleteUser\([\s\S]*invitedUser\.id/);
  assert.match(
    adminFunctions,
    /cleanupError[\s\S]*\.from\("user_roles"\)[\s\S]*\.delete\(\)[\s\S]*invitedUser\.id/,
  );
  assert.match(adminFunctions, /user_metadata\?\.name/);
});

test("the admin panel uses the real admin backend without changing the preview", async () => {
  const adminsPanel = await read("src/components/admin/AdminsPanel.tsx");
  const adminPreview = await read("src/routes/admin-preview.tsx");

  assert.match(adminsPanel, /useServerFn\(listAdmins\)/);
  assert.match(adminsPanel, /useServerFn\(inviteAdmin\)/);
  assert.match(adminsPanel, /useServerFn\(setAdminActive\)/);
  assert.match(adminsPanel, /admin\.name \?\? "—"/);
  assert.match(adminsPanel, /identifyCurrentAdminUser\(\(\) => supabase\.auth\.getUser\(\)\)/);
  assert.match(adminsPanel, /getAdminStatusChangeBlockReason/);
  assert.match(adminsPanel, /createExclusiveAdminMutation/);
  assert.match(adminsPanel, /canCloseInviteModal\(saving\)/);
  assert.match(adminsPanel, /<Modal title="Lägg till administratör" onClose=\{requestClose\}>/);
  assert.match(
    adminsPanel,
    /type="button"[\s\S]*onClick=\{requestClose\}[\s\S]*disabled=\{saving\}[\s\S]*Avbryt/,
  );
  assert.doesNotMatch(adminsPanel, /createDemoAdminUserService|Laddar demo|Förhandsvisning/);
  assert.match(adminPreview, /createDemoAdminUserService/);
});

test("admin mutations are exclusive and do not start competing refreshes", async () => {
  const mutation = createExclusiveAdminMutation();
  let finishFirst;
  const firstMayFinish = new Promise((resolve) => {
    finishFirst = resolve;
  });
  const calls = [];
  const setAdminActiveMock = async () => {
    calls.push("set-active");
    await firstMayFinish;
  };
  const refreshMock = async () => calls.push("refresh");

  const first = mutation.run(async () => {
    await setAdminActiveMock();
    await refreshMock();
  });
  const competing = await mutation.run(async () => {
    calls.push("competing-mutation");
    await refreshMock();
  });

  assert.equal(mutation.isBusy(), true);
  assert.deepEqual(competing, { started: false });
  assert.deepEqual(calls, ["set-active"]);

  finishFirst();
  await first;
  assert.equal(mutation.isBusy(), false);
  assert.deepEqual(calls, ["set-active", "refresh"]);

  const later = await mutation.run(async () => calls.push("later-mutation"));
  assert.equal(later.started, true);
  assert.deepEqual(calls, ["set-active", "refresh", "later-mutation"]);
});

test("current-user identification fails closed and can be retried", async () => {
  let attempts = 0;
  const getUserMock = async () => {
    attempts += 1;
    return attempts === 1
      ? { data: { user: null }, error: new Error("mock auth failure") }
      : { data: { user: { id: "current-user" } }, error: null };
  };

  await assert.rejects(
    identifyCurrentAdminUser(getUserMock),
    /Kunde inte identifiera den inloggade användaren/,
  );
  assert.match(
    getAdminStatusChangeBlockReason({ user_id: "another-user", aktiv: true }, null, 2),
    /måste identifieras/,
  );

  assert.equal(await identifyCurrentAdminUser(getUserMock), "current-user");
  assert.equal(attempts, 2);
});

test("invite modal cannot close or start another mutation while an invite is pending", async () => {
  const mutation = createExclusiveAdminMutation();
  let finishInvite;
  const inviteMayFinish = new Promise((resolve) => {
    finishInvite = resolve;
  });
  let inviteCalls = 0;
  const inviteAdminMock = async () => {
    inviteCalls += 1;
    await inviteMayFinish;
  };

  const invite = mutation.run(inviteAdminMock);
  const duplicate = await mutation.run(inviteAdminMock);

  assert.equal(canCloseInviteModal(true), false);
  assert.equal(canCloseInviteModal(false), true);
  assert.deepEqual(duplicate, { started: false });
  assert.equal(inviteCalls, 1);

  finishInvite();
  await invite;

  await assert.rejects(
    mutation.run(async () => {
      throw new Error("mock invite failure");
    }),
    /mock invite failure/,
  );
  assert.equal(mutation.isBusy(), false);
  assert.equal((await mutation.run(async () => "retry")).started, true);
});

test("admin status guard blocks self and final-admin deactivation", () => {
  assert.match(
    getAdminStatusChangeBlockReason({ user_id: "self", aktiv: true }, "self", 2),
    /eget administratörskonto/,
  );
  assert.match(
    getAdminStatusChangeBlockReason({ user_id: "other", aktiv: true }, "self", 1),
    /sista aktiva administratören/,
  );
  assert.equal(getAdminStatusChangeBlockReason({ user_id: "other", aktiv: true }, "self", 2), null);
  assert.equal(
    getAdminStatusChangeBlockReason({ user_id: "other", aktiv: false }, "self", 1),
    null,
  );
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
  const originalCheckInMigration = await read(
    "supabase/migrations/20260819210618_add_public_checkin_function.sql",
  );
  const privacyMigration = await read(
    "supabase/migrations/20260828181252_add_privacy_acknowledgement_to_checkin.sql",
  );
  const checkInRoute = await read("src/routes/index.tsx");

  assert.match(originalCheckInMigration, /function public\.check_in_member/i);
  assert.match(privacyMigration, /drop function public\.check_in_member\(text\)/i);
  assert.match(
    privacyMigration,
    /function public\.check_in_member\([\s\S]*p_namn text default null/i,
  );
  assert.match(privacyMigration, /security definer/i);
  assert.match(privacyMigration, /set search_path = ''/i);
  assert.match(privacyMigration, /on conflict \(member_id, event_id\) do nothing/i);
  assert.match(privacyMigration, /Europe\/Stockholm/);
  assert.match(
    privacyMigration,
    /revoke all on function public\.check_in_member\(text, text\) from public/i,
  );
  assert.match(
    privacyMigration,
    /grant execute on function public\.check_in_member\(text, text\) to anon, authenticated/i,
  );
  assert.match(checkInRoute, /\.rpc\("check_in_member"/);
  assert.doesNotMatch(checkInRoute, /\.from\("members"\)|\.from\("attendance"\)/);
});
