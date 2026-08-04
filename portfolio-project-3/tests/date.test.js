import test from "node:test";
import assert from "node:assert/strict";

import {
    addMonths,
    compareISO,
    daysInMonth,
    endOfMonth,
    isValidISODate,
    isValidMonthKey,
    isWithinRange,
    lastMonths,
    monthKey,
    startOfMonth,
    todayISO
} from "../src/utils/date.js";

test("isValidISODate rejects impossible calendar dates", () => {
    assert.equal(isValidISODate("2026-02-28"), true);
    assert.equal(isValidISODate("2024-02-29"), true, "2024 is a leap year");
    assert.equal(isValidISODate("2026-02-29"), false, "2026 is not");
    assert.equal(isValidISODate("2026-13-01"), false);
    assert.equal(isValidISODate("2026-1-1"), false, "padding is required");
    assert.equal(isValidISODate(""), false);
    assert.equal(isValidISODate(20260804), false);
});

test("isValidMonthKey checks the month range", () => {
    assert.equal(isValidMonthKey("2026-08"), true);
    assert.equal(isValidMonthKey("2026-00"), false);
    assert.equal(isValidMonthKey("2026-13"), false);
    assert.equal(isValidMonthKey("2026-08-04"), false);
});

test("todayISO uses local calendar fields", () => {
    assert.equal(todayISO(new Date(2026, 7, 4, 23, 59)), "2026-08-04");
    assert.equal(todayISO(new Date(2026, 0, 1, 0, 0)), "2026-01-01");
});

test("monthKey slices a valid date only", () => {
    assert.equal(monthKey("2026-08-04"), "2026-08");
    assert.equal(monthKey("2026-02-30"), "");
});

test("addMonths crosses year boundaries in both directions", () => {
    assert.equal(addMonths("2026-01", -1), "2025-12");
    assert.equal(addMonths("2026-12", 1), "2027-01");
    assert.equal(addMonths("2026-08", 0), "2026-08");
    assert.equal(addMonths("2026-03", -14), "2025-01");
    assert.throws(() => addMonths("nope", 1), TypeError);
});

test("daysInMonth knows February", () => {
    assert.equal(daysInMonth("2026-02"), 28);
    assert.equal(daysInMonth("2024-02"), 29);
    assert.equal(daysInMonth("2026-04"), 30);
    assert.equal(daysInMonth("2026-12"), 31);
});

test("startOfMonth and endOfMonth bracket a month", () => {
    assert.equal(startOfMonth("2026-02"), "2026-02-01");
    assert.equal(endOfMonth("2026-02"), "2026-02-28");
    assert.equal(endOfMonth("2026-08"), "2026-08-31");
});

test("lastMonths returns an inclusive window, oldest first", () => {
    assert.deepEqual(lastMonths(3, "2026-03"), ["2026-01", "2026-02", "2026-03"]);
    assert.deepEqual(lastMonths(1, "2026-03"), ["2026-03"]);
    assert.deepEqual(lastMonths(0, "2026-03"), []);
    assert.equal(lastMonths(6, "2026-02")[0], "2025-09");
});

test("compareISO sorts dates lexicographically", () => {
    const dates = ["2026-08-04", "2025-12-31", "2026-01-05"];
    assert.deepEqual([...dates].sort(compareISO), ["2025-12-31", "2026-01-05", "2026-08-04"]);
});

test("isWithinRange treats both bounds as inclusive and optional", () => {
    assert.equal(isWithinRange("2026-08-04", "2026-08-01", "2026-08-31"), true);
    assert.equal(isWithinRange("2026-08-01", "2026-08-01", ""), true);
    assert.equal(isWithinRange("2026-07-31", "2026-08-01", ""), false);
    assert.equal(isWithinRange("2026-09-01", "", "2026-08-31"), false);
    assert.equal(isWithinRange("2026-09-01", "", ""), true);
});
