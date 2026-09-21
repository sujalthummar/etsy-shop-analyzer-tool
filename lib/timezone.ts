/** Current local hour/minute/date in an arbitrary IANA timezone, using only
 *  the built-in Intl API — no extra date library needed. */
export function getLocalTimeParts(timeZone: string, date: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  // Some environments render midnight as "24" with hour12:false — normalize it.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return { hour, minute, dateStr: `${year}-${month}-${day}` };
}
