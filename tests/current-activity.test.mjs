import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  countCheckInsOnSwedishDate,
  getSingleActivityTitle,
  getSwedishCalendarDate,
} from "../src/lib/current-activity.ts";

test("uses the neutral heading when there is no activity today", () => {
  assert.equal(getSingleActivityTitle([]), null);
});

test("uses the activity title when exactly one activity is today", () => {
  assert.equal(getSingleActivityTitle([{ titel: "FixIt-Day" }]), "FixIt-Day");
});

test("uses the neutral heading when several activities are today", () => {
  assert.equal(getSingleActivityTitle([{ titel: "FixIt-Day" }, { titel: "Medlemskväll" }]), null);
});

test("today follows the Swedish calendar day around UTC midnight", () => {
  assert.equal(getSwedishCalendarDate(new Date("2026-08-14T22:30:00Z")), "2026-08-15");
  assert.equal(getSwedishCalendarDate(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});

test("counts all check-ins on the Swedish calendar date across activities", () => {
  const attendance = [
    { incheckad: "2026-08-14T21:59:59Z", event_id: "make-on" },
    { incheckad: "2026-08-14T22:00:00Z", event_id: "fix-it-day" },
    { incheckad: "2026-08-15T08:00:00Z", event_id: "other-activity" },
    { incheckad: "2026-08-15T21:59:59Z", event_id: "fix-it-day" },
    { incheckad: "2026-08-15T22:00:00Z", event_id: "make-on" },
  ];

  assert.equal(countCheckInsOnSwedishDate(attendance, "2026-08-15"), 3);
});

test("counts separate attendance rows for the same member on different activities", () => {
  const attendance = [
    { incheckad: "2026-08-15T08:00:00Z", member_id: "member-1", event_id: "fix-it-day" },
    { incheckad: "2026-08-15T10:00:00Z", member_id: "member-1", event_id: "other-activity" },
  ];

  assert.equal(countCheckInsOnSwedishDate(attendance, "2026-08-15"), 2);
});

test("the data model prevents duplicate check-ins for the same member and activity", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260709063703_157f86e8-47af-4277-9351-9ea27a75d791.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /UNIQUE \(member_id, event_id\)/);
});
