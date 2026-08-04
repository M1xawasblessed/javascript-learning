/**
 * Action types and creators.
 *
 * Views never build action objects by hand — they call a creator. That keeps the
 * payload shape in one place and makes every dispatch greppable.
 */

import { createId } from "../utils/id.js";

export const ActionTypes = Object.freeze({
    TRANSACTION_ADD: "transaction/add",
    TRANSACTION_UPDATE: "transaction/update",
    TRANSACTION_REMOVE: "transaction/remove",
    TRANSACTIONS_IMPORT: "transactions/import",
    BUDGET_SET: "budget/set",
    BUDGET_REMOVE: "budget/remove",
    SETTINGS_UPDATE: "settings/update",
    MODAL_OPEN: "ui/modal/open",
    MODAL_CLOSE: "ui/modal/close",
    DATA_REPLACE: "data/replace"
});

/** `value` comes straight from `validateTransaction`. */
export const addTransaction = (value) => ({
    type: ActionTypes.TRANSACTION_ADD,
    payload: { id: createId("txn"), ...value }
});

export const updateTransaction = (id, changes) => ({
    type: ActionTypes.TRANSACTION_UPDATE,
    payload: { id, changes }
});

export const removeTransaction = (id) => ({
    type: ActionTypes.TRANSACTION_REMOVE,
    payload: { id }
});

/** Bulk insert from a CSV import; `mode` decides whether existing rows survive. */
export const importTransactions = (items, mode = "append") => ({
    type: ActionTypes.TRANSACTIONS_IMPORT,
    payload: { items, mode }
});

/** Creates or updates the budget for a category — one budget per category. */
export const setBudget = (value) => ({
    type: ActionTypes.BUDGET_SET,
    payload: { id: createId("budget"), ...value }
});

export const removeBudget = (id) => ({
    type: ActionTypes.BUDGET_REMOVE,
    payload: { id }
});

export const updateSettings = (changes) => ({
    type: ActionTypes.SETTINGS_UPDATE,
    payload: changes
});

export const openModal = (name, props = {}) => ({
    type: ActionTypes.MODAL_OPEN,
    payload: { name, props }
});

export const closeModal = () => ({ type: ActionTypes.MODAL_CLOSE, payload: null });

/** Replace the persisted slices wholesale (JSON restore, reseed, clear). */
export const replaceData = (data) => ({
    type: ActionTypes.DATA_REPLACE,
    payload: data
});
