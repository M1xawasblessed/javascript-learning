/**
 * Identifier generation.
 *
 * `crypto.randomUUID` is used where available (every modern browser on a secure
 * origin, and Node 19+). The fallback keeps the app usable on `file://` and on old
 * WebViews where `crypto` is missing entirely.
 */

let counter = 0;

export function createId(prefix = "id") {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;

    counter += 1;
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`;
}

/**
 * Deterministic 32-bit PRNG (mulberry32).
 *
 * Used by the demo-data seeder so every visitor sees the same believable dataset,
 * and so the seeding logic can be unit tested.
 */
export function createRandom(seed = 1) {
    let state = seed >>> 0;

    return function random() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Integer in `[min, max]` drawn from a `createRandom` generator. */
export function randomInt(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
}

/** Uniformly pick one item from a non-empty array. */
export function randomItem(random, items) {
    return items[Math.floor(random() * items.length)];
}
