import test from "node:test";
import assert from "node:assert/strict";

import {
    balanceSeries,
    budgetProgress,
    changeRatio,
    collapseTail,
    compareToPreviousMonth,
    forMonth,
    groupByCategory,
    latestDate,
    monthlyTotals,
    summarize,
    unbudgetedSpend,
    usedCategories
} from "../src/domain/analytics.js";

const transactions = [
    { id: "1", date: "2026-06-01", type: "income", category: "Salary", amountMinor: 400_000 },
    { id: "2", date: "2026-06-03", type: "expense", category: "Rent", amountMinor: 145_000 },
    { id: "3", date: "2026-06-08", type: "expense", category: "Groceries", amountMinor: 12_000 },
    { id: "4", date: "2026-06-20", type: "expense", category: "Groceries", amountMinor: 8_000 },
    { id: "5", date: "2026-07-01", type: "income", category: "Salary", amountMinor: 410_000 },
    { id: "6", date: "2026-07-04", type: "expense", category: "Dining", amountMinor: 6_000 },
    { id: "7", date: "2026-07-19", type: "expense", category: "Transport", amountMinor: 4_000 }
];

test("summarize keeps the sign in `type`, not in the amount", () => {
    assert.deepEqual(summarize(transactions), {
        incomeMinor: 810_000,
        expenseMinor: 175_000,
        netMinor: 635_000,
        savingsRate: 635_000 / 810_000,
        count: 7
    });
});

test("summarize handles the empty and income-free cases without NaN", () => {
    assert.deepEqual(summarize([]), {
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        savingsRate: 0,
        count: 0
    });

    const expensesOnly = summarize([{ type: "expense", amountMinor: 500 }]);
    assert.equal(expensesOnly.savingsRate, 0, "no income means no meaningful rate, not Infinity");
    assert.equal(expensesOnly.netMinor, -500);
});

test("forMonth selects by month key", () => {
    assert.deepEqual(forMonth(transactions, "2026-07").map((t) => t.id), ["5", "6", "7"]);
    assert.deepEqual(forMonth(transactions, "2026-01"), []);
});

test("groupByCategory sorts by size and computes shares", () => {
    const groups = groupByCategory(forMonth(transactions, "2026-06"), "expense");

    assert.deepEqual(groups.map((group) => group.category), ["Rent", "Groceries"]);
    assert.equal(groups[1].amountMinor, 20_000, "same-category rows are merged");
    assert.equal(Math.round(groups[0].share * 1000) / 1000, 0.879);
    assert.equal(groups.reduce((sum, group) => sum + group.share, 0), 1);
});

test("groupByCategory can look at income or at everything", () => {
    assert.deepEqual(groupByCategory(transactions, "income").map((g) => g.category), ["Salary"]);
    assert.equal(groupByCategory(transactions, "all").length, 5);
    assert.deepEqual(groupByCategory([], "expense"), []);
});

test("collapseTail folds everything past the limit into one slice", () => {
    const groups = [
        { category: "A", amountMinor: 500, share: 0.5 },
        { category: "B", amountMinor: 200, share: 0.2 },
        { category: "C", amountMinor: 150, share: 0.15 },
        { category: "D", amountMinor: 100, share: 0.1 },
        { category: "E", amountMinor: 50, share: 0.05 }
    ];

    const collapsed = collapseTail(groups, 3);

    assert.equal(collapsed.length, 4);
    assert.equal(collapsed.at(-1).category, "Other");
    assert.equal(collapsed.at(-1).amountMinor, 150);
    assert.deepEqual(collapsed.at(-1).members, ["D", "E"]);
    assert.equal(Math.round(collapsed.reduce((sum, group) => sum + group.share, 0) * 100), 100);
});

test("collapseTail leaves short lists alone", () => {
    const groups = [{ category: "A", amountMinor: 1, share: 1 }];
    assert.deepEqual(collapseTail(groups, 5), [{ category: "A", amountMinor: 1, share: 1, isOther: false }]);
});

test("monthlyTotals fills empty months so the bar chart keeps its rhythm", () => {
    const series = monthlyTotals(transactions, { months: 4, endMonth: "2026-07" });

    assert.deepEqual(series.map((point) => point.month), ["2026-04", "2026-05", "2026-06", "2026-07"]);
    assert.deepEqual(series[0], { month: "2026-04", incomeMinor: 0, expenseMinor: 0, netMinor: 0 });
    assert.deepEqual(series[2], { month: "2026-06", incomeMinor: 400_000, expenseMinor: 165_000, netMinor: 235_000 });
    assert.equal(series[3].netMinor, 400_000);
});

