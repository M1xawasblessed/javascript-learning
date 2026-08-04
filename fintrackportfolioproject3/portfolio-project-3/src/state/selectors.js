/**
 * Selectors — the read side of the store.
 *
 * Views never reach into `state.transactions` directly. They ask a selector, which
 * memoizes on identity: because the reducer returns new objects only for slices that
 * actually changed, an unrelated action (opening a modal, switching theme) does not
 * re-run the six-month aggregation behind the charts.
 */

import { monthlyTotals, summarize, usedCategories, latestDate } from "../domain/analytics.js";
import { monthKey, todayISO } from "../utils/date.js";

/** One-slot memoized selector, the same idea as `reselect` in a dozen lines. */
export function createSelector(inputs, compute) {
    let lastInputs = null;
    let lastResult;

    return function selector(state) {
        const values = inputs.map((input) => input(state));
        const hit =
            lastInputs !== null &&
            values.length === lastInputs.length &&
            values.every((value, index) => Object.is(value, lastInputs[index]));

        if (hit) return lastResult;

        lastInputs = values;
        lastResult = compute(...values);
        return lastResult;
    };
}

export const selectTransactions = (state) => state.transactions;
export const selectBudgets = (state) => state.budgets;
export const selectSettings = (state) => state.settings;
export const selectModal = (state) => state.ui.modal;
export const selectTheme = (state) => state.settings.theme;

/** Money-formatting options, in the shape every `format*` helper expects. */
export const selectMoneyOptions = createSelector([selectSettings], (settings) => ({
    currency: settings.currency,
    locale: settings.locale
}));

/**
 * The month the dashboard reports on.
 *
 * The real calendar month whenever it has any activity — that is the month the user is
 * living in. With nothing recorded yet this month (a fresh install looking at demo
 * data, or a quiet first of the month) it falls back to the newest month that does
 * have data, so the dashboard is never blank for no reason.
 */
export const selectCurrentMonth = createSelector([selectTransactions], (transactions) => {
    const thisMonth = monthKey(todayISO());
    if (transactions.some((transaction) => monthKey(transaction.date) === thisMonth)) return thisMonth;

    const latest = latestDate(transactions);
    return latest ? monthKey(latest) : thisMonth;
});

export const selectSummary = createSelector([selectTransactions], (transactions) => summarize(transactions));

export const selectMonthlyTotals = createSelector(
    [selectTransactions, selectCurrentMonth],
    (transactions, month) => monthlyTotals(transactions, { months: 6, endMonth: month })
);

export const selectUsedCategories = createSelector([selectTransactions], usedCategories);

/** Categories that still have no budget — offered first in the budget picker. */
export const selectUnbudgetedCategories = createSelector(
    [selectUsedCategories, selectBudgets, selectTransactions],
    (categories, budgets, transactions) => {
        const budgeted = new Set(budgets.map((budget) => budget.category));
        const expenseCategories = new Set(
            transactions.filter((transaction) => transaction.type === "expense").map((t) => t.category)
        );
        return categories.filter((category) => expenseCategories.has(category) && !budgeted.has(category));
    }
);
