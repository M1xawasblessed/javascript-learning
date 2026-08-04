import test from "node:test";
import assert from "node:assert/strict";

import {
    formatCompactMoney,
    formatDate,
    formatMoney,
    formatMonth,
    formatPercent,
    fromMinor,
    parseAmount,
    toMinor,
    truncate
} from "../src/utils/format.js";

test("toMinor rounds half away from zero", () => {
    assert.equal(toMinor(12.34), 1234);
    assert.equal(toMinor(0.005), 1);
    assert.equal(toMinor(-0.005), -1);
    assert.equal(toMinor(-12.345), -1235);
});

test("fromMinor is the inverse for display", () => {
    assert.equal(fromMinor(1234), 12.34);
    assert.equal(fromMinor(0), 0);
});

test("parseAmount handles plain decimals", () => {
    assert.deepEqual(parseAmount("42"), { ok: true, value: 4200 });
    assert.deepEqual(parseAmount("42.5"), { ok: true, value: 4250 });
    assert.deepEqual(parseAmount("42.50"), { ok: true, value: 4250 });
    assert.deepEqual(parseAmount("0.99"), { ok: true, value: 99 });
});

test("parseAmount avoids float drift", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point; integer cents are exact.
    assert.equal(parseAmount("0.1").value + parseAmount("0.2").value, parseAmount("0.30").value);
    assert.equal(parseAmount("1999.99").value, 199_999);
});

test("parseAmount understands both separator conventions", () => {
    assert.equal(parseAmount("1,234.56").value, 123_456);
    assert.equal(parseAmount("1.234,56").value, 123_456);
    assert.equal(parseAmount("1,234").value, 123_400, "a lone comma before three digits groups thousands");
    assert.equal(parseAmount("12,50").value, 1250, "a lone comma before two digits is a decimal point");
});

test("parseAmount strips currency symbols and whitespace, and keeps the sign", () => {
    assert.equal(parseAmount("  $ 12.30 ").value, 1230);
    assert.equal(parseAmount("€1.999,95").value, 199_995);
    assert.equal(parseAmount("-8.50").value, -850);
    assert.equal(parseAmount("+8.50").value, 850);
});

test("parseAmount rounds a third decimal and never produces -0", () => {
    assert.equal(parseAmount("12.345").value, 1235);
    assert.equal(parseAmount("12.344").value, 1234);
    assert.equal(Object.is(parseAmount("-0.00").value, -0), false);
});

test("parseAmount rejects junk", () => {
    for (const input of ["", "   ", "abc", ".", "-", "1.2.3", null, undefined, {}, NaN]) {
        assert.equal(parseAmount(input).ok, false, `expected ${String(input)} to be rejected`);
    }
});

test("parseAmount accepts finite numbers directly", () => {
    assert.deepEqual(parseAmount(12.34), { ok: true, value: 1234 });
    assert.equal(parseAmount(Infinity).ok, false);
});

test("formatMoney renders the configured currency and locale", () => {
    assert.equal(formatMoney(125_050), "$1,250.50");
    assert.equal(formatMoney(-4200, { currency: "USD" }), "-$42.00");
    assert.match(formatMoney(125_050, { currency: "EUR", locale: "de-DE" }), /1\.250,50/);
});

test("formatCompactMoney shortens axis labels", () => {
    assert.match(formatCompactMoney(1_250_000), /12(\.5)?K/);
});

test("formatPercent guards against non-finite ratios", () => {
    assert.equal(formatPercent(0.4213), "42.1%");
    assert.equal(formatPercent(Infinity), "—");
    assert.equal(formatPercent(null), "—");
});

test("formatDate is timezone-stable", () => {
    assert.equal(formatDate("2026-08-04"), "Aug 4, 2026");
    assert.equal(formatDate("2026-01-01"), "Jan 1, 2026");
    assert.equal(formatDate("nonsense"), "nonsense");
});

test("formatMonth supports long and short forms", () => {
    assert.equal(formatMonth("2026-08"), "Aug 2026");
    assert.equal(formatMonth("2026-08", { short: true }), "Aug");
    assert.equal(formatMonth(""), "");
});

test("truncate keeps short strings untouched", () => {
    assert.equal(truncate("Coffee", 10), "Coffee");
    assert.equal(truncate("A very long transaction description", 10), "A very lo…");
});
