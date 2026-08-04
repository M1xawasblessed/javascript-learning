/**
 * The application's dialogs.
 *
 * Each one builds a `dialog()` shell and owns its *local* form state — draft values and
 * validation errors never touch the store, because nothing outside the dialog needs
 * them. Only a successful submit dispatches.
 */

import { h, mount } from "../core/dom.js";
import { categoriesForType } from "../domain/categories.js";
import { validateBudget, validateTransaction } from "../domain/validate.js";
import { fromMinor } from "../utils/format.js";
import { todayISO } from "../utils/date.js";
import { field, select } from "./components.js";
import { dialog, dialogActions } from "./modal.js";

let formSequence = 0;

/** Add or edit a transaction. */
export function transactionDialog({ transaction = null, usedCategories = [], onSubmit, onDismiss }) {
    formSequence += 1;
    const formId = `transaction-form-${formSequence}`;
    const isEdit = Boolean(transaction);

    let values = {
        description: transaction?.description ?? "",
        amount: transaction ? fromMinor(transaction.amountMinor).toFixed(2) : "",
        type: transaction?.type ?? "expense",
        category: transaction?.category ?? "",
        date: transaction?.date ?? todayISO(),
        notes: transaction?.notes ?? ""
    };
    let errors = {};

    const body = h("div");

    function read(form) {
        const data = new FormData(form);
        return {
            description: String(data.get("description") ?? ""),
            amount: String(data.get("amount") ?? ""),
            type: String(data.get("type") ?? "expense"),
            category: String(data.get("category") ?? ""),
            date: String(data.get("date") ?? ""),
            notes: String(data.get("notes") ?? "")
        };
    }

    function renderBody() {
        const categories = categoriesForType(values.type, usedCategories);
        const category = categories.includes(values.category) ? values.category : categories[0];

        const form = h(
            "form",
            {
                id: formId,
                novalidate: true,
                onSubmit: (event) => {
                    event.preventDefault();
                    values = read(event.currentTarget);

                    const result = validateTransaction(values);
                    if (!result.ok) {
                        errors = result.errors;
                        renderBody();
                        // Move focus to the first field that needs fixing.
                        body.querySelector('[aria-invalid="true"]')?.focus();
                        return;
                    }
                    onSubmit(result.value);
                }
            },
            h(
                "div",
                { class: "modal__body" },
                field({
                    id: `${formId}-description`,
                    label: "Description",
                    error: errors.description,
                    control: h("input", {
                        type: "text",
                        name: "description",
                        value: values.description,
                        placeholder: "Green Market",
                        maxlength: 80,
                        autocomplete: "off"
                    })
                }),
                h(
                    "div",
                    { class: "field-row" },
                    field({
                        id: `${formId}-type`,
                        label: "Type",
                        error: errors.type,
                        control: select({
                            name: "type",
                            value: values.type,
                            options: [
                                { value: "expense", label: "Expense" },
                                { value: "income", label: "Income" }
                            ],
                            onChange: (event) => {
                                // Switching type swaps the category list, so re-render.
                                values = { ...read(event.currentTarget.form), category: "" };
                                renderBody();
                                body.querySelector(`#${formId}-type`)?.focus();
                            }
                        })
                    }),
                    field({
                        id: `${formId}-amount`,
                        label: "Amount",
                        error: errors.amount,
                        hint: "Accepts 42.50 or 1,234.56",
                        control: h("input", {
                            type: "text",
                            name: "amount",
                            value: values.amount,
                            inputmode: "decimal",
                            placeholder: "42.50",
                            autocomplete: "off"
                        })
                    })
                ),
                h(
                    "div",
                    { class: "field-row" },
                    field({
                        id: `${formId}-category`,
                        label: "Category",
                        error: errors.category,
                        control: select({
                            name: "category",
                            value: category,
                            options: categories.map((name) => ({ value: name, label: name }))
                        })
                    }),
                    field({
                        id: `${formId}-date`,
                        label: "Date",
                        error: errors.date,
                        control: h("input", { type: "date", name: "date", value: values.date, max: todayISO() })
                    })
                ),
                field({
                    id: `${formId}-notes`,
                    label: "Notes (optional)",
                    error: errors.notes,
                    control: h("textarea", { name: "notes", rows: 2, maxlength: 200, value: values.notes })
                })
            )
        );

        mount(body, form);
        return form;
    }

    renderBody();

    return dialog({
        title: isEdit ? "Edit transaction" : "New transaction",
        description: isEdit ? "Update the details and save." : "Record money coming in or going out.",
        body,
        footer: dialogActions({ confirmLabel: isEdit ? "Save changes" : "Add transaction", onCancel: onDismiss, formId }),
        onDismiss
    });
}

