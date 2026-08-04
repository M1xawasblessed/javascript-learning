/**
 * Filtering, sorting and pagination for the transactions table.
 *
 * The whole query lives in one plain object so it can be round-tripped through the
 * URL (`#/transactions?search=rent&sort=amount`) and restored on reload. Every
 * function here is pure — the table view just renders whatever comes back.
 */

export const SORT_FIELDS = ["date", "amount", "category", "description"];

/** Sizes offered in the UI; the URL may carry any size up to `MAX_PAGE_SIZE`. */
export const PAGE_SIZES = [10, 25, 50];
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_QUERY = Object.freeze({
    search: "",
    type: "all",
    category: "all",
    from: "",
    to: "",
    sort: "date",
    dir: "desc",
    page: 1,
    pageSize: 10
});

/** Coerce anything (URL strings, user input, `undefined`) into a valid query object. */
export function normalizeQuery(partial = {}) {
    const merged = { ...DEFAULT_QUERY, ...partial };
    const pageSize = Number(merged.pageSize);
    const page = Number(merged.page);

    return {
        search: String(merged.search ?? "").trim(),
        type: ["all", "income", "expense"].includes(merged.type) ? merged.type : "all",
        category: String(merged.category || "all"),
        from: String(merged.from ?? ""),
        to: String(merged.to ?? ""),
        sort: SORT_FIELDS.includes(merged.sort) ? merged.sort : "date",
        dir: merged.dir === "asc" ? "asc" : "desc",
        page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
        // Clamped rather than whitelisted: a hand-edited `?pageSize=5000` should render
        // a sane page, not silently snap back to the default.
        pageSize: Number.isFinite(pageSize) && pageSize >= 1
            ? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
            : DEFAULT_QUERY.pageSize
    };
}

/** `true` when a query would narrow the list at all — drives the "Clear filters" button. */
export function isFiltered(query) {
    const normalized = normalizeQuery(query);
    return (
        normalized.search !== "" ||
        normalized.type !== "all" ||
        normalized.category !== "all" ||
        normalized.from !== "" ||
        normalized.to !== ""
    );
}

function matchesSearch(transaction, needle) {
    if (!needle) return true;
    const haystack = `${transaction.description} ${transaction.category} ${transaction.notes ?? ""}`;
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function filterTransactions(transactions = [], query = {}) {
    const { search, type, category, from, to } = normalizeQuery(query);

    return transactions.filter((transaction) => {
        if (type !== "all" && transaction.type !== type) return false;
        if (category !== "all" && transaction.category !== category) return false;
        // ISO dates compare correctly as strings — no Date objects, no timezones.
        if (from && transaction.date < from) return false;
        if (to && transaction.date > to) return false;
        return matchesSearch(transaction, search);
    });
}

const COMPARATORS = {
    date: (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
    amount: (a, b) => a.amountMinor - b.amountMinor,
    category: (a, b) => a.category.localeCompare(b.category),
    description: (a, b) => a.description.localeCompare(b.description)
};

/** Sort a copy. Ties break on `id` so repeated renders never reshuffle equal rows. */
export function sortTransactions(transactions = [], sort = "date", dir = "desc") {
    const compare = COMPARATORS[sort] ?? COMPARATORS.date;
    const direction = dir === "asc" ? 1 : -1;

    return [...transactions].sort((a, b) => {
        const result = compare(a, b);
        return result !== 0 ? result * direction : String(a.id).localeCompare(String(b.id));
    });
}

/** Slice one page out of a list, clamping the page number into range. */
export function paginate(items = [], page = 1, pageSize = 10) {
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);

    return {
        items: items.slice(start, end),
        total,
        page: safePage,
        pageCount,
        // 1-based, inclusive — "Showing 11–20 of 84".
        from: total === 0 ? 0 : start + 1,
        to: end
    };
}

/** Filter -> sort -> paginate, in one call. */
export function queryTransactions(transactions = [], partialQuery = {}) {
    const query = normalizeQuery(partialQuery);
    const filtered = filterTransactions(transactions, query);
    const sorted = sortTransactions(filtered, query.sort, query.dir);
    const page = paginate(sorted, query.page, query.pageSize);

    return { ...page, query, filtered: sorted };
}

/** Page numbers to render, with `null` marking an ellipsis gap. */
export function pageWindow(page, pageCount, span = 1) {
    if (pageCount <= 1) return [1];

    const pages = new Set([1, pageCount]);
    for (let offset = -span; offset <= span; offset += 1) {
        const candidate = page + offset;
        if (candidate >= 1 && candidate <= pageCount) pages.add(candidate);
    }

    const ordered = [...pages].sort((a, b) => a - b);
    const result = [];

    ordered.forEach((value, index) => {
        if (index > 0 && value - ordered[index - 1] > 1) result.push(null);
        result.push(value);
    });

    return result;
}
