import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFixItStars,
  getFixItStarCounts,
  getLatestCompletedFixItEventIds,
  isFixItDayTitle,
} from "../src/lib/fixit-stars.ts";

const events = [
  { id: "old", titel: "Fix-It Day", datum: "2026-01-01" },
  { id: "a", titel: "FixIt-Day", datum: "2026-03-01" },
  { id: "b", titel: "Fix it day", datum: "2026-05-01" },
  { id: "c", titel: "FIX-IT DAY", datum: "2026-08-15" },
  { id: "future", titel: "Fix-It Day", datum: "2026-10-01" },
  { id: "make-on", titel: "MakeOn", datum: "2026-08-15" },
];

const today = "2026-08-15";

test("recognizes known Fix-It Day spelling and punctuation variants", () => {
  assert.equal(isFixItDayTitle("Fix-It Day"), true);
  assert.equal(isFixItDayTitle("FixIt-Day"), true);
  assert.equal(isFixItDayTitle("Fix it day"), true);
  assert.equal(isFixItDayTitle("MakeOn"), false);
});

test("selects the three latest completed Fix-It Day activities", () => {
  assert.deepEqual(getLatestCompletedFixItEventIds(events, today), ["c", "b", "a"]);
});

test("a member with no recent Fix-It attendance gets zero stars", () => {
  const counts = getFixItStarCounts(events, [], today);
  assert.equal(counts.get("member"), undefined);
  assert.equal(formatFixItStars(counts.get("member") ?? 0), "");
});

test("a member who attended one of the latest three gets one star", () => {
  const counts = getFixItStarCounts(events, [{ member_id: "member", event_id: "c" }], today);
  assert.equal(formatFixItStars(counts.get("member") ?? 0), "⭐");
});

test("a member who attended two of the latest three gets two stars", () => {
  const attendance = [
    { member_id: "member", event_id: "b" },
    { member_id: "member", event_id: "c" },
  ];
  const counts = getFixItStarCounts(events, attendance, today);
  assert.equal(formatFixItStars(counts.get("member") ?? 0), "⭐⭐");
});

test("a member who attended all latest three gets three stars", () => {
  const attendance = ["a", "b", "c"].map((event_id) => ({ member_id: "member", event_id }));
  const counts = getFixItStarCounts(events, attendance, today);
  assert.equal(formatFixItStars(counts.get("member") ?? 0), "⭐⭐⭐");
});

test("attendance outside the latest three does not count", () => {
  const counts = getFixItStarCounts(events, [{ member_id: "member", event_id: "old" }], today);
  assert.equal(counts.get("member"), undefined);
});

test("future Fix-It Day attendance does not count", () => {
  const counts = getFixItStarCounts(events, [{ member_id: "member", event_id: "future" }], today);
  assert.equal(counts.get("member"), undefined);
});

test("duplicate attendance rows for one event count only once", () => {
  const attendance = [
    { member_id: "member", event_id: "c" },
    { member_id: "member", event_id: "c" },
  ];
  const counts = getFixItStarCounts(events, attendance, today);
  assert.equal(counts.get("member"), 1);
});

test("calculating stars cannot change existing leaderboard order", () => {
  const rankedMemberIds = ["first", "second", "third"];
  const attendance = [
    { member_id: "third", event_id: "a" },
    { member_id: "third", event_id: "b" },
    { member_id: "third", event_id: "c" },
  ];

  getFixItStarCounts(events, attendance, today);

  assert.deepEqual(rankedMemberIds, ["first", "second", "third"]);
});
