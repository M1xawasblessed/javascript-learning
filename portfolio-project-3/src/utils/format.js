/**
 * Money, number and date formatting.
 *
 * Amounts are stored as **integer minor units** (cents), never as floats: `0.1 + 0.2`
 * is a rounding bug waiting to happen in a finance app. Conversion to a display string
 * happens here and only here, through `Intl`.
 */

import { isValidISODate } from "./date.js";

const MINOR_UNITS = 100;

/** `Intl` formatters are expensive to build, so each configuration is created once. */
const formatterCache = new Map();

function cached(key, factory) {
    let formatter = formatterCache.get(key);
    if (!formatter) {
        formatter = factory();
        formatterCache.set(key, formatter);
    }
    return formatter;
}

/** Cents -> units: `1234` -> `12.34`. Only for display and chart geometry. */
export function fromMinor(minor) {
    return minor / MINOR_UNITS;
}

/** Units -> cents, rounded half away from zero: `12.345` -> `1235`. */
export function toMinor(amount) {
    const scaled = amount * MINOR_UNITS;
    return scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
}

/**
 * Parse user input into integer cents without ever going through a float.
 *
 * Accepts `1,234.56`, `1.234,56`, `€12`, `-8.5` and plain `42`. Returns
 * `{ ok: false }` for anything else, so callers can show a field error.
 */
export function parseAmount(input) {
    if (typeof input === "number" && Number.isFinite(input)) {
        return { ok: true, value: toMinor(input) };
    }
    if (typeof input !== "string") return { ok: false, value: 0 };

    // Drop currency symbols, spaces and non-breaking spaces; keep digits and separators.
    let text = input.trim().replace(/[\s ]/g, "").replace(/[^\d.,+-]/g, "");
    if (!text) return { ok: false, value: 0 };

    let sign = 1;
    if (text.startsWith("-")) {
        sign = -1;
        text = text.slice(1);
    } else if (text.startsWith("+")) {
        text = text.slice(1);
    }

    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");

    if (lastComma > -1 && lastDot > -1) {
        // Both present: the rightmost separator is the decimal one (1,234.56 or 1.234,56).
        const decimalSeparator = lastComma > lastDot ? "," : ".";
        const thousandsSeparator = decimalSeparator === "," ? "." : ",";
        text = text.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
    } else if (lastComma > -1) {
        // A lone comma is a decimal separator (12,50) unless it groups three digits (1,234).
        const tail = text.slice(lastComma + 1);
        text = tail.length === 3 ? text.split(",").join("") : text.split(",").join(".");
    }

    const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
    if (!match || (!match[1] && !match[2])) return { ok: false, value: 0 };

    const whole = match[1] || "0";
    const fraction = (match[2] || "").slice(0, 3);

    // Build cents from the digit strings, then round the third decimal manually.
    let cents = Number(whole) * MINOR_UNITS + Number((fraction.slice(0, 2) + "00").slice(0, 2));
    if (fraction.length === 3 && Number(fraction[2]) >= 5) cents += 1;
    if (!Number.isSafeInteger(cents)) return { ok: false, value: 0 };

    return { ok: true, value: cents === 0 ? 0 : sign * cents };
}

/** `formatMoney(-125050, { currency: "EUR" })` -> `-€1,250.50`. */
export function formatMoney(minor, { currency = "USD", locale = "en-US", signDisplay = "auto" } = {}) {
    const formatter = cached(`money:${locale}:${currency}:${signDisplay}`, () =>
        new Intl.NumberFormat(locale, { style: "currency", currency, signDisplay })
    );
    return formatter.format(fromMinor(minor));
}

/** Axis-friendly money: `1250000` cents -> `$12.5K`. */
export function formatCompactMoney(minor, { currency = "USD", locale = "en-US" } = {}) {
    const formatter = cached(`compact:${locale}:${currency}`, () =>
        new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            notation: "compact",
            maximumFractionDigits: 1
        })
    );
    return formatter.format(fromMinor(minor));
}

/** `0.4213` -> `42.1%`. */
export function formatPercent(ratio, { locale = "en-US", digits = 1 } = {}) {
    if (!Number.isFinite(ratio)) return "—";
    const formatter = cached(`percent:${locale}:${digits}`, () =>
        new Intl.NumberFormat(locale, {
            style: "percent",
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        })
    );
    return formatter.format(ratio);
}

/** `2026-08-04` -> `Aug 4, 2026`. Unparseable input is echoed back untouched. */
export function formatDate(isoDate, { locale = "en-US", style = "medium" } = {}) {
    if (!isValidISODate(isoDate)) return String(isoDate ?? "");

    const [year, month, day] = isoDate.split("-").map(Number);
    const formatter = cached(`date:${locale}:${style}`, () =>
        new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" })
    );
    return formatter.format(new Date(Date.UTC(year, month - 1, day)));
}

/** `2026-08` -> `Aug 2026` (or `Aug` when `short`). */
export function formatMonth(monthKey, { locale = "en-US", short = false } = {}) {
    const [year, month] = String(monthKey).split("-").map(Number);
    if (!year || !month) return String(monthKey ?? "");

    const formatter = cached(`month:${locale}:${short}`, () =>
        new Intl.DateTimeFormat(locale, short ? { month: "short", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" })
    );
    return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Clamp a string for display without cutting mid-word more than necessary. */
export function truncate(text, maxLength = 40) {
    const value = String(text ?? "");
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
