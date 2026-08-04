/**
 * Dashboard: four stat tiles, three charts and a recent-activity list.
 *
 * The view object is created once per navigation and then *updated* — the chart
 * instances survive, so a state change repaints the canvas instead of tearing down
 * and rebuilding three canvases, their observers and their listeners.
 */

import { h, mount } from "../../core/dom.js";
import {
    balanceSeries,
    budgetProgress,
    collapseTail,
    compareToPreviousMonth,
    forMonth,
    groupByCategory,
    monthlyTotals
} from "../../domain/analytics.js";
import { categorySlot } from "../../domain/categories.js";
import { openModal } from "../../state/actions.js";
import { selectBudgets, selectCurrentMonth, selectMoneyOptions, selectTransactions } from "../../state/selectors.js";
import { formatCompactMoney, formatDate, formatMoney, formatMonth, formatPercent, truncate } from "../../utils/format.js";
import { readTheme, seriesColor } from "../charts/base.js";
import { createBarChart } from "../charts/bars.js";
import { createDonutChart } from "../charts/donut.js";
import { createLineChart } from "../charts/line.js";
import {
    card,
    chartFigure,
    chartLegend,
    chartMount,
    dataTable,
    emptyState,
    statTile,
    statusPill
} from "../components.js";
import { icon } from "../icons.js";

const INCOME_SLOT = 1;
const EXPENSE_SLOT = 2;
const DONUT_LIMIT = 5;

