/**
 * Hash router.
 *
 * `#/transactions?type=expense&page=2` is parsed into `{ path, query }`, matched
 * against a route table (with `:param` support) and reported to the app. The hash is
 * used rather than the History API so the app also works when opened from a static
 * file server with no rewrite rules.
 *
 * `parseHash`, `buildHash` and `matchRoute` are pure and exported so the routing
 * logic can be tested without a DOM.
 */

/** `"#/budgets?month=2026-08"` -> `{ path: "/budgets", query: { month: "2026-08" } }` */
export function parseHash(hash) {
    const raw = String(hash ?? "").replace(/^#/, "");
    const [rawPath = "", rawQuery = ""] = raw.split("?");

    let path = decodeURI(rawPath) || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    const query = {};
    for (const [key, value] of new URLSearchParams(rawQuery)) query[key] = value;

    return { path, query };
}

/** The inverse of `parseHash`; empty values are dropped so the URL stays readable. */
export function buildHash(path, query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === null || value === undefined || value === "" || value === "all") continue;
        params.set(key, String(value));
    }
    const search = params.toString();
    return `#${path}${search ? `?${search}` : ""}`;
}

/**
 * Match one route pattern against a path.
 * Returns the extracted params, or `null` when the pattern does not apply.
 */
export function matchRoute(pattern, path) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let index = 0; index < patternParts.length; index += 1) {
        const expected = patternParts[index];
        const actual = pathParts[index];

        if (expected.startsWith(":")) {
            params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
            return null;
        }
    }
    return params;
}

/** Find the first route whose pattern matches, or `null`. */
export function resolveRoute(routes, path) {
    for (const route of routes) {
        const params = matchRoute(route.path, path);
        if (params) return { route, params };
    }
    return null;
}

export function createRouter({ routes, fallback = "/", target = globalThis }) {
    const listeners = new Set();
    let current = null;

    function read() {
        const { path, query } = parseHash(target.location?.hash ?? "");
        const matched = resolveRoute(routes, path);

        if (!matched) {
            return { ...resolveRoute(routes, fallback), path: fallback, query, notFound: true };
        }
        return { ...matched, path, query, notFound: false };
    }

    function handleChange() {
        current = read();
        for (const listener of [...listeners]) listener(current);
    }

    return {
        /** Begin listening and emit the current location once. */
        start() {
            target.addEventListener("hashchange", handleChange);
            if (!target.location?.hash) {
                target.location.replace(`${target.location.pathname}${target.location.search}${buildHash(fallback)}`);
            }
            handleChange();
            return this;
        },
        stop() {
            target.removeEventListener("hashchange", handleChange);
            listeners.clear();
        },
        /** Current match: `{ route, params, path, query, notFound }`. */
        current() {
            return current ?? (current = read());
        },
        /** Navigate, optionally replacing the entry so filter changes don't spam history. */
        navigate(path, { query = {}, replace = false } = {}) {
            const hash = buildHash(path, query);
            if (hash === target.location.hash) return;

            if (replace) {
                target.location.replace(`${target.location.pathname}${target.location.search}${hash}`);
                handleChange();
            } else {
                target.location.hash = hash;
            }
        },
        /** Update the query string of the current route in place. */
        setQuery(query, { replace = true } = {}) {
            this.navigate(this.current().path, { query, replace });
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}
