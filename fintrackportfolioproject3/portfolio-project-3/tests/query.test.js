import test from "node:test";
import assert from "node:assert/strict";

import {
    DEFAULT_QUERY,
    MAX_PAGE_SIZE,
    filterTransactions,
    isFiltered,
    normalizeQuery,
    pageWindow,
    paginate,
    queryTransactions,
    sortTransactions
} from "../src/domain/query.js";

const transactions = [
    { id: "a", date: "2026-06-01", type: "income", category: "Salary", description: "Monthly salary", amountMinor: 400_000, notes: "" },
    { id: "b", date: "2026-06-03", type: "expense", category: "Rent", description: "Apartment rent", amountMinor: 145_000, notes: "flat 12" },
    { id: "c", date: "2026-06-08", type: "expense", category: "Groceries", description: "Green Market", amountMinor: 12_000, notes: "" },
    { id: "d", date: "2026-07-02", type: "expense", category: "Dining", description: "Coffee & pastry", amountMinor: 1_200, notes: "" },
    { id: "e", date: "2026-07-19", type: "expense", category: "Groceries", description: "Fresh Bazaar", amountMinor: 8_000, notes: "weekly" }
];

test("normalizeQuery repairs anything the URL can produce", () => {
    assert.deepEqual(normalizeQuery(), DEFAULT_QUERY);

    const normalized = normalizeQuery({
        search: "  rent  ",
        type: "banana",
        sort: "id",
        dir: "sideways",
        page: "3",
        pageSize: "999"
    });

    assert.equal(normalized.search, "rent");
    assert.equal(normalized.type, "all");
    assert.equal(normalized.sort, "date");
    assert.equal(normalized.dir, "desc");
    assert.equal(normalized.page, 3);
    assert.equal(normalized.pageSize, MAX_PAGE_SIZE, "an oversized page size is clamped, not discarded");
    assert.equal(normalizeQuery({ pageSize: "abc" }).pageSize, DEFAULT_QUERY.pageSize);
    assert.equal(normalizeQuery({ pageSize: 25 }).pageSize, 25);
    assert.equal(normalizeQuery({ page: -4 }).page, 1);
    assert.equal(normalizeQuery({ page: 2.7 }).page, 2);
});

test("isFiltered drives the clear-filters affordance", () => {
    assert.equal(isFiltered(DEFAULT_QUERY), false);
    assert.equal(isFiltered({ sort: "amount", dir: "asc", page: 3 }), false, "sorting is not filtering");
    assert.equal(isFiltered({ search: "rent" }), true);
    assert.equal(isFiltered({ category: "Dining" }), true);
    assert.equal(isFiltered({ from: "2026-07-01" }), true);
});

test("search covers description, category and notes, case-insensitively", () => {
    assert.deepEqual(filterTransactions(transactions, { search: "RENT" }).map((t) => t.id), ["b"]);
    assert.deepEqual(filterTransactions(transactions, { search: "groceries" }).map((t) => t.id), ["c", "e"]);
    assert.deepEqual(filterTransactions(transactions, { search: "flat 12" }).map((t) => t.id), ["b"]);
    assert.deepEqual(filterTransactions(transactions, { search: "nothing here" }), []);
});

test("filters combine, and dates are inclusive on both ends", () => {
    assert.deepEqual(filterTransactions(transactions, { type: "income" }).map((t) => t.id), ["a"]);
    assert.deepEqual(
        filterTransactions(transactions, { from: "2026-06-03", to: "2026-07-02" }).map((t) => t.id),
        ["b", "c", "d"]
    );
    assert.deepEqual(
        filterTransactions(transactions, { type: "expense", category: "Groceries", from: "2026-07-01" }).map((t) => t.id),
        ["e"]
    );
});

test("sorting is stable and reversible", () => {
    assert.deepEqual(sortTransactions(transactions, "date", "asc").map((t) => t.id), ["a", "b", "c", "d", "e"]);
    assert.deepEqual(sortTransactions(transactions, "date", "desc").map((t) => t.id), ["e", "d", "c", "b", "a"]);
    assert.deepEqual(sortTransactions(transactions, "amount", "asc").map((t) => t.id), ["d", "e", "c", "b", "a"]);
    assert.deepEqual(sortTransactions(transactions, "description", "asc")[0].description, "Apartment rent");

    const sameDay = [
        { id: "z", date: "2026-06-01", amountMinor: 1, category: "A", description: "A" },
        { id: "y", date: "2026-06-01", amountMinor: 1, category: "A", description: "A" }
    ];
    assert.deepEqual(sortTransactions(sameDay, "date", "desc").map((t) => t.id), ["y", "z"], "ties break on id");
    assert.deepEqual(sortTransactions(sameDay, "date", "desc").map((t) => t.id), ["y", "z"], "and stay put on re-sort");
});

test("sortTransactions does not mutate its input", () => {
    const input = [...transactions];
    sortTransactions(input, "amount", "asc");
    assert.deepEqual(input.map((t) => t.id), ["a", "b", "c", "d", "e"]);
});

test("paginate clamps out-of-range pages and reports a 1-based window", () => {
    const items = Array.from({ length: 23 }, (_, index) => index);

    const first = paginate(items, 1, 10);
    assert.deepEqual(first.items, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual([first.from, first.to, first.pageCount, first.total], [1, 10, 3, 23]);

    const last = paginate(items, 3, 10);
    assert.equal(last.items.length, 3);
    assert.deepEqual([last.from, last.to], [21, 23]);

    assert.equal(paginate(items, 99, 10).page, 3, "past the end clamps to the last page");
    assert.equal(paginate(items, 0, 10).page, 1);

    const empty = paginate([], 1, 10);
    assert.deepEqual([empty.items, empty.from, empty.to, empty.pageCount], [[], 0, 0, 1]);
});

test("queryTransactions runs filter -> sort -> paginate", () => {
    const result = queryTransactions(transactions, { type: "expense", sort: "amount", dir: "desc", pageSize: 2, page: 2 });

    assert.deepEqual(result.items.map((t) => t.id), ["e", "d"]);
    assert.equal(result.total, 4);
    assert.equal(result.pageCount, 2);
    assert.equal(result.filtered.length, 4, "the full filtered set is returned for exports");
    assert.deepEqual(result.query, normalizeQuery({ type: "expense", sort: "amount", dir: "desc", pageSize: 2, page: 2 }));
});

test("pageWindow inserts ellipsis gaps", () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
    assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(5, 10), [1, null, 4, 5, 6, null, 10]);
    assert.deepEqual(pageWindow(2, 10), [1, 2, 3, null, 10]);
    assert.deepEqual(pageWindow(10, 10), [1, null, 9, 10]);
});
