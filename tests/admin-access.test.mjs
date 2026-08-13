import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

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

test("anonymous check-in policy remains in migration history", async () => {
  const initialMigration = await read(
    "supabase/migrations/20260709063703_157f86e8-47af-4277-9351-9ea27a75d791.sql",
  );

  assert.match(initialMigration, /Public can check in for active events/);
  assert.match(initialMigration, /TO anon, authenticated/);
  assert.match(initialMigration, /ON public\.attendance FOR INSERT/);
});
