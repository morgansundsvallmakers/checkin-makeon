type Event = {
  id: string;
  titel: string;
  datum: string;
};

type Attendance = {
  member_id: string;
  event_id: string;
};

export function isFixItDayTitle(title: string) {
  return title.toLocaleLowerCase("sv-SE").replace(/[^a-z0-9]/g, "") === "fixitday";
}

export function getLatestCompletedFixItEventIds(events: Event[], today: string) {
  return events
    .filter((event) => isFixItDayTitle(event.titel) && event.datum <= today)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id.localeCompare(a.id))
    .slice(0, 3)
    .map((event) => event.id);
}

export function getFixItStarCounts(events: Event[], attendance: Attendance[], today: string) {
  const latestEventIds = new Set(getLatestCompletedFixItEventIds(events, today));
  const attendedEventsByMember = new Map<string, Set<string>>();

  for (const checkIn of attendance) {
    if (!latestEventIds.has(checkIn.event_id)) continue;
    const attendedEvents = attendedEventsByMember.get(checkIn.member_id) ?? new Set<string>();
    attendedEvents.add(checkIn.event_id);
    attendedEventsByMember.set(checkIn.member_id, attendedEvents);
  }

  return new Map(
    [...attendedEventsByMember].map(([memberId, attendedEvents]) => [
      memberId,
      attendedEvents.size,
    ]),
  );
}

export function formatFixItStars(count: number) {
  return "⭐".repeat(Math.max(0, Math.min(3, count)));
}
