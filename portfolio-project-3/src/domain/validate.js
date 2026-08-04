/**
 * Input validation.
 *
 * Validation returns a *result object* rather than throwing: the form needs every
 * field error at once to render them inline, and the CSV importer needs to keep
 * going after a bad row instead of aborting the whole file.
 */

import { isValidISODate } from "../utils/date.js";
import { parseAmount } from "../utils/format.js";

export const TRANSACTION_TYPES = ["income", "expense"];

export const LIMITS = {
    description: 80,
    category: 40,
    notes: 200,
    amountMinor: 1_000_000_000_00 // one hundred billion units — a sane upper bound
};

/**
 * Validate raw form/CSV input for a transaction.
 * Returns `{ ok, errors, value }` where `value` is normalized and safe to store.
 */
export function validateTransaction(input = {}) {
    const errors = {};

    const description = String(input.description ?? "").trim();
    if (!description) errors.description = "Description is required.";
    else if (description.length > LIMITS.description) {
        errors.description = `Keep the description under ${LIMITS.description} characters.`;
    }

    const type = String(input.type ?? "").trim().toLowerCase();
    if (!TRANSACTION_TYPES.includes(type)) errors.type = "Choose income or expense.";

    const category = String(input.category ?? "").trim();
    if (!category) errors.category = "Category is required.";
    else if (category.length > LIMITS.category) {
        errors.category = `Keep the category under ${LIMITS.category} characters.`;
    }

    const date = String(input.date ?? "").trim();
    if (!date) errors.date = "Date is required.";
    else if (!isValidISODate(date)) errors.date = "Use a real date in YYYY-MM-DD format.";

    // Callers pass either raw user text (`amount`) or an already-parsed integer (`amountMinor`).
    const amount = Number.isInteger(input.amountMinor)
        ? { ok: true, value: input.amountMinor }
        : parseAmount(input.amount);
    if (!amount.ok) errors.amount = "Enter an amount such as 42.50.";
    else if (amount.value === 0) errors.amount = "Amount must be greater than zero.";
    else if (Math.abs(amount.value) > LIMITS.amountMinor) errors.amount = "That amount is out of range.";

    const notes = String(input.notes ?? "").trim();
    if (notes.length > LIMITS.notes) errors.notes = `Keep notes under ${LIMITS.notes} characters.`;

    const ok = Object.keys(errors).length === 0;

    return {
        ok,
        errors,
        value: ok
            ? {
                  description,
                  category,
                  type,
                  date,
                  // The sign lives in `type`; the amount is always stored positive.
                  amountMinor: Math.abs(amount.value),
                  notes
              }
            : null
    };
}

/** Validate a budget limit for one category. */
export function validateBudget(input = {}) {
    const errors = {};

    const category = String(input.category ?? "").trim();
    if (!category) errors.category = "Pick a category.";

    const limit = Number.isInteger(input.limitMinor)
        ? { ok: true, value: input.limitMinor }
        : parseAmount(input.limit);
    if (!limit.ok) errors.limit = "Enter a monthly limit such as 400.";
    else if (limit.value <= 0) errors.limit = "The limit must be greater than zero.";
    else if (limit.value > LIMITS.amountMinor) errors.limit = "That limit is out of range.";

    const ok = Object.keys(errors).length === 0;

    return {
        ok,
        errors,
        value: ok ? { category, limitMinor: limit.value } : null
    };
}

/** First error message in a result, for toasts and screen-reader announcements. */
export function firstError(result) {
    const [message] = Object.values(result.errors ?? {});
    return message ?? "";
}
