/**
 * Budgets: a month at a time, one card per category.
 *
 * The selected month lives in the URL (`#/budgets?month=2026-07`) so a particular
 * month can be linked to, and so the browser's back button steps through the months
 * you looked at.
 */

import { h, mount } from "../../core/dom.js";
import { budgetProgress, forMonth, summarize, unbudgetedSpend } from "../../domain/analytics.js";
import { categorySlot } from "../../domain/categories.js";
import { openModal } from "../../state/actions.js";
import {
    selectBudgets,
    selectCurrentMonth,
    selectMoneyOptions,
    selectTransactions,
    selectUnbudgetedCategories
} from "../../state/selectors.js";
import { addMonths, isValidMonthKey, monthKey, todayISO } from "../../utils/date.js";
import { formatMoney, formatMonth, formatPercent } from "../../utils/format.js";
import { readTheme, seriesColor } from "../charts/base.js";
import { emptyState, progressBar, statusPill } from "../components.js";
import { icon } from "../icons.js";

const STATUS_LABEL = {
    good: "On track",
    warning: "Close to the limit",
    critical: "Over budget"
};

export function createBudgetsView({ store, router }) {
    const header = h("div", { class: "card" });
    const grid = h("div", { class: "budget-grid" });
    const node = h("div", { class: "view" }, header, grid);

    function goToMonth(month) {
        router.setQuery({ ...router.current().query, month }, { replace: false });
    }

    function update(state, route) {
        const transactions = selectTransactions(state);
        const budgets = selectBudgets(state);
        const moneyOptions = selectMoneyOptions(state);
        const money = (minor, options = {}) => formatMoney(minor, { ...moneyOptions, ...options });
        const theme = readTheme(node);

        const month = isValidMonthKey(route.query.month) ? route.query.month : selectCurrentMonth(state);
        const progress = budgetProgress(budgets, transactions, month);
        const available = selectUnbudgetedCategories(state);

        const totalLimit = progress.reduce((sum, entry) => sum + entry.limitMinor, 0);
        const totalSpent = progress.reduce((sum, entry) => sum + entry.spentMinor, 0);
        const overallRatio = totalLimit > 0 ? totalSpent / totalLimit : 0;
        const overallStatus = overallRatio >= 1 ? "critical" : overallRatio >= 0.8 ? "warning" : "good";
        const monthSummary = summarize(forMonth(transactions, month));
        const unbudgeted = unbudgetedSpend(budgets, transactions, month);
        const isCurrentMonth = month >= monthKey(todayISO());

        // ---- Month header ------------------------------------------------------
        mount(
            header,
            h(
                "div",
                { class: "card__header", style: { marginBottom: "0" } },
                h(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: "12px" } },
                    h(
                        "button",
                        {
                            type: "button",
                            class: "btn btn--ghost btn--icon",
                            "aria-label": "Previous month",
                            onClick: () => goToMonth(addMonths(month, -1))
                        },
                        icon("chevronLeft")
                    ),
                    h(
                        "div",
                        null,
                        h("h2", { class: "card__title" }, formatMonth(month, moneyOptions)),
                        h(
                            "p",
                            { class: "card__subtitle" },
                            `${money(monthSummary.expenseMinor)} spent · ${money(totalLimit)} budgeted`
                        )
                    ),
                    h(
                        "button",
                        {
                            type: "button",
                            class: "btn btn--ghost btn--icon",
                            "aria-label": "Next month",
                            disabled: isCurrentMonth,
                            onClick: () => goToMonth(addMonths(month, 1))
                        },
                        icon("chevronRight")
                    )
                ),
                h(
                    "button",
                    {
                        type: "button",
                        class: "btn btn--primary",
                        disabled: available.length === 0,
                        title: available.length === 0 ? "Every category with spending already has a budget" : "",
                        onClick: () => store.dispatch(openModal("budget", { categories: available }))
                    },
                    icon("plus"),
                    "New budget"
                )
            ),
            totalLimit > 0
                ? h(
                      "div",
                      { style: { marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" } },
                      progressBar(overallRatio, overallStatus),
                      h(
                          "div",
                          { class: "budget__numbers" },
                          statusPill(
                              overallStatus,
                              `${formatPercent(overallRatio, { digits: 0 })} of all budgets used`
                          ),
                          h("span", null, `${money(Math.max(totalLimit - totalSpent, 0))} left`)
                      )
                  )
                : null,
            unbudgeted > 0
                ? h(
                      "p",
                      { class: "card__subtitle", style: { marginTop: "12px" } },
                      `${money(unbudgeted)} was spent this month in categories with no budget.`
                  )
                : null
        );

        // ---- Budget cards ------------------------------------------------------
        if (progress.length === 0) {
            mount(
                grid,
                h(
                    "div",
                    { class: "card", style: { gridColumn: "1 / -1" } },
                    emptyState({
                        title: "No budgets yet",
                        description:
                            "Pick a category you spend in and set a monthly ceiling. FinTrack warns you at 80% and flags anything over.",
                        iconName: "target",
                        action: h(
                            "button",
                            {
                                type: "button",
                                class: "btn btn--primary",
                                disabled: available.length === 0,
                                onClick: () => store.dispatch(openModal("budget", { categories: available }))
                            },
                            icon("plus"),
                            "Create a budget"
                        )
                    })
                )
            );
            return;
        }

        mount(
            grid,
            ...progress.map((entry) =>
                h(
                    "article",
                    { class: "card budget" },
                    h(
                        "div",
                        { class: "budget__head" },
                        h(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: "8px" } },
                            h("span", {
                                class: "badge__dot",
                                style: { background: seriesColor(theme, categorySlot(entry.category)) }
                            }),
                            h("span", { class: "budget__category" }, entry.category)
                        ),
                        h(
                            "div",
                            { class: "row-actions" },
                            h(
                                "button",
                                {
                                    type: "button",
                                    class: "btn btn--ghost btn--icon",
                                    "aria-label": `Edit the ${entry.category} budget`,
                                    onClick: () => store.dispatch(openModal("budget", { id: entry.id }))
                                },
                                icon("edit", { size: 15 })
                            ),
                            h(
                                "button",
                                {
                                    type: "button",
                                    class: "btn btn--ghost btn--icon",
                                    "aria-label": `Remove the ${entry.category} budget`,
                                    onClick: () =>
                                        store.dispatch(
                                            openModal("confirm", {
                                                intent: "delete-budget",
                                                id: entry.id,
                                                title: `Remove the ${entry.category} budget?`,
                                                description:
                                                    "The transactions stay; only the monthly limit is removed.",
                                                confirmLabel: "Remove budget"
                                            })
                                        )
                                },
                                icon("trash", { size: 15 })
                            )
                        )
                    ),
                    progressBar(entry.ratio, entry.status),
                    h(
                        "div",
                        { class: "budget__numbers" },
                        h("span", null, `${money(entry.spentMinor)} of ${money(entry.limitMinor)}`),
                        h(
                            "span",
                            null,
                            entry.remainingMinor >= 0
                                ? `${money(entry.remainingMinor)} left`
                                : `${money(Math.abs(entry.remainingMinor))} over`
                        )
                    ),
                    statusPill(entry.status, `${STATUS_LABEL[entry.status]} · ${formatPercent(entry.ratio, { digits: 0 })}`)
                )
            )
        );
    }

    return {
        node,
        title: "Budgets",
        subtitle: "Monthly ceilings per category, with early warnings",
        update,
        destroy() {}
    };
}