/** Set or change the monthly limit for one category. */
export function budgetDialog({ budget = null, categories = [], onSubmit, onDismiss }) {
    formSequence += 1;
    const formId = `budget-form-${formSequence}`;
    const options = budget ? [budget.category] : categories;

    let errors = {};
    const body = h("div");

    function renderBody() {
        const form = h(
            "form",
            {
                id: formId,
                novalidate: true,
                onSubmit: (event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const result = validateBudget({
                        category: String(data.get("category") ?? ""),
                        limit: String(data.get("limit") ?? "")
                    });

                    if (!result.ok) {
                        errors = result.errors;
                        renderBody();
                        return;
                    }
                    onSubmit(result.value);
                }
            },
            h(
                "div",
                { class: "modal__body" },
                field({
                    id: `${formId}-category`,
                    label: "Category",
                    error: errors.category,
                    control: budget
                        ? h("input", { type: "text", name: "category", value: budget.category, readonly: true })
                        : select({
                              name: "category",
                              value: options[0] ?? "",
                              options: options.map((name) => ({ value: name, label: name }))
                          })
                }),
                field({
                    id: `${formId}-limit`,
                    label: "Monthly limit",
                    error: errors.limit,
                    hint: "Spending above 80% of the limit is flagged.",
                    control: h("input", {
                        type: "text",
                        name: "limit",
                        inputmode: "decimal",
                        placeholder: "400.00",
                        value: budget ? fromMinor(budget.limitMinor).toFixed(2) : "",
                        autocomplete: "off"
                    })
                })
            )
        );

        mount(body, form);
    }

    renderBody();

    return dialog({
        title: budget ? `Budget for ${budget.category}` : "New budget",
        description: "Budgets are monthly and apply to expenses in that category.",
        body,
        footer: dialogActions({ confirmLabel: "Save budget", onCancel: onDismiss, formId }),
        onDismiss
    });
}

/** Review a parsed CSV before it touches the data. */
export function importDialog({ items = [], errors = [], onConfirm, onDismiss }) {
    const preview = errors.slice(0, 5);

    const body = h(
        "div",
        { class: "modal__body" },
        h(
            "p",
            null,
            h("strong", null, `${items.length} transaction${items.length === 1 ? "" : "s"}`),
            " ready to import",
            errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} skipped.` : "."
        ),
        errors.length > 0
            ? h(
                  "div",
                  { class: "chart__data" },
                  h(
                      "table",
                      null,
                      h("thead", null, h("tr", null, h("th", { scope: "col" }, "Line"), h("th", { scope: "col" }, "Problem"))),
                      h(
                          "tbody",
                          null,
                          ...preview.map((error) =>
                              h("tr", null, h("th", { scope: "row" }, String(error.line)), h("td", null, error.message))
                          ),
                          errors.length > preview.length
                              ? h("tr", null, h("th", { scope: "row" }, "…"), h("td", null, `${errors.length - preview.length} more`))
                              : null
                      )
                  )
              )
            : null,
        items.length > 0
            ? h("p", { class: "field__hint" }, "Append keeps your existing transactions. Replace removes them first.")
            : null
    );

    return dialog({
        title: "Import CSV",
        description: "Nothing is written until you choose.",
        body,
        footer: [
            h("button", { type: "button", class: "btn", onClick: onDismiss }, "Cancel"),
            h(
                "button",
                {
                    type: "button",
                    class: "btn btn--danger",
                    disabled: items.length === 0,
                    onClick: () => onConfirm("replace")
                },
                "Replace all"
            ),
            h(
                "button",
                {
                    type: "button",
                    class: "btn btn--primary",
                    disabled: items.length === 0,
                    onClick: () => onConfirm("append")
                },
                "Append"
            )
        ],
        onDismiss
    });
}

/** Generic confirmation for destructive actions. */
export function confirmDialog({ title, description, confirmLabel = "Confirm", danger = true, onConfirm, onDismiss }) {
    return dialog({
        title,
        description: "",
        body: h("p", null, description),
        footer: dialogActions({ confirmLabel, onConfirm, onCancel: onDismiss, danger }),
        onDismiss
    });
}
