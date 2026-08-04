import test from "node:test";
import assert from "node:assert/strict";

import {
    createMemoryStorage,
    createPersistMiddleware,
    loadState,
    measureStorage,
    migrate,
    resolveStorage,
    saveState,
    SCHEMA_VERSION,
    STORAGE_KEY
} from "../src/core/persistence.js";
import { createStore } from "../src/core/store.js";

const v1Snapshot = {
    version: 1,
    data: {
        transactions: [
            { id: "t1", date: "2026-01-05", description: "Salary", category: "Salary", type: "income", amount: 4200 },
            { id: "t2", date: "2026-01-06", description: "Rent", category: "Rent", type: "expense", amount: 1450.5 }
        ],
        budgets: { Groceries: 400, Dining: 120.25 },
        settings: { currency: "USD", theme: "dark" }
    }
};

test("migrate upgrades a v1 snapshot all the way to the current schema", () => {
    const { version, data } = migrate(v1Snapshot);

    assert.equal(version, SCHEMA_VERSION);
    assert.deepEqual(
        data.transactions.map((transaction) => transaction.amountMinor),
        [420_000, 145_050]
    );
    assert.equal("amount" in data.transactions[0], false, "the float field is dropped");

    assert.deepEqual(data.budgets, [
        { id: "budget_groceries", category: "Groceries", limitMinor: 40_000 },
        { id: "budget_dining", category: "Dining", limitMinor: 12_025 }
    ]);

    assert.equal(data.settings.locale, "en-US", "v3 adds an explicit locale");
    assert.equal(data.settings.theme, "dark", "existing settings survive the migration");
});

test("migrate is a no-op at the current version", () => {
    const current = { version: SCHEMA_VERSION, data: { transactions: [], budgets: [], settings: {} } };
    assert.deepEqual(migrate(current).data, current.data);
});

test("migrate refuses snapshots from the future and from nowhere", () => {
    assert.throws(() => migrate({ version: SCHEMA_VERSION + 1, data: {} }), /newer version/);
    assert.throws(() => migrate({ version: 0, data: {} }), /Unknown schema version/);
    assert.throws(() => migrate({ version: "1", data: {} }), /Unknown schema version/);
});

test("saveState and loadState round-trip", () => {
    const storage = createMemoryStorage();
    const data = { transactions: [{ id: "t1", amountMinor: 100 }], budgets: [], settings: { currency: "EUR" } };

    assert.deepEqual(saveState(storage, data), { ok: true, error: null });

    const loaded = loadState(storage);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.migrated, false);
    assert.deepEqual(loaded.data, data);
});

test("loadState reports migrated snapshots so the UI can mention it", () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(v1Snapshot) });
    const loaded = loadState(storage);

    assert.equal(loaded.ok, true);
    assert.equal(loaded.migrated, true);
    assert.equal(loaded.data.transactions[0].amountMinor, 420_000);
});

test("loadState never throws on missing or corrupt data", () => {
    assert.deepEqual(loadState(createMemoryStorage()), { ok: false, data: null, migrated: false, error: null });

    const corrupt = createMemoryStorage({ [STORAGE_KEY]: "{not json" });
    assert.equal(loadState(corrupt).ok, false);

    const foreign = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, data: { hello: true } }) });
    assert.equal(loadState(foreign).ok, false);

    const hostile = {
        getItem() {
            throw new Error("SecurityError");
        }
    };
    assert.equal(loadState(hostile).ok, false);
});

test("saveState reports a failing quota instead of throwing", () => {
    const full = {
        setItem() {
            throw new Error("QuotaExceededError");
        }
    };
    const result = saveState(full, { transactions: [] });

    assert.equal(result.ok, false);
    assert.match(result.error.message, /Quota/);
});

test("resolveStorage falls back to memory when writes are blocked", () => {
    const blocked = {
        setItem() {
            throw new Error("private mode");
        },
        getItem: () => null,
        removeItem() {}
    };

    const { storage, persistent } = resolveStorage(blocked);
    assert.equal(persistent, false);

    storage.setItem("a", "1");
    assert.equal(storage.getItem("a"), "1", "the fallback still behaves like Storage");
});

test("the persist middleware debounces writes and can be flushed", async () => {
    const storage = createMemoryStorage();
    const persist = createPersistMiddleware({ storage, delay: 5, select: (state) => state });
    const store = createStore((state = { value: 0 }, action) => (action.type === "inc" ? { value: state.value + 1 } : state), undefined, [persist]);

    store.dispatch({ type: "inc" });
    store.dispatch({ type: "inc" });
    assert.equal(storage.getItem(STORAGE_KEY), null, "nothing is written synchronously");

    await new Promise((resolve) => setTimeout(resolve, 20));

    const written = JSON.parse(storage.getItem(STORAGE_KEY));
    assert.equal(written.version, SCHEMA_VERSION);
    assert.deepEqual(written.data, { value: 2 }, "only the final state is written");

    store.dispatch({ type: "inc" });
    persist.flush();
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).data, { value: 3 });
});

test("the init action alone does not trigger a write", async () => {
    const storage = createMemoryStorage();
    const persist = createPersistMiddleware({ storage, delay: 1 });
    createStore((state = {}) => state, undefined, [persist]);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("measureStorage reports zero for an empty key", () => {
    const storage = createMemoryStorage();
    assert.equal(measureStorage(storage), 0);

    saveState(storage, { transactions: [] });
    assert.ok(measureStorage(storage) > 0);
});
