/**
 * Versioned persistence.
 *
 * Saved data outlives the code that wrote it. Every snapshot carries the schema
 * version it was written with, and old snapshots are upgraded on load through the
 * `migrations` table instead of being thrown away — the difference between a hobby
 * app and one someone can keep their data in.
 *
 * The storage object is injected everywhere, so the whole module is testable against
 * `createMemoryStorage()` with no browser involved.
 */

import { INIT_ACTION } from "./store.js";

export const STORAGE_KEY = "fintrack:state";
export const SCHEMA_VERSION = 3;

/**
 * Each entry upgrades data written at version N to version N + 1.
 *
 *   v1  amounts were floats ("12.50"), budgets were a `{ category: limit }` map
 *   v2  amounts became integer minor units (1250) — no more float drift
 *   v3  budgets became a list of records, settings gained an explicit locale
 */
export const migrations = {
    1(data) {
        const toMinorUnits = (value) => {
            const scaled = Number(value ?? 0) * 100;
            return scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
        };

        return {
            ...data,
            transactions: (data.transactions ?? []).map(({ amount, ...transaction }) => ({
                ...transaction,
                amountMinor: toMinorUnits(amount)
            })),
            budgets: Object.fromEntries(
                Object.entries(data.budgets ?? {}).map(([category, limit]) => [category, toMinorUnits(limit)])
            )
        };
    },

    2(data) {
        const budgets = Array.isArray(data.budgets)
            ? data.budgets
            : Object.entries(data.budgets ?? {}).map(([category, limitMinor]) => ({
                  id: `budget_${category.toLowerCase().replace(/\s+/g, "-")}`,
                  category,
                  limitMinor: Number(limitMinor) || 0
              }));

        return {
            ...data,
            budgets,
            settings: { locale: "en-US", ...(data.settings ?? {}) }
        };
    }
};

/** Run a snapshot forward to `SCHEMA_VERSION`. Throws when it cannot be upgraded. */
export function migrate(snapshot) {
    let { version, data } = snapshot;

    if (!Number.isInteger(version) || version < 1) {
        throw new Error(`Unknown schema version: ${version}`);
    }
    if (version > SCHEMA_VERSION) {
        throw new Error(
            `Snapshot was written by a newer version of FinTrack (v${version} > v${SCHEMA_VERSION})`
        );
    }

    while (version < SCHEMA_VERSION) {
        const step = migrations[version];
        if (typeof step !== "function") throw new Error(`Missing migration for v${version}`);
        data = step(data);
        version += 1;
    }

    return { version, data };
}

/** In-memory `Storage` stand-in: used by tests and when `localStorage` is unavailable. */
export function createMemoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => void map.set(key, String(value)),
        removeItem: (key) => void map.delete(key),
        clear: () => map.clear(),
        get length() {
            return map.size;
        },
        key: (index) => [...map.keys()][index] ?? null
    };
}

/**
 * `localStorage` when it actually works — Safari's private mode exposes the API but
 * throws on write, so the capability is probed rather than assumed.
 */
export function resolveStorage(candidate = globalThis.localStorage) {
    try {
        const probe = "__fintrack_probe__";
        candidate.setItem(probe, "1");
        candidate.removeItem(probe);
        return { storage: candidate, persistent: true };
    } catch {
        return { storage: createMemoryStorage(), persistent: false };
    }
}

/** Read + migrate. Returns `{ ok, data, migrated, error }` and never throws. */
export function loadState(storage, key = STORAGE_KEY) {
    let raw;
    try {
        raw = storage.getItem(key);
    } catch (error) {
        return { ok: false, data: null, migrated: false, error };
    }
    if (!raw) return { ok: false, data: null, migrated: false, error: null };

    try {
        const snapshot = JSON.parse(raw);
        if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.data?.transactions)) {
            throw new Error("Saved data is not a FinTrack snapshot");
        }

        const result = migrate(snapshot);
        return {
            ok: true,
            data: result.data,
            migrated: snapshot.version !== SCHEMA_VERSION,
            error: null
        };
    } catch (error) {
        return { ok: false, data: null, migrated: false, error };
    }
}

/** Write a snapshot. Returns `{ ok, error }`; a full quota is reported, not thrown. */
export function saveState(storage, data, key = STORAGE_KEY, now = () => new Date().toISOString()) {
    try {
        storage.setItem(key, JSON.stringify({ version: SCHEMA_VERSION, savedAt: now(), data }));
        return { ok: true, error: null };
    } catch (error) {
        return { ok: false, error };
    }
}

/**
 * Store middleware that writes the persistable slice after every action, debounced so
 * that dragging a budget slider doesn't hit `localStorage` sixty times a second.
 */
export function createPersistMiddleware({
    storage,
    key = STORAGE_KEY,
    delay = 300,
    select = (state) => state,
    onError = null
}) {
    let timer = null;
    let pending = null;

    function write() {
        timer = null;
        if (pending === null) return;

        const snapshot = pending;
        pending = null;
        const result = saveState(storage, snapshot, key);
        if (!result.ok) onError?.(result.error);
    }

    const middleware = (api) => (next) => (action) => {
        const result = next(action);
        if (action.type === INIT_ACTION.type) return result;

        pending = select(api.getState());
        if (timer === null) timer = setTimeout(write, delay);
        return result;
    };

    /** Force an immediate write — called on `beforeunload` and before data exports. */
    middleware.flush = () => {
        if (timer !== null) clearTimeout(timer);
        write();
    };

    return middleware;
}

/** Approximate bytes used by the snapshot — shown on the Settings page. */
export function measureStorage(storage, key = STORAGE_KEY) {
    try {
        const raw = storage.getItem(key);
        return raw ? new Blob([raw]).size : 0;
    } catch {
        return 0;
    }
}
