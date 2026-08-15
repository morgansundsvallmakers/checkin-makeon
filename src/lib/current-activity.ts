type Activity = {
  titel: string;
};

type Attendance = {
  incheckad: string;
};

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

export function countCheckInsOnSwedishDate(attendance: Attendance[] | null, date: string) {
  return (attendance ?? []).filter(
    (checkIn) => getSwedishCalendarDate(new Date(checkIn.incheckad)) === date,
  ).length;
}
