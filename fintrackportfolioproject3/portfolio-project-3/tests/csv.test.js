import test from "node:test";
import assert from "node:assert/strict";

import {
    csvToTransactions,
    escapeCSVValue,
    mapHeader,
    parseCSV,
    stringifyCSV,
    transactionsToCSV
} from "../src/domain/csv.js";

test("parseCSV reads plain rows", () => {
    assert.deepEqual(parseCSV("a,b,c\n1,2,3"), [
        ["a", "b", "c"],
        ["1", "2", "3"]
    ]);
});

test("parseCSV handles quotes, escaped quotes and embedded separators", () => {
    assert.deepEqual(parseCSV('name,note\n"Doe, John","He said ""hi"""'), [
        ["name", "note"],
        ["Doe, John", 'He said "hi"']
    ]);
});

test("parseCSV survives CRLF, embedded newlines, BOM and a trailing newline", () => {
    assert.deepEqual(parseCSV("a,b\r\n1,2\r\n"), [
        ["a", "b"],
        ["1", "2"]
    ]);
    assert.deepEqual(parseCSV('a\n"line one\nline two"'), [["a"], ["line one\nline two"]]);
    assert.deepEqual(parseCSV("﻿a,b\n1,2")[0], ["a", "b"]);
    assert.deepEqual(parseCSV(""), []);
    assert.deepEqual(parseCSV("a,,c"), [["a", "", "c"]], "empty fields are preserved");
});

test("escapeCSVValue quotes only when it has to", () => {
    assert.equal(escapeCSVValue("plain"), "plain");
    assert.equal(escapeCSVValue("with,comma"), '"with,comma"');
    assert.equal(escapeCSVValue('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCSVValue("line\nbreak"), '"line\nbreak"');
    assert.equal(escapeCSVValue(null), "");
});

test("escapeCSVValue neutralises spreadsheet formulas", () => {
    assert.equal(escapeCSVValue("=SUM(A1:A9)"), "'=SUM(A1:A9)");
    assert.equal(escapeCSVValue("+1-800-EVIL"), "'+1-800-EVIL");
    assert.equal(escapeCSVValue("@import"), "'@import");
    assert.equal(escapeCSVValue("=danger", { guardFormulas: false }), "=danger");
});

test("stringifyCSV writes CRLF rows", () => {
    assert.equal(stringifyCSV([["a", "b"], ["1", "2"]]), "a,b\r\n1,2");
});

test("transactions round-trip through CSV without losing anything", () => {
    const transactions = [
        {
            id: "t1",
            date: "2026-08-04",
            description: 'Coffee, "the good one"',
            category: "Dining",
            type: "expense",
            amountMinor: 1_250,
            notes: "with a colleague"
        },
        {
            id: "t2",
            date: "2026-08-01",
            description: "Monthly salary",
            category: "Salary",
            type: "income",
            amountMinor: 420_000,
            notes: ""
        }
    ];

    const { items, errors } = csvToTransactions(transactionsToCSV(transactions));

    assert.deepEqual(errors, []);
    assert.equal(items.length, 2);
    assert.deepEqual(
        items.map(({ id, ...rest }) => rest),
        transactions.map(({ id, ...rest }) => rest)
    );
});

test("mapHeader accepts common aliases from other tools", () => {
    assert.deepEqual(mapHeader(["Date", "Memo", "Amount"]), { date: 0, description: 1, amount: 2 });
    assert.deepEqual(mapHeader(["posted date", "payee", "value", "tag"]), {
        date: 0,
        description: 1,
        amount: 2,
        category: 3
    });
    assert.deepEqual(mapHeader(["nothing", "useful"]), {});
});

test("csvToTransactions infers the type from the sign when no type column exists", () => {
    const { items, errors } = csvToTransactions(
        ["date,description,amount", "2026-08-01,Salary,4200.00", "2026-08-02,Rent,-1450.00"].join("\n")
    );

    assert.deepEqual(errors, []);
    assert.deepEqual(items.map((item) => [item.type, item.amountMinor]), [
        ["income", 420_000],
        ["expense", 145_000]
    ]);
    assert.equal(items[1].category, "Uncategorized", "a missing category gets a placeholder");
});

test("csvToTransactions understands debit/credit wording", () => {
    const { items } = csvToTransactions(
        ["date,description,amount,type", "2026-08-01,Refund,20.00,credit", "2026-08-02,Card,15.00,debit"].join("\n")
    );

    assert.deepEqual(items.map((item) => item.type), ["income", "expense"]);
});

test("csvToTransactions reports bad rows by line and keeps the good ones", () => {
    const { items, errors } = csvToTransactions(
        [
            "date,description,category,type,amount",
            "2026-08-01,Salary,Salary,income,4200.00",
            "2026-02-30,Impossible date,Rent,expense,10.00",
            "2026-08-03,Zero,Dining,expense,0",
            "2026-08-04,Not a number,Dining,expense,abc",
            "2026-08-05,Fine,Dining,expense,12.50"
        ].join("\n")
    );

    assert.deepEqual(items.map((item) => item.description), ["Salary", "Fine"]);
    assert.deepEqual(errors.map((error) => error.line), [3, 4, 5]);
    assert.match(errors[0].message, /real date/);
    assert.match(errors[1].message, /greater than zero/);
});

test("csvToTransactions rejects a file with no usable header", () => {
    assert.deepEqual(csvToTransactions(""), { items: [], errors: [{ line: 0, message: "The file is empty." }] });

    const noHeader = csvToTransactions("first,second\n1,2");
    assert.equal(noHeader.items.length, 0);
    assert.match(noHeader.errors[0].message, /date and an amount/);
});

test("blank lines in the middle of a file are skipped", () => {
    const { items, errors } = csvToTransactions("date,description,amount\n\n2026-08-01,Salary,10.00\n\n");
    assert.equal(items.length, 1);
    assert.deepEqual(errors, []);
});
