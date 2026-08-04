/**
 * Date helpers.
 *
 * Every date in FinTrack is stored as a plain `YYYY-MM-DD` string and a month as
 * `YYYY-MM`. Strings are used instead of `Date` objects on purpose: ISO dates sort
 * and compare lexicographically, so filtering and sorting never touch a timezone.
 * Where real calendar math is needed (adding months, month lengths) the code goes
 * through `Date.UTC` so a user in UTC-5 never sees a day slip.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

const pad = (value, length = 2) => String(value).padStart(length, "0");

/** `true` when `value` is a real calendar date such as `2026-02-28` (rejects `2026-02-30`). */
export function isValidISODate(value) {
    if (typeof value !== "string") return false;
    const match = ISO_DATE.exec(value);
    if (!match) return false;

    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

/** `true` when `value` looks like `2026-08`. */
export function isValidMonthKey(value) {
    if (typeof value !== "string") return false;
    const match = ISO_MONTH.exec(value);
    if (!match) return false;
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
}

/** Today in the viewer's local calendar, as `YYYY-MM-DD`. */
export function todayISO(now = new Date()) {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `2026-08-04` -> `2026-08`. Returns `""` for anything unparseable. */
export function monthKey(isoDate) {
    return isValidISODate(isoDate) ? isoDate.slice(0, 7) : "";
}

/** Shift a month key by `delta` months: `addMonths("2026-01", -2)` -> `"2025-11"`. */
export function addMonths(month, delta) {
    if (!isValidMonthKey(month)) throw new TypeError(`Invalid month key: ${month}`);

    const [year, monthIndex] = month.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));

    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
}

/** Number of days in the given month key. */
export function daysInMonth(month) {
    if (!isValidMonthKey(month)) throw new TypeError(`Invalid month key: ${month}`);
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

/** First day of the month, as an ISO date. */
export function startOfMonth(month) {
    return `${month}-01`;
}

/** Last day of the month, as an ISO date. */
export function endOfMonth(month) {
    return `${month}-${pad(daysInMonth(month))}`;
}

/**
 * The `count` month keys ending at `endMonth`, oldest first.
 * `lastMonths(3, "2026-03")` -> `["2026-01", "2026-02", "2026-03"]`
 */
export function lastMonths(count, endMonth) {
    if (!Number.isInteger(count) || count < 1) return [];
    return Array.from({ length: count }, (_, index) => addMonths(endMonth, index - (count - 1)));
}

/** Comparator for ISO date strings; usable directly in `Array#sort`. */
export function compareISO(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

/** Inclusive range test against two optional bounds. */
export function isWithinRange(isoDate, from, to) {
    if (from && isoDate < from) return false;
    if (to && isoDate > to) return false;
    return true;
}
