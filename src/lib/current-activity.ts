type Activity = {
  titel: string;
};

type ScheduledActivity = {
  titel: string;
  datum: string;
  aktiv: boolean;
};

type Attendance = {
  incheckad: string;
};

export type HomeActivityState =
  | { kind: "today"; titel: string | null }
  | { kind: "upcoming"; titel: string; datum: string }
  | { kind: "none" };

export function getSwedishCalendarDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getSingleActivityTitle(activities: Activity[] | null) {
  return activities?.length === 1 ? activities[0].titel : null;
}

export function getHomeActivityState(
  activities: ScheduledActivity[] | null,
  today: string,
): HomeActivityState {
  const scheduled = activities ?? [];
  const activeToday = scheduled.filter(
    (activity) => activity.datum === today && activity.aktiv,
  );

  if (activeToday.length > 0) {
    return {
      kind: "today",
      titel: getSingleActivityTitle(activeToday),
    };
  }

  const upcoming = scheduled
    .filter((activity) => activity.datum >= today)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  return upcoming
    ? { kind: "upcoming", titel: upcoming.titel, datum: upcoming.datum }
    : { kind: "none" };
}

export function countCheckInsOnSwedishDate(attendance: Attendance[] | null, date: string) {
  return (attendance ?? []).filter(
    (checkIn) => getSwedishCalendarDate(new Date(checkIn.incheckad)) === date,
  ).length;
}
