import test from "node:test";
import assert from "node:assert/strict";

import { createDemoData, createEmptyData, generateBudgets, generateTransactions } from "../src/state/seed.js";
import { validateTransaction } from "../src/domain/validate.js";
import { lastMonths } from "../src/utils/date.js";
import { monthlyTotals } from "../src/domain/analytics.js";

const today = "2026-08-04";

test("the same seed always produces the same dataset", () => {
    const first = generateTransactions({ seed: 42, today });
    const second = generateTransactions({ seed: 42, today });
    const different = generateTransactions({ seed: 43, today });

    assert.deepEqual(
        first.map(({ id, ...rest }) => rest),
        second.map(({ id, ...rest }) => rest)
    );
    assert.notDeepEqual(
        first.map(({ id, ...rest }) => rest),
        different.map(({ id, ...rest }) => rest)
    );
});

test("every generated transaction is valid and never dated in the future", () => {
    const transactions = generateTransactions({ today });

    assert.ok(transactions.length > 60, "six months of activity");
    for (const transaction of transactions) {
        assert.equal(validateTransaction(transaction).ok, true, `invalid: ${JSON.stringify(transaction)}`);
        assert.ok(transaction.date <= today, `${transaction.date} is in the future`);
        assert.ok(transaction.amountMinor > 0, "amounts are stored positive");
        assert.ok(Number.isInteger(transaction.amountMinor), "amounts are integer minor units");
    }
});

test("the dataset covers six complete months ending before the current one", () => {
    const transactions = generateTransactions({ today, months: 6 });
    const months = new Set(transactions.map((transaction) => transaction.date.slice(0, 7)));

    assert.deepEqual([...months].sort(), lastMonths(6, "2026-07"));
    assert.equal(months.has("2026-08"), false, "the partly-elapsed current month is left out");
    assert.deepEqual(
        transactions.map((transaction) => transaction.date),
        [...transactions.map((transaction) => transaction.date)].sort().reverse()
    );
});

test("the demo months look like a plausible budget", () => {
    const series = monthlyTotals(generateTransactions({ today }), { months: 6, endMonth: "2026-07" });

    for (const point of series) {
        assert.ok(point.incomeMinor > 0, `${point.month} has income`);
        assert.ok(point.expenseMinor > 0, `${point.month} has spending`);
        assert.ok(point.netMinor > 0, `${point.month} ends in the black`);
    }
});

test("seeded budgets cover real expense categories", () => {
    const budgets = generateBudgets();
    const categories = new Set(generateTransactions({ today }).map((transaction) => transaction.category));

    assert.ok(budgets.length >= 3);
    for (const budget of budgets) {
        assert.ok(categories.has(budget.category), `${budget.category} appears in the data`);
        assert.ok(budget.limitMinor > 0);
        assert.match(budget.id, /^budget_/);
    }
});

test("demo and empty datasets are shaped the same", () => {
    const demo = createDemoData({ today });
    const empty = createEmptyData();

    assert.deepEqual(Object.keys(demo).sort(), Object.keys(empty).sort());
    assert.deepEqual(empty.transactions, []);
    assert.deepEqual(empty.budgets, []);
    assert.equal(demo.settings.currency, "USD");
});
