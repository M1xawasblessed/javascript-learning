/**
 * Financial analytics — pure functions over a transaction list.
 *
 * Invariant this module relies on: `amountMinor` is always a **positive integer in
 * minor units** and the sign lives in `type` (`"income"` | `"expense"`). Keeping the
 * sign out of the amount means every total, chart and budget calculation below is
 * plain integer arithmetic with no rounding drift.
 *
 * Nothing here touches the DOM or the store, which is what makes it all unit-testable.
 */

import { addMonths, lastMonths, monthKey } from "../utils/date.js";

export const OTHER_LABEL = "Other";

/** Totals for a set of transactions. */
export function summarize(transactions = []) {
    let incomeMinor = 0;
    let expenseMinor = 0;

    for (const transaction of transactions) {
        if (transaction.type === "income") incomeMinor += transaction.amountMinor;
        else if (transaction.type === "expense") expenseMinor += transaction.amountMinor;
    }

    const netMinor = incomeMinor - expenseMinor;

    return {
        incomeMinor,
        expenseMinor,
        netMinor,
        // Share of income that was not spent. Undefined without income, so report 0.
        savingsRate: incomeMinor > 0 ? netMinor / incomeMinor : 0,
        count: transactions.length
    };
}

/** Transactions belonging to one `YYYY-MM` month. */
export function forMonth(transactions = [], month) {
    return transactions.filter((transaction) => monthKey(transaction.date) === month);
}

/**
 * Totals per category, largest first, each with its share of the group total.
 * `type` may be `"expense"`, `"income"` or `"all"`.
 */
export function groupByCategory(transactions = [], type = "expense") {
    const totals = new Map();

    for (const transaction of transactions) {
        if (type !== "all" && transaction.type !== type) continue;
        totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amountMinor);
    }

    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);

    return [...totals.entries()]
        .map(([category, amountMinor]) => ({
            category,
            amountMinor,
            share: total > 0 ? amountMinor / total : 0
        }))
        .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category));
}

/**
 * Keep the `limit` largest groups and fold the rest into a single "Other" slice.
 *
 * A donut with fourteen slices is unreadable, and the categorical palette is a fixed
 * eight-hue order that is never cycled — so the tail is collapsed rather than recoloured.
 */
export function collapseTail(groups, limit = 5, otherLabel = OTHER_LABEL) {
    if (groups.length <= limit) return groups.map((group) => ({ ...group, isOther: false }));

    const head = groups.slice(0, limit).map((group) => ({ ...group, isOther: false }));
    const tail = groups.slice(limit);

    return [
        ...head,
        {
            category: otherLabel,
            amountMinor: tail.reduce((sum, group) => sum + group.amountMinor, 0),
            share: tail.reduce((sum, group) => sum + group.share, 0),
            isOther: true,
            members: tail.map((group) => group.category)
        }
    ];
}

/**
 * Income/expense/net for each of the last `months` months, oldest first.
 * Months with no activity are present with zeroes so the bar chart keeps an even rhythm.
 */
export function monthlyTotals(transactions = [], { months = 6, endMonth } = {}) {
    const last = endMonth ?? monthKey(latestDate(transactions)) ?? "";
    if (!last) return [];

    const keys = lastMonths(months, last);
    const buckets = new Map(keys.map((key) => [key, { month: key, incomeMinor: 0, expenseMinor: 0, netMinor: 0 }]));

    for (const transaction of transactions) {
        const bucket = buckets.get(monthKey(transaction.date));
        if (!bucket) continue;

        if (transaction.type === "income") bucket.incomeMinor += transaction.amountMinor;
        else bucket.expenseMinor += transaction.amountMinor;
    }

    for (const bucket of buckets.values()) {
        bucket.netMinor = bucket.incomeMinor - bucket.expenseMinor;
    }

    return keys.map((key) => buckets.get(key));
}

/**
 * Running balance, one point per day that had activity, oldest first.
 * `openingMinor` seeds the balance carried in from before the first transaction.
 */
export function balanceSeries(transactions = [], { openingMinor = 0 } = {}) {
    const perDay = new Map();

    for (const transaction of transactions) {
        const delta = transaction.type === "income" ? transaction.amountMinor : -transaction.amountMinor;
        perDay.set(transaction.date, (perDay.get(transaction.date) ?? 0) + delta);
    }

    let balanceMinor = openingMinor;

    return [...perDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([date, delta]) => {
            balanceMinor += delta;
            return { date, deltaMinor: delta, balanceMinor };
        });
}

/**
 * Budget usage for one month.
 * `status` is a four-state signal ("good" | "warning" | "critical"), always paired
 * with a visible label in the UI so it is never carried by colour alone.
 */
export function budgetProgress(budgets = [], transactions = [], month) {
    const spentByCategory = new Map();

    for (const transaction of forMonth(transactions, month)) {
        if (transaction.type !== "expense") continue;
        spentByCategory.set(
            transaction.category,
            (spentByCategory.get(transaction.category) ?? 0) + transaction.amountMinor
        );
    }

    return budgets
        .map((budget) => {
            const spentMinor = spentByCategory.get(budget.category) ?? 0;
            const ratio = budget.limitMinor > 0 ? spentMinor / budget.limitMinor : 0;

            return {
                ...budget,
                month,
                spentMinor,
                remainingMinor: budget.limitMinor - spentMinor,
                ratio,
                status: ratio >= 1 ? "critical" : ratio >= 0.8 ? "warning" : "good"
            };
        })
        .sort((a, b) => b.ratio - a.ratio || a.category.localeCompare(b.category));
}

/** Spending that happened in categories with no budget set — the blind spot. */
export function unbudgetedSpend(budgets = [], transactions = [], month) {
    const budgeted = new Set(budgets.map((budget) => budget.category));
    return forMonth(transactions, month)
        .filter((transaction) => transaction.type === "expense" && !budgeted.has(transaction.category))
        .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
}

/**
 * Relative change between two totals.
 * Returns `null` when there is no baseline to compare against, so the UI can say
 * "no prior data" instead of rendering a meaningless ∞%.
 */
export function changeRatio(current, previous) {
    if (previous === 0) return current === 0 ? 0 : null;
    return (current - previous) / previous;
}

/** This month's totals next to last month's, with the deltas already computed. */
export function compareToPreviousMonth(transactions = [], month) {
    const current = summarize(forMonth(transactions, month));
    const previous = summarize(forMonth(transactions, addMonths(month, -1)));

    return {
        month,
        current,
        previous,
        deltas: {
            income: changeRatio(current.incomeMinor, previous.incomeMinor),
            expense: changeRatio(current.expenseMinor, previous.expenseMinor),
            net: changeRatio(current.netMinor, previous.netMinor)
        }
    };
}

/** The most recent transaction date, or `""` for an empty list. */
export function latestDate(transactions = []) {
    return transactions.reduce((latest, transaction) => (transaction.date > latest ? transaction.date : latest), "");
}

/** Every category that appears in the data, sorted, for filter dropdowns. */
export function usedCategories(transactions = []) {
    return [...new Set(transactions.map((transaction) => transaction.category))].sort((a, b) =>
        a.localeCompare(b)
    );
}
