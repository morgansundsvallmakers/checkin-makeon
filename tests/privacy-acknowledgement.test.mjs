import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migrationPath =
  "supabase/migrations/20260828181252_add_privacy_acknowledgement_to_checkin.sql";

test("privacy acknowledgement is versioned on the member record", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /add column privacy_acknowledged_at timestamp with time zone/i);
  assert.match(migration, /add column privacy_notice_version text/i);
  assert.match(migration, /v_privacy_notice_version constant text := '2026-08-28-v1'/i);
  assert.doesNotMatch(migration, /privacy_acknowledged\s+boolean/i);
});

test("a member who acknowledged the current version follows normal check-in", async () => {
  const migration = await read(migrationPath);

  assert.match(
    migration,
    /if v_member\.privacy_acknowledged_at is null[\s\S]*privacy_notice_version is distinct from v_privacy_notice_version then/i,
  );
  assert.match(
    migration,
    /insert into public\.attendance[\s\S]*case when v_inserted then 'ok' else 'already'/i,
  );
});

test("an unacknowledged member is stopped before attendance is written", async () => {
  const migration = await read(migrationPath);
  const requiredAt = migration.indexOf("'privacy_required'::text");
  const attendanceAt = migration.indexOf("insert into public.attendance");

  assert.ok(requiredAt >= 0);
  assert.ok(attendanceAt > requiredAt);
  assert.match(
    migration,
    /if p_namn is null or pg_catalog\.btrim\(p_namn\) = '' then[\s\S]*'privacy_required'/i,
  );
});

test("a matching name saves acknowledgement and checks in atomically", async () => {
  const migration = await read(migrationPath);
  const acknowledgementAt = migration.indexOf("update public.members");
  const attendanceAt = migration.indexOf("insert into public.attendance");
  const acknowledgementUpdate = migration.slice(acknowledgementAt, attendanceAt);

  assert.ok(acknowledgementAt >= 0);
  assert.ok(attendanceAt > acknowledgementAt);
  assert.match(
    migration,
    /update public\.members[\s\S]*privacy_acknowledged_at = pg_catalog\.now\(\)[\s\S]*privacy_notice_version = v_privacy_notice_version/i,
  );
  assert.doesNotMatch(acknowledgementUpdate, /\bnamn\s*=|p_namn/i);
  assert.doesNotMatch(migration, /\b(commit|rollback)\b/i);
});

test("a wrong name returns a neutral error before acknowledgement or check-in", async () => {
  const migration = await read(migrationPath);
  const mismatchAt = migration.indexOf("'privacy_name_mismatch'::text");
  const acknowledgementAt = migration.indexOf("update public.members");
  const attendanceAt = migration.indexOf("insert into public.attendance");

  assert.ok(mismatchAt >= 0);
  assert.ok(acknowledgementAt > mismatchAt);
  assert.ok(attendanceAt > mismatchAt);
  assert.match(migration, /Namnet stämmer inte\. Kontrollera uppgifterna och försök igen\./);
  assert.doesNotMatch(
    migration.slice(mismatchAt, acknowledgementAt),
    /v_member\.namn::text as display_name/i,
  );
});

test("name comparison only normalizes case and harmless whitespace", async () => {
  const migration = await read(migrationPath);
  const normalization =
    /pg_catalog\.lower\(\s*pg_catalog\.regexp_replace\(pg_catalog\.btrim\((p_namn|v_member\.namn)\), '\[\[:space:\]\]\+', ' ', 'g'\)\s*\)/g;

  assert.equal([...migration.matchAll(normalization)].length, 2);
  assert.doesNotMatch(migration, /levenshtein|similarity|soundex|fuzzy/i);
});

test("unknown and inactive member numbers share the same neutral response", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /if not found or not v_member\.aktiv then/i);
  assert.equal(migration.match(/Medlemsnumret finns inte aktivt i CheckIn MakeOn\./g)?.length, 1);
});

test("a later name change does not invalidate an existing acknowledgement", async () => {
  const migration = await read(migrationPath);
  const acknowledgementGate = migration.match(
    /if v_member\.privacy_acknowledged_at is null[\s\S]*?then\n    if p_namn/,
  )?.[0];

  assert.ok(acknowledgementGate);
  assert.doesNotMatch(acknowledgementGate, /v_member\.namn/);
});

test("the browser receives no stored name before confirmation and cancel writes nothing", async () => {
  const migration = await read(migrationPath);
  const route = await read("src/routes/index.tsx");
  const requiredResult = migration.slice(
    migration.indexOf("'privacy_required'::text"),
    migration.indexOf("if pg_catalog.lower"),
  );
  const cancelHandler = route.match(/function cancelPrivacyConfirmation\(\) \{[\s\S]*?\n  \}/)?.[0];

  assert.doesNotMatch(requiredResult, /v_member\.namn|display_name/i);
  assert.match(route, /p_namn: privacyName/);
  assert.doesNotMatch(route, /\.from\("members"\)|\.from\("attendance"\)/);
  assert.ok(cancelHandler);
  assert.doesNotMatch(cancelHandler, /supabase|rpc|fetch/);
});