test("monthlyTotals defaults to the newest month in the data", () => {
    const series = monthlyTotals(transactions, { months: 2 });
    assert.deepEqual(series.map((point) => point.month), ["2026-06", "2026-07"]);
    assert.deepEqual(monthlyTotals([], { months: 3 }), []);
});

test("balanceSeries accumulates one point per active day", () => {
    const series = balanceSeries(transactions, { openingMinor: 100_000 });

    assert.deepEqual(series.map((point) => point.date), [
        "2026-06-01",
        "2026-06-03",
        "2026-06-08",
        "2026-06-20",
        "2026-07-01",
        "2026-07-04",
        "2026-07-19"
    ]);
    assert.equal(series[0].balanceMinor, 500_000);
    assert.equal(series[1].balanceMinor, 355_000);
    assert.equal(series.at(-1).balanceMinor, 735_000, "opening balance plus net");
});

test("balanceSeries merges same-day activity", () => {
    const series = balanceSeries([
        { date: "2026-06-01", type: "income", amountMinor: 1000 },
        { date: "2026-06-01", type: "expense", amountMinor: 400 }
    ]);

    assert.equal(series.length, 1);
    assert.deepEqual(series[0], { date: "2026-06-01", deltaMinor: 600, balanceMinor: 600 });
});

test("budgetProgress flags each budget and sorts by pressure", () => {
    const budgets = [
        { id: "b1", category: "Groceries", limitMinor: 25_000 },
        { id: "b2", category: "Rent", limitMinor: 150_000 },
        { id: "b3", category: "Dining", limitMinor: 10_000 }
    ];

    const progress = budgetProgress(budgets, transactions, "2026-06");
    const byCategory = Object.fromEntries(progress.map((entry) => [entry.category, entry]));

    assert.equal(byCategory.Groceries.spentMinor, 20_000);
    assert.equal(byCategory.Groceries.ratio, 0.8);
    assert.equal(byCategory.Groceries.status, "warning", "80% is the warning threshold");
    assert.equal(byCategory.Rent.status, "warning", "96% of the limit is spent");
    assert.equal(byCategory.Rent.remainingMinor, 5_000);
    assert.equal(byCategory.Dining.spentMinor, 0, "a category with no spend this month reports zero");
    assert.equal(byCategory.Dining.status, "good");
    assert.deepEqual(progress.map((entry) => entry.category), ["Rent", "Groceries", "Dining"]);
});

test("budgetProgress marks an exceeded budget critical", () => {
    const progress = budgetProgress(
        [{ id: "b1", category: "Groceries", limitMinor: 15_000 }],
        transactions,
        "2026-06"
    );

    assert.equal(progress[0].status, "critical");
    assert.equal(progress[0].remainingMinor, -5_000);
});

test("budgetProgress ignores income and other months", () => {
    const progress = budgetProgress([{ id: "b1", category: "Salary", limitMinor: 10_000 }], transactions, "2026-06");
    assert.equal(progress[0].spentMinor, 0, "income never counts against a budget");
    assert.equal(progress[0].ratio, 0);
});

test("unbudgetedSpend finds the blind spot", () => {
    const budgets = [{ id: "b1", category: "Rent", limitMinor: 150_000 }];
    assert.equal(unbudgetedSpend(budgets, transactions, "2026-06"), 20_000);
    assert.equal(unbudgetedSpend([], transactions, "2026-01"), 0);
});

test("changeRatio reports null when there is no baseline", () => {
    assert.equal(changeRatio(150, 100), 0.5);
    assert.equal(changeRatio(50, 100), -0.5);
    assert.equal(changeRatio(0, 0), 0);
    assert.equal(changeRatio(100, 0), null, "growth from nothing is not a percentage");
});

test("compareToPreviousMonth lines up two months and their deltas", () => {
    const comparison = compareToPreviousMonth(transactions, "2026-07");

    assert.equal(comparison.current.incomeMinor, 410_000);
    assert.equal(comparison.previous.incomeMinor, 400_000);
    assert.equal(Math.round(comparison.deltas.income * 1000) / 1000, 0.025);
    assert.ok(comparison.deltas.expense < 0, "July spent less than June");
});

test("latestDate and usedCategories describe the dataset", () => {
    assert.equal(latestDate(transactions), "2026-07-19");
    assert.equal(latestDate([]), "");
    assert.deepEqual(usedCategories(transactions), ["Dining", "Groceries", "Rent", "Salary", "Transport"]);
});
