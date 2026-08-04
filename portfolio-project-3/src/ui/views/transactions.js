/**
 * Transactions: filter toolbar, sortable table, pagination, CSV import/export.
 *
 * The query lives in the URL, not in component state. `#/transactions?search=rent&sort=amount`
 * is therefore a shareable, reloadable, back-button-able view of the data — and the
 * table itself stays a pure function of (transactions, query).
 */

import { debounce, h, mount } from "../../core/dom.js";
import { categorySlot } from "../../domain/categories.js";
import { csvToTransactions, downloadTextFile, transactionsToCSV } from "../../domain/csv.js";
import { isFiltered, pageWindow, queryTransactions, PAGE_SIZES } from "../../domain/query.js";
import { openModal } from "../../state/actions.js";
import { selectMoneyOptions, selectTransactions, selectUsedCategories } from "../../state/selectors.js";
import { formatDate, formatMoney, truncate } from "../../utils/format.js";
import { readTheme, seriesColor } from "../charts/base.js";
import { card, emptyState, field, select } from "../components.js";
import { icon } from "../icons.js";
import { toastError, toastInfo } from "../toast.js";

const COLUMNS = [
    { key: "date", label: "Date", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { key: "category", label: "Category", sortable: true },
    { key: "amount", label: "Amount", sortable: true, numeric: true },
    { key: "actions", label: "Actions", sortable: false, numeric: true }
];

export function createTransactionsView({ store, router }) {
    const toolbar = h("div", { class: "toolbar" });
    const tableWrap = h("div", { class: "table-wrap" });
    const pagination = h("div");
    const fileInput = h("input", {
        type: "file",
        accept: ".csv,text/csv",
        class: "file-input",
        onChange: (event) => handleFile(event.currentTarget)
    });

    const node = h(
        "div",
        { class: "view" },
        card({ className: "card--flush", children: [toolbar, tableWrap, pagination] }),
        fileInput
    );

    /** Filters are written to the URL; `replace` keeps the back button meaningful. */
    function setQuery(changes, { resetPage = true } = {}) {
        const current = router.current().query;
        router.setQuery({ ...current, ...(resetPage ? { page: 1 } : {}), ...changes }, { replace: true });
    }

    const searchDebounced = debounce((value) => setQuery({ search: value }), 250);

    async function handleFile(input) {
        const [file] = input.files ?? [];
        if (!file) return;

        try {
            const text = await file.text();
            const { items, errors } = csvToTransactions(text);

            if (items.length === 0 && errors.length > 0) {
                toastError("Nothing could be imported", errors[0].message);
            }
            store.dispatch(openModal("import", { items, errors }));
        } catch (error) {
            toastError("Could not read that file", error.message);
        } finally {
            // Allow re-selecting the same file straight after a failed import.
            input.value = "";
        }
    }

    function renderToolbar(state, query, categories) {
        const clearable = isFiltered(query);

        mount(
            toolbar,
            h(
                "div",
                { class: "field toolbar__search" },
                h("label", { class: "field__label", for: "txn-search" }, "Search"),
                h(
                    "div",
                    { style: { position: "relative" } },
                    h("input", {
                        id: "txn-search",
                        type: "search",
                        class: "input",
                        placeholder: "Description, category or note",
                        value: query.search,
                        autocomplete: "off",
                        onInput: (event) => searchDebounced(event.currentTarget.value)
                    })
                )
            ),
            field({
                id: "txn-type",
                label: "Type",
                control: select({
                    value: query.type,
                    options: [
                        { value: "all", label: "All" },
                        { value: "income", label: "Income" },
                        { value: "expense", label: "Expense" }
                    ],
                    onChange: (event) => setQuery({ type: event.currentTarget.value })
                })
            }),
            field({
                id: "txn-category",
                label: "Category",
                control: select({
                    value: query.category,
                    options: [
                        { value: "all", label: "All categories" },
                        ...categories.map((category) => ({ value: category, label: category }))
                    ],
                    onChange: (event) => setQuery({ category: event.currentTarget.value })
                })
            }),
            field({
                id: "txn-from",
                label: "From",
                control: h("input", {
                    type: "date",
                    value: query.from,
                    onChange: (event) => setQuery({ from: event.currentTarget.value })
                })
            }),
            field({
                id: "txn-to",
                label: "To",
                control: h("input", {
                    type: "date",
                    value: query.to,
                    onChange: (event) => setQuery({ to: event.currentTarget.value })
                })
            }),
            clearable
                ? h(
                      "button",
                      {
                          type: "button",
                          class: "btn btn--ghost",
                          onClick: () => setQuery({ search: "", type: "all", category: "all", from: "", to: "" })
                      },
                      icon("close", { size: 14 }),
                      "Clear filters"
                  )
                : null,
            h("div", { class: "toolbar__spacer" }),
            h(
                "div",
                { class: "btn-row" },
                h(
                    "button",
                    { type: "button", class: "btn", onClick: () => fileInput.click() },
                    icon("upload", { size: 14 }),
                    "Import CSV"
                ),
                h(
                    "button",
                    {
                        type: "button",
                        class: "btn",
                        onClick: () => exportCsv(state, query),
                        disabled: selectTransactions(state).length === 0
                    },
                    icon("download", { size: 14 }),
                    "Export CSV"
                )
            )
        );
    }

    function exportCsv(state, query) {
        const { filtered } = queryTransactions(selectTransactions(state), query);
        downloadTextFile(`fintrack-transactions-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCSV(filtered));
        toastInfo(`Exported ${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`, "Check your downloads folder.");
    }

    function sortHeader(column, query) {
        const active = query.sort === column.key;
        const nextDir = active && query.dir === "desc" ? "asc" : "desc";

        return h(
            "th",
            {
                scope: "col",
                class: column.numeric ? "numeric" : "",
                ...(active ? { "aria-sort": query.dir === "asc" ? "ascending" : "descending" } : {})
            },
            column.sortable
                ? h(
                      "button",
                      {
                          type: "button",
                          class: "table__sort",
                          onClick: () => setQuery({ sort: column.key, dir: nextDir }, { resetPage: false })
                      },
                      column.label,
                      h(
                          "span",
                          { class: "table__sort-arrow" },
                          icon(active && query.dir === "asc" ? "arrowUp" : "arrowDown", { size: 12 })
                      )
                  )
                : h("span", { class: "visually-hidden" }, column.label)
        );
    }

    function renderTable(state, result, theme) {
        const moneyOptions = selectMoneyOptions(state);
        const money = (minor) => formatMoney(minor, moneyOptions);
        const query = result.query;

        if (result.total === 0) {
            mount(
                tableWrap,
                isFiltered(query)
                    ? emptyState({
                          title: "No transactions match these filters",
                          description: "Try a different search term or widen the date range.",
                          iconName: "search",
                          action: h(
                              "button",
                              {
                                  type: "button",
                                  class: "btn",
                                  onClick: () => setQuery({ search: "", type: "all", category: "all", from: "", to: "" })
                              },
                              "Clear filters"
                          )
                      })
                    : emptyState({
                          title: "No transactions yet",
                          description: "Add one by hand, or import a CSV export from your bank.",
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
            );
            return;
        }

        mount(
            tableWrap,
            h(
                "table",
                { class: "table" },
                h("caption", { class: "visually-hidden" }, `Transactions, page ${result.page} of ${result.pageCount}`),
                h("thead", null, h("tr", null, ...COLUMNS.map((column) => sortHeader(column, query)))),
                h(
                    "tbody",
                    null,
                    ...result.items.map((transaction) =>
                        h(
                            "tr",
                            null,
                            h("td", { class: "tabular" }, formatDate(transaction.date, moneyOptions)),
                            h(
                                "td",
                                { class: "table__description" },
                                transaction.description,
                                transaction.notes ? h("span", { class: "table__note" }, truncate(transaction.notes, 60)) : null
                            ),
                            h(
                                "td",
                                null,
                                h(
                                    "span",
                                    { class: "badge" },
                                    h("span", {
                                        class: "badge__dot",
                                        style: { background: seriesColor(theme, categorySlot(transaction.category)) }
                                    }),
                                    transaction.category
                                )
                            ),
                            h(
                                "td",
                                {
                                    class: [
                                        "numeric",
                                        transaction.type === "income" ? "recent__amount--income" : ""
                                    ]
                                },
                                `${transaction.type === "income" ? "+" : "−"}${money(transaction.amountMinor)}`
                            ),
                            h(
                                "td",
                                { class: "numeric" },
                                h(
                                    "div",
                                    { class: "row-actions" },
                                    h(
                                        "button",
                                        {
                                            type: "button",
                                            class: "btn btn--ghost btn--icon",
                                            "aria-label": `Edit ${transaction.description}`,
                                            title: "Edit",
                                            onClick: () => store.dispatch(openModal("transaction", { id: transaction.id }))
                                        },
                                        icon("edit", { size: 15 })
                                    ),
                                    h(
                                        "button",
                                        {
                                            type: "button",
                                            class: "btn btn--ghost btn--icon",
                                            "aria-label": `Delete ${transaction.description}`,
                                            title: "Delete",
                                            onClick: () =>
                                                store.dispatch(
                                                    openModal("confirm", {
                                                        intent: "delete-transaction",
                                                        id: transaction.id,
                                                        title: "Delete this transaction?",
                                                        description: `"${transaction.description}" (${money(
                                                            transaction.amountMinor
                                                        )}) will be removed. This cannot be undone.`,
                                                        confirmLabel: "Delete"
                                                    })
                                                )
                                        },
                                        icon("trash", { size: 15 })
                                    )
                                )
                            )
                        )
                    )
                )
            )
        );
    }

    function renderPagination(result) {
        if (result.total === 0) {
            mount(pagination);
            return;
        }

        const { page, pageCount, from, to, total, query } = result;

        mount(
            pagination,
            h(
                "div",
                { class: "pagination" },
                h("p", { class: "pagination__info" }, `Showing ${from}–${to} of ${total}`),
                h(
                    "div",
                    { class: "pagination__pages" },
                    h(
                        "button",
                        {
                            type: "button",
                            class: "pagination__page",
                            "aria-label": "Previous page",
                            disabled: page <= 1,
                            onClick: () => setQuery({ page: page - 1 }, { resetPage: false })
                        },
                        icon("chevronLeft", { size: 14 })
                    ),
                    ...pageWindow(page, pageCount).map((value) =>
                        value === null
                            ? h("span", { class: "pagination__gap" }, "…")
                            : h(
                                  "button",
                                  {
                                      type: "button",
                                      class: "pagination__page",
                                      ...(value === page ? { "aria-current": "page" } : {}),
                                      onClick: () => setQuery({ page: value }, { resetPage: false })
                                  },
                                  String(value)
                              )
                    ),
                    h(
                        "button",
                        {
                            type: "button",
                            class: "pagination__page",
                            "aria-label": "Next page",
                            disabled: page >= pageCount,
                            onClick: () => setQuery({ page: page + 1 }, { resetPage: false })
                        },
                        icon("chevronRight", { size: 14 })
                    )
                ),
                h(
                    "label",
                    { class: "pagination__info" },
                    "Rows ",
                    select({
                        value: query.pageSize,
                        "aria-label": "Rows per page",
                        class: "input",
                        style: { width: "auto", display: "inline-block", padding: "4px 28px 4px 8px" },
                        options: PAGE_SIZES.map((size) => ({ value: size, label: String(size) })),
                        onChange: (event) => setQuery({ pageSize: event.currentTarget.value })
                    })
                )
            )
        );
    }

    function update(state, route) {
        const transactions = selectTransactions(state);
        const result = queryTransactions(transactions, route.query);
        const theme = readTheme(node);

        renderToolbar(state, result.query, selectUsedCategories(state));
        renderTable(state, result, theme);
        renderPagination(result);
    }

    return {
        node,
        title: "Transactions",
        subtitle: "Search, sort and edit every recorded movement",
        update,
        destroy() {
            searchDebounced.cancel();
        }
    };
}
