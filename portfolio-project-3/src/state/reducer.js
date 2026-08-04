/**
 * The root reducer.
 *
 * Split into one small reducer per slice and recombined at the bottom — the same
 * shape `combineReducers` produces, written out so the wiring is visible. Every
 * branch returns a *new* object; nothing is mutated, which is what lets subscribers
 * compare with `Object.is` and skip work.
 */

import { ActionTypes } from "./actions.js";

export const DEFAULT_SETTINGS = Object.freeze({
    currency: "USD",
    locale: "en-US",
    theme: "system" // "system" | "light" | "dark"
});

export const initialState = Object.freeze({
    transactions: [],
    budgets: [],
    settings: DEFAULT_SETTINGS,
    ui: { modal: null }
});

function transactionsReducer(state = [], action) {
    switch (action.type) {
        case ActionTypes.TRANSACTION_ADD:
            return [action.payload, ...state];

        case ActionTypes.TRANSACTION_UPDATE:
            return state.map((transaction) =>
                transaction.id === action.payload.id
                    ? { ...transaction, ...action.payload.changes, id: transaction.id }
                    : transaction
            );

        case ActionTypes.TRANSACTION_REMOVE:
            return state.filter((transaction) => transaction.id !== action.payload.id);

        case ActionTypes.TRANSACTIONS_IMPORT:
            return action.payload.mode === "replace"
                ? [...action.payload.items]
                : [...action.payload.items, ...state];

        default:
            return state;
    }
}

function budgetsReducer(state = [], action) {
    switch (action.type) {
        case ActionTypes.BUDGET_SET: {
            const existing = state.find((budget) => budget.category === action.payload.category);
            // One budget per category: setting an existing category edits it in place.
            return existing
                ? state.map((budget) =>
                      budget.id === existing.id ? { ...budget, limitMinor: action.payload.limitMinor } : budget
                  )
                : [...state, action.payload];
        }

        case ActionTypes.BUDGET_REMOVE:
            return state.filter((budget) => budget.id !== action.payload.id);

        default:
            return state;
    }
}

function settingsReducer(state = DEFAULT_SETTINGS, action) {
    switch (action.type) {
        case ActionTypes.SETTINGS_UPDATE:
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

function uiReducer(state = initialState.ui, action) {
    switch (action.type) {
        case ActionTypes.MODAL_OPEN:
            return { ...state, modal: action.payload };
        case ActionTypes.MODAL_CLOSE:
            return { ...state, modal: null };
        // Any data-level change closes an open dialog: the dialog was about that data.
        case ActionTypes.TRANSACTION_ADD:
        case ActionTypes.TRANSACTION_UPDATE:
        case ActionTypes.TRANSACTION_REMOVE:
        case ActionTypes.BUDGET_SET:
        case ActionTypes.BUDGET_REMOVE:
        case ActionTypes.DATA_REPLACE:
            return state.modal ? { ...state, modal: null } : state;
        default:
            return state;
    }
}

export function rootReducer(state = initialState, action = {}) {
    if (action.type === ActionTypes.DATA_REPLACE) {
        const data = action.payload ?? {};
        return {
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            budgets: Array.isArray(data.budgets) ? data.budgets : [],
            settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
            ui: uiReducer(state.ui, action)
        };
    }

    const next = {
        transactions: transactionsReducer(state.transactions, action),
        budgets: budgetsReducer(state.budgets, action),
        settings: settingsReducer(state.settings, action),
        ui: uiReducer(state.ui, action)
    };

    // Return the previous object when nothing changed, so `Object.is` checks hold.
    const unchanged = Object.keys(next).every((key) => next[key] === state[key]);
    return unchanged ? state : next;
}

/** The slice that gets persisted — `ui` is deliberately excluded. */
export function persistableState(state) {
    return {
        transactions: state.transactions,
        budgets: state.budgets,
        settings: state.settings
    };
}
