import test from "node:test";
import assert from "node:assert/strict";

import {
    addTransaction,
    closeModal,
    importTransactions,
    openModal,
    removeBudget,
    removeTransaction,
    replaceData,
    setBudget,
    updateSettings,
    updateTransaction
} from "../src/state/actions.js";
import { DEFAULT_SETTINGS, initialState, persistableState, rootReducer } from "../src/state/reducer.js";

const txn = (overrides = {}) => ({
    description: "Coffee",
    category: "Dining",
    type: "expense",
    date: "2026-08-04",
    amountMinor: 450,
    notes: "",
    ...overrides
});

test("the reducer returns a valid default state", () => {
    const state = rootReducer(undefined, { type: "@@store/init" });
    assert.deepEqual(state, initialState);
    assert.deepEqual(state.settings, DEFAULT_SETTINGS);
});

test("an unknown action returns the identical state object", () => {
    const state = rootReducer(undefined, { type: "@@store/init" });
    assert.equal(rootReducer(state, { type: "nothing/here" }), state, "identity is preserved for cheap change checks");
});

test("adding a transaction puts it first and gives it an id", () => {
    let state = rootReducer(undefined, { type: "@@store/init" });
    state = rootReducer(state, addTransaction(txn({ description: "Older" })));
    state = rootReducer(state, addTransaction(txn({ description: "Newer" })));

    assert.equal(state.transactions.length, 2);
    assert.equal(state.transactions[0].description, "Newer");
    assert.match(state.transactions[0].id, /^txn_/);
    assert.notEqual(state.transactions[0].id, state.transactions[1].id);
});

test("updating a transaction cannot change its id", () => {
    let state = rootReducer(undefined, addTransaction(txn()));
    const { id } = state.transactions[0];

    state = rootReducer(state, updateTransaction(id, { amountMinor: 999, id: "hijacked" }));

    assert.equal(state.transactions[0].id, id);
    assert.equal(state.transactions[0].amountMinor, 999);
    assert.equal(state.transactions[0].description, "Coffee", "untouched fields survive");
});

test("removing a transaction leaves the others alone", () => {
    let state = rootReducer(undefined, addTransaction(txn({ description: "A" })));
    state = rootReducer(state, addTransaction(txn({ description: "B" })));
    const target = state.transactions[0].id;

    state = rootReducer(state, removeTransaction(target));

    assert.deepEqual(state.transactions.map((t) => t.description), ["A"]);
    assert.equal(rootReducer(state, removeTransaction("missing")).transactions.length, 1);
});

test("import appends by default and replaces on request", () => {
    let state = rootReducer(undefined, addTransaction(txn({ description: "Existing" })));

    const appended = rootReducer(state, importTransactions([{ id: "i1", ...txn({ description: "Imported" }) }]));
    assert.deepEqual(appended.transactions.map((t) => t.description), ["Imported", "Existing"]);

    const replaced = rootReducer(state, importTransactions([{ id: "i1", ...txn() }], "replace"));
    assert.equal(replaced.transactions.length, 1);
});

test("setting a budget upserts by category", () => {
    let state = rootReducer(undefined, setBudget({ category: "Dining", limitMinor: 20_000 }));
    assert.equal(state.budgets.length, 1);

    const firstId = state.budgets[0].id;
    state = rootReducer(state, setBudget({ category: "Dining", limitMinor: 25_000 }));

    assert.equal(state.budgets.length, 1, "the same category is edited, not duplicated");
    assert.equal(state.budgets[0].id, firstId, "the record keeps its identity");
    assert.equal(state.budgets[0].limitMinor, 25_000);

    state = rootReducer(state, setBudget({ category: "Rent", limitMinor: 150_000 }));
    assert.equal(state.budgets.length, 2);

    state = rootReducer(state, removeBudget(firstId));
    assert.deepEqual(state.budgets.map((budget) => budget.category), ["Rent"]);
});

test("settings merge rather than replace", () => {
    const state = rootReducer(undefined, updateSettings({ theme: "dark" }));
    assert.equal(state.settings.theme, "dark");
    assert.equal(state.settings.currency, DEFAULT_SETTINGS.currency);
});

test("modals open, close, and close themselves once their data changes", () => {
    let state = rootReducer(undefined, openModal("transaction", { id: "t1" }));
    assert.deepEqual(state.ui.modal, { name: "transaction", props: { id: "t1" } });

    assert.equal(rootReducer(state, closeModal()).ui.modal, null);

    state = rootReducer(state, addTransaction(txn()));
    assert.equal(state.ui.modal, null, "a successful save dismisses the dialog");
});

test("replaceData swaps the persisted slices and keeps defaults for what is missing", () => {
    const state = rootReducer(
        rootReducer(undefined, openModal("settings")),
        replaceData({ transactions: [{ id: "t1", ...txn() }] })
    );

    assert.equal(state.transactions.length, 1);
    assert.deepEqual(state.budgets, []);
    assert.deepEqual(state.settings, DEFAULT_SETTINGS);
    assert.equal(state.ui.modal, null);
});

test("replaceData tolerates a malformed payload", () => {
    const state = rootReducer(undefined, replaceData({ transactions: "nope", budgets: null }));
    assert.deepEqual(state.transactions, []);
    assert.deepEqual(state.budgets, []);
});

test("persistableState excludes ephemeral UI", () => {
    const state = rootReducer(undefined, openModal("transaction"));
    const persisted = persistableState(state);

    assert.deepEqual(Object.keys(persisted).sort(), ["budgets", "settings", "transactions"]);
    assert.equal("ui" in persisted, false);
});
