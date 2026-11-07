/**
 * A run's time, as the Activity drawer shows it (#3471, owner decisions Q91 A and Q92 A): clock time, 12-hour, no
 * leading zero, a space, then uppercase AM/PM ("9:25 AM"), so it never reads as a duration the way "09:25" did. A run
 * from an earlier day than `now` also shows its date ("Nov 6, 9:25 AM"). The one place a run's time is formatted: the
 * drawer's rows, their earlier results and its bar row all draw through it.
 *
 * Read in the viewer's own time zone (the local `get*` readers), but never through the locale: the month names and the
 * AM/PM marker are written here, so the words are the same in every locale.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** `at` as the drawer shows it, read against `now`: "9:25 AM" today, "Nov 6, 9:25 AM" on an earlier day. */
export const runTime = (at: Date, now: Date): string => {
  const h = at.getHours();
  const clock = `${h % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return sameDay(at, now) ? clock : `${MONTHS[at.getMonth()]} ${at.getDate()}, ${clock}`;
};
