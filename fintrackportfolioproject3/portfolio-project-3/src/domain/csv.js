/**
 * CSV import and export (RFC 4180 shaped, no library).
 *
 * The parser is a small state machine rather than `text.split(",")`, because real
 * bank exports contain quoted fields with commas, escaped quotes (`""`) and CRLF
 * line endings — all of which `split` gets wrong.
 */

import { createId } from "../utils/id.js";
import { fromMinor, parseAmount } from "../utils/format.js";
import { validateTransaction } from "./validate.js";

export const EXPORT_COLUMNS = ["date", "description", "category", "type", "amount", "notes"];

/** Header aliases so exports from other tools import without hand-editing. */
const HEADER_ALIASES = {
    date: ["date", "transaction date", "posted", "posted date", "when"],
    description: ["description", "details", "memo", "payee", "name", "narrative"],
    category: ["category", "tag", "group"],
    type: ["type", "direction", "kind"],
    amount: ["amount", "value", "sum", "total"],
    notes: ["notes", "note", "comment", "reference"]
};

/**
 * Parse CSV text into a matrix of strings.
 * Handles quoted fields, `""` escapes, embedded newlines, CRLF and a trailing newline.
 */
export function parseCSV(text, delimiter = ",") {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let hasContent = false;

    const source = String(text ?? "").replace(/^﻿/, ""); // strip a UTF-8 BOM

    const endField = () => {
        row.push(field);
        field = "";
        hasContent = true;
    };
    const endRow = () => {
        endField();
        rows.push(row);
        row = [];
        hasContent = false;
    };

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (inQuotes) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    field += '"';
                    index += 1; // consume the escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            endField();
        } else if (char === "\n") {
            endRow();
        } else if (char === "\r") {
            if (source[index + 1] === "\n") index += 1;
            endRow();
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0 || hasContent) endRow();

    return rows;
}

/**
 * Quote a value for CSV output.
 *
 * Values starting with `=`, `+`, `-` or `@` are prefixed with a single quote: a
 * spreadsheet would otherwise treat an imported description as a formula, which is a
 * genuine injection vector in exported data.
 */
export function escapeCSVValue(value, { guardFormulas = true } = {}) {
    let text = value === null || value === undefined ? "" : String(value);

    if (guardFormulas && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;

    return text;
}

/** Serialize a matrix of values back into CSV text (CRLF line endings, per the RFC). */
export function stringifyCSV(rows, { guardFormulas = true } = {}) {
    return rows
        .map((row) => row.map((value) => escapeCSVValue(value, { guardFormulas })).join(","))
        .join("\r\n");
}

/** Transactions -> CSV text, with a header row. Amounts are written in major units. */
export function transactionsToCSV(transactions = []) {
    const rows = [
        EXPORT_COLUMNS,
        ...transactions.map((transaction) => [
            transaction.date,
            transaction.description,
            transaction.category,
            transaction.type,
            fromMinor(transaction.amountMinor).toFixed(2),
            transaction.notes ?? ""
        ])
    ];

    return stringifyCSV(rows);
}

/** Map a header row onto canonical column names, tolerating case and aliases. */
export function mapHeader(headerRow = []) {
    const mapping = {};

    headerRow.forEach((rawName, index) => {
        const name = String(rawName ?? "").trim().toLowerCase();
        for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.includes(name) && mapping[canonical] === undefined) {
                mapping[canonical] = index;
                break;
            }
        }
    });

    return mapping;
}

/**
 * CSV text -> validated transactions.
 *
 * Returns every valid row plus a per-row error list, so an import of 200 rows with
 * three typos still lands 197 transactions and tells the user exactly what failed.
 */
export function csvToTransactions(text) {
    const rows = parseCSV(text).filter((row) => row.some((cell) => String(cell).trim() !== ""));

    if (rows.length === 0) {
        return { items: [], errors: [{ line: 0, message: "The file is empty." }] };
    }

    const header = mapHeader(rows[0]);
    if (header.date === undefined || header.amount === undefined) {
        return {
            items: [],
            errors: [
                {
                    line: 1,
                    message: "Header row must include at least a date and an amount column."
                }
            ]
        };
    }

    const items = [];
    const errors = [];

    rows.slice(1).forEach((row, offset) => {
        const line = offset + 2; // 1-based, and the header occupies line 1
        const cell = (key) => (header[key] === undefined ? "" : String(row[header[key]] ?? "").trim());

        const rawAmount = cell("amount");
        const parsed = parseAmount(rawAmount);
        // A leading minus in a bank export means "money out" when no type column exists.
        const inferredType = parsed.ok && parsed.value < 0 ? "expense" : "income";
        const rawType = cell("type").toLowerCase();
        const type = ["income", "expense"].includes(rawType)
            ? rawType
            : ["debit", "withdrawal", "out"].includes(rawType)
              ? "expense"
              : ["credit", "deposit", "in"].includes(rawType)
                ? "income"
                : inferredType;

        const result = validateTransaction({
            date: cell("date"),
            description: cell("description") || "Imported transaction",
            category: cell("category") || "Uncategorized",
            notes: cell("notes"),
            amount: rawAmount,
            type
        });

        if (!result.ok) {
            const [message] = Object.values(result.errors);
            errors.push({ line, message });
            return;
        }

        items.push({ id: createId("txn"), ...result.value });
    });

    return { items, errors };
}

/** Trigger a browser download for generated text (CSV or JSON). */
export function downloadTextFile(filename, text, mimeType = "text/csv;charset=utf-8") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();

    // Revoking immediately can cancel the download in Safari; one frame is enough.
    requestAnimationFrame(() => URL.revokeObjectURL(url));
}
