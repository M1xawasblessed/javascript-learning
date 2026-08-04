/**
 * The category registry.
 *
 * Chart colour is assigned from a **fixed eight-slot categorical order** and is bound
 * to the category itself, never to its rank in the current view. That is the rule that
 * keeps "Groceries" the same colour in January and in June, and stops a filter that
 * removes one slice from repainting the ones that remain.
 *
 * Categories outside the registry (anything the user or a CSV import invents) render in
 * the neutral slot; they are always accompanied by a legend entry and a data table, so
 * identity never depends on colour alone.
 */

/** Slot order matters: slot N maps to the `--series-N` custom property. */
export const EXPENSE_CATEGORIES = [
    "Rent",
    "Groceries",
    "Transport",
    "Dining",
    "Utilities",
    "Health",
    "Entertainment",
    "Shopping"
];

export const INCOME_CATEGORIES = ["Salary", "Freelance", "Investments"];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const SLOTS = new Map(EXPENSE_CATEGORIES.map((category, index) => [category, index + 1]));

/** Permanent chart slot for a category: `1`–`8`, or `0` for "neutral / not registered". */
export function categorySlot(category) {
    return SLOTS.get(category) ?? 0;
}

/** Categories offered in the pickers: the registry plus anything already in the data. */
export function categoriesForType(type, used = []) {
    const base = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const extra = used.filter((category) => !ALL_CATEGORIES.includes(category)).sort((a, b) => a.localeCompare(b));
    return [...base, ...extra];
}