export function createDashboardView({ store }) {
    const statsRow = h("div", { class: "stat-grid" });
    const barsMount = chartMount();
    const donutMount = chartMount();
    const lineMount = chartMount();
    const chartsRow = h("div", { class: "chart-grid" });
    const trendSlot = h("div");
    const bottomRow = h("div", { class: "chart-grid" });

    const bars = createBarChart(barsMount);
    const donut = createDonutChart(donutMount);
    const line = createLineChart(lineMount);

    const node = h("div", { class: "view" }, statsRow, chartsRow, trendSlot, bottomRow);

    function update(state) {
        const transactions = selectTransactions(state);
        const budgets = selectBudgets(state);
        const month = selectCurrentMonth(state);
        const moneyOptions = selectMoneyOptions(state);
        const money = (minor, options = {}) => formatMoney(minor, { ...moneyOptions, ...options });
        const theme = readTheme(node);

        const { current, previous, deltas } = compareToPreviousMonth(transactions, month);
        const monthLabel = formatMonth(month, { locale: moneyOptions.locale });

        // ---- Stat tiles -------------------------------------------------------
        mount(
            statsRow,
            statTile({
                label: `Income · ${monthLabel}`,
                value: money(current.incomeMinor),
                delta: deltas.income,
                hint: previous.incomeMinor === 0 ? "no prior month to compare" : ""
            }),
            statTile({
                label: `Spending · ${monthLabel}`,
                value: money(current.expenseMinor),
                delta: deltas.expense,
                invertDelta: true,
                hint: previous.expenseMinor === 0 ? "no prior month to compare" : ""
            }),
            statTile({
                label: `Net · ${monthLabel}`,
                value: money(current.netMinor, { signDisplay: "exceptZero" }),
                delta: deltas.net,
                hint: previous.netMinor === 0 ? "no prior month to compare" : ""
            }),
            statTile({
                label: "Savings rate",
                value: formatPercent(current.savingsRate, { locale: moneyOptions.locale }),
                delta: null,
                hint: current.incomeMinor === 0 ? "no income recorded" : "of this month's income kept"
            })
        );

        // ---- Cash-flow columns ------------------------------------------------
        const series = [
            { key: "incomeMinor", label: "Income", slot: INCOME_SLOT },
            { key: "expenseMinor", label: "Spending", slot: EXPENSE_SLOT }
        ];
        const monthly = monthlyTotals(transactions, { months: 6, endMonth: month });
        const monthlyPoints = monthly.map((point) => ({
            ...point,
            key: point.month,
            label: formatMonth(point.month, { locale: moneyOptions.locale, short: true }),
            tooltipTitle: formatMonth(point.month, { locale: moneyOptions.locale })
        }));

        bars.update(
            {
                points: monthlyPoints,
                series,
                formatTick: (value) => formatCompactMoney(value, moneyOptions),
                formatValue: (value) => money(value)
            },
            `Grouped column chart of income and spending for the last ${monthly.length} months. ` +
                monthlyPoints
                    .map((point) => `${point.tooltipTitle}: income ${money(point.incomeMinor)}, spending ${money(point.expenseMinor)}`)
                    .join("; ")
        );

        const barsFigure = chartFigure({
            title: "Cash flow",
            subtitle: "Income beside spending, last 6 months",
            mount: barsMount,
            legend: chartLegend(
                series.map((entry) => ({ label: entry.label, color: seriesColor(theme, entry.slot) }))
            ),
            table: dataTable(
                ["Month", "Income", "Spending", "Net"],
                monthlyPoints.map((point) => [
                    point.tooltipTitle,
                    money(point.incomeMinor),
                    money(point.expenseMinor),
                    money(point.netMinor, { signDisplay: "exceptZero" })
                ])
            )
        });

        // ---- Category donut ---------------------------------------------------
        const monthTransactions = forMonth(transactions, month);
        const groups = collapseTail(groupByCategory(monthTransactions, "expense"), DONUT_LIMIT);
        const slices = groups.map((group) => ({
            label: group.category,
            amountMinor: group.amountMinor,
            share: group.share,
            slot: group.isOther ? 0 : categorySlot(group.category)
        }));

        donut.update(
            {
                slices,
                centerValue: formatCompactMoney(current.expenseMinor, moneyOptions),
                centerLabel: "spent",
                formatValue: (value) => money(value)
            },
            slices.length === 0
                ? `No spending recorded for ${monthLabel}.`
                : `Donut chart of spending by category for ${monthLabel}. ` +
                      slices
                          .map((slice) => `${slice.label}: ${money(slice.amountMinor)}, ${formatPercent(slice.share)}`)
                          .join("; ")
        );

        const donutFigure = chartFigure({
            title: "Where the money went",
            subtitle: monthLabel,
            className: "donut",
            mount: donutMount,
            legend: chartLegend(
                slices.map((slice) => ({
                    label: truncate(slice.label, 18),
                    color: seriesColor(theme, slice.slot),
                    value: money(slice.amountMinor),
                    share: formatPercent(slice.share, { digits: 0 })
                })),
                { stack: true }
            ),
            table: dataTable(
                ["Category", "Spent", "Share"],
                slices.map((slice) => [slice.label, money(slice.amountMinor), formatPercent(slice.share)])
            )
        });

        mount(
            chartsRow,
            card({ children: barsFigure }),
            card({ children: donutFigure })
        );

        // ---- Balance trend ----------------------------------------------------
        const balance = balanceSeries(transactions);
        const points = balance.map((entry) => ({
            key: entry.date,
            label: formatDate(entry.date, { locale: moneyOptions.locale, style: "medium" }),
            value: entry.balanceMinor,
            delta: entry.deltaMinor
        }));

        line.update(
            {
                points,
                valueLabel: "Balance",
                endLabel: points.length > 0 ? money(points.at(-1).value) : "",
                formatTick: (value) => formatCompactMoney(value, moneyOptions),
                formatValue: (value, options = {}) =>
                    money(value, options.signed ? { signDisplay: "exceptZero" } : {})
            },
            points.length === 0
                ? "No balance history yet."
                : `Line chart of the running balance across ${points.length} active days, ending at ${money(points.at(-1).value)}.`
        );

        mount(
            trendSlot,
            card({
                children: chartFigure({
                    title: "Running balance",
                    subtitle: "Cumulative net position across every day with activity",
                    mount: lineMount,
                    table: dataTable(
                        ["Date", "Change", "Balance"],
                        points
                            .slice(-12)
                            .map((point) => [
                                point.label,
                                money(point.delta, { signDisplay: "exceptZero" }),
                                money(point.value)
                            ])
                    )
                })
            })
        );

        // ---- Recent activity + budget pressure --------------------------------
        const recent = [...transactions]
            .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
            .slice(0, 6);

        const recentCard = card({
            title: "Recent activity",
            actions: h(
                "a",
                { class: "btn btn--ghost btn--sm", href: "#/transactions" },
                "View all",
                icon("chevronRight", { size: 14 })
            ),
            children:
                recent.length === 0
                    ? emptyState({
                          title: "Nothing recorded yet",
                          description: "Add your first transaction to see it here.",
                          action: h(
                              "button",
                              {
                                  type: "button",
                                  class: "btn btn--primary",
                                  onClick: () => store.dispatch(openModal("transaction"))
                              },
                              icon("plus"),
                              "Add transaction"
                          )
                      })
                    : h(
                          "ul",
                          { class: "recent list-reset" },
                          ...recent.map((transaction) =>
                              h(
                                  "li",
                                  { class: "recent__item" },
                                  h("span", {
                                      class: "badge__dot",
                                      style: { background: seriesColor(theme, categorySlot(transaction.category)) }
                                  }),
                                  h(
                                      "div",
                                      { class: "recent__body" },
                                      h("p", { class: "recent__title" }, transaction.description),
                                      h(
                                          "p",
                                          { class: "recent__meta" },
                                          `${transaction.category} · ${formatDate(transaction.date, moneyOptions)}`
                                      )
                                  ),
                                  h(
                                      "span",
                                      {
                                          class: [
                                              "recent__amount",
                                              transaction.type === "income" ? "recent__amount--income" : ""
                                          ]
                                      },
                                      `${transaction.type === "income" ? "+" : "−"}${money(transaction.amountMinor)}`
                                  )
                              )
                          )
                      )
        });

        const pressure = budgetProgress(budgets, transactions, month).slice(0, 4);
        const budgetCard = card({
            title: "Budget pressure",
            subtitle: monthLabel,
            actions: h("a", { class: "btn btn--ghost btn--sm", href: "#/budgets" }, "Manage", icon("chevronRight", { size: 14 })),
            children:
                pressure.length === 0
                    ? emptyState({
                          title: "No budgets set",
                          description: "Set a monthly limit to track how much of it you have used.",
                          iconName: "target",
                          action: h("a", { class: "btn", href: "#/budgets" }, "Go to budgets")
                      })
                    : h(
                          "div",
                          { class: "budget" },
                          ...pressure.map((entry) =>
                              h(
                                  "div",
                                  null,
                                  h(
                                      "div",
                                      { class: "budget__numbers" },
                                      h("span", null, entry.category),
                                      statusPill(entry.status, `${Math.round(entry.ratio * 100)}% of ${money(entry.limitMinor)}`)
                                  ),
                                  h(
                                      "div",
                                      { class: "progress", style: { marginTop: "6px" } },
                                      h("div", {
                                          class: [
                                              "progress__bar",
                                              entry.status !== "good" ? `progress__bar--${entry.status}` : ""
                                          ],
                                          style: { width: `${Math.min(entry.ratio, 1) * 100}%` }
                                      })
                                  )
                              )
                          )
                      )
        });

        mount(bottomRow, recentCard, budgetCard);
    }

    return {
        node,
        title: "Overview",
        subtitle: "Your income, spending and balance at a glance",
        update,
        destroy() {
            bars.destroy();
            donut.destroy();
            line.destroy();
        }
    };
}
