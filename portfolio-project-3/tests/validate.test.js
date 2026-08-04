import test from "node:test";
import assert from "node:assert/strict";

import { firstError, LIMITS, validateBudget, validateTransaction } from "../src/domain/validate.js";

const valid = {
    description: "  Green Market  ",
    category: " Groceries ",
    type: "Expense",
    date: "2026-08-04",
    amount: "42,50",
    notes: " weekly shop "
};

test("a valid transaction is normalized on the way through", () => {
    const result = validateTransaction(valid);

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, {});
    assert.deepEqual(result.value, {
        description: "Green Market",
        category: "Groceries",
        type: "expense",
        date: "2026-08-04",
        amountMinor: 4250,
        notes: "weekly shop"
    });
});

test("the stored amount is always positive — the sign lives in `type`", () => {
    const result = validateTransaction({ ...valid, amount: "-42.50" });
    assert.equal(result.value.amountMinor, 4250);
});

test("an already-parsed amountMinor is accepted as-is", () => {
    const result = validateTransaction({ ...valid, amount: undefined, amountMinor: 999 });
    assert.equal(result.value.amountMinor, 999);
});

test("every missing field is reported at once", () => {
    const result = validateTransaction({});

    assert.equal(result.ok, false);
    assert.equal(result.value, null);
    assert.deepEqual(Object.keys(result.errors).sort(), ["amount", "category", "date", "description", "type"]);
});

test("individual field rules", () => {
    assert.match(validateTransaction({ ...valid, date: "2026-02-30" }).errors.date, /real date/);
    assert.match(validateTransaction({ ...valid, date: "04/08/2026" }).errors.date, /YYYY-MM-DD/);
    assert.match(validateTransaction({ ...valid, type: "transfer" }).errors.type, /income or expense/);
    assert.match(validateTransaction({ ...valid, amount: "0" }).errors.amount, /greater than zero/);
    assert.match(validateTransaction({ ...valid, amount: "abc" }).errors.amount, /such as/);
    assert.match(validateTransaction({ ...valid, amount: "9999999999999" }).errors.amount, /out of range/);
    assert.match(
        validateTransaction({ ...valid, description: "x".repeat(LIMITS.description + 1) }).errors.description,
        /under 80 characters/
    );
    assert.match(validateTransaction({ ...valid, notes: "x".repeat(LIMITS.notes + 1) }).errors.notes, /under 200/);
    assert.match(validateTransaction({ ...valid, category: "x".repeat(LIMITS.category + 1) }).errors.category, /under 40/);
});

test("whitespace-only text does not count as filled in", () => {
    const result = validateTransaction({ ...valid, description: "   " });
    assert.match(result.errors.description, /required/);
});

test("budgets need a category and a positive limit", () => {
    assert.deepEqual(validateBudget({ category: "Dining", limit: "220" }).value, {
        category: "Dining",
        limitMinor: 22_000
    });

    assert.match(validateBudget({ limit: "10" }).errors.category, /Pick a category/);
    assert.match(validateBudget({ category: "Dining", limit: "-5" }).errors.limit, /greater than zero/);
    assert.match(validateBudget({ category: "Dining", limit: "" }).errors.limit, /monthly limit/);
    assert.equal(validateBudget({ category: "Dining", limitMinor: 5_000 }).value.limitMinor, 5_000);
});

test("firstError picks a message for the toast", () => {
    assert.equal(firstError({ errors: {} }), "");
    assert.equal(firstError({ errors: { date: "Date is required." } }), "Date is required.");
    assert.equal(firstError({}), "");
});
