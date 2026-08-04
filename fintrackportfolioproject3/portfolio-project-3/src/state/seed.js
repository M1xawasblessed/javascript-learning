/**
 * Demo data.
 *
 * A finance dashboard with an empty database demos badly, so first run is seeded with
 * six months of believable history. The generator is driven by a seeded PRNG, which
 * means the dataset is *deterministic*: the same seed always produces the same
 * transactions, so the numbers on the screenshots match the numbers in the tests.
 */

import { addMonths, daysInMonth, monthKey, todayISO } from "../utils/date.js";
import { createId, createRandom, randomInt, randomItem } from "../utils/id.js";
import { DEFAULT_SETTINGS } from "./reducer.js";

/** Amounts are in minor units (cents) and always positive — `type` carries the sign. */
const RECURRING = [
    { day: 1, type: "income", category: "Salary", description: "Monthly salary", min: 412_000, max: 438_000 },
    { day: 3, type: "expense", category: "Rent", description: "Apartment rent", min: 145_000, max: 145_000 },
    { day: 12, type: "expense", category: "Utilities", description: "Electricity & water", min: 6_400, max: 17_800 },
    { day: 15, type: "expense", category: "Utilities", description: "Internet & mobile", min: 4_200, max: 6_100 }
];

const VARIABLE = [
    {
        type: "expense",
        category: "Groceries",
        count: [4, 6],
        min: 3_500,
        max: 16_000,
        merchants: ["Green Market", "Corner Grocery", "Fresh Bazaar", "City Supermarket", "Farmers Market"]
    },
    {
        type: "expense",
        category: "Transport",
        count: [3, 5],
        min: 1_200,
        max: 9_000,
        merchants: ["Metro top-up", "Taxi ride", "Fuel", "Bus pass", "Bike service"]
    },
    {
        type: "expense",
        category: "Dining",
        count: [3, 7],
        min: 1_200,
        max: 8_500,
        merchants: ["Coffee & pastry", "Lunch with team", "Ramen place", "Pizza night", "Brunch"]
    },
    {
        type: "expense",
        category: "Entertainment",
        count: [1, 4],
        min: 900,
        max: 6_000,
        merchants: ["Cinema tickets", "Music streaming", "Concert", "Board game", "Football match"]
    },
    {
        type: "expense",
        category: "Health",
        count: [0, 2],
        min: 2_000,
        max: 14_000,
        merchants: ["Pharmacy", "Dentist", "Gym membership", "Eye check-up"]
    },
    {
        type: "expense",
        category: "Shopping",
        count: [1, 3],
        min: 2_500,
        max: 22_000,
        merchants: ["Running shoes", "Winter jacket", "Headphones", "Desk lamp", "Books"]
    },
    {
        type: "income",
        category: "Freelance",
        count: [0, 2],
        min: 30_000,
        max: 120_000,
        merchants: ["Landing page build", "Consulting session", "Logo animation", "Bug-fix retainer"]
    }
];

function makeTransaction({ date, type, category, description, amountMinor, notes = "" }) {
    return { id: createId("txn"), date, type, category, description, amountMinor, notes };
}

/**
 * Six *complete* months of transactions, ending with the last finished month.
 *
 * Stopping at the previous month is deliberate: a partially elapsed month would make
 * every month-over-month comparison and every budget ratio on the dashboard look
 * alarming for no reason. Real transactions the user adds today land in the current
 * month and the dashboard follows them there.
 */
export function generateTransactions({ seed = 20260804, months = 6, today = todayISO() } = {}) {
    const random = createRandom(seed);
    const endMonth = addMonths(monthKey(today), -1);
    const transactions = [];

    for (let offset = months - 1; offset >= 0; offset -= 1) {
        const month = addMonths(endMonth, -offset);
        const lastDay = daysInMonth(month);

        for (const entry of RECURRING) {
            if (entry.day > lastDay) continue;
            transactions.push(
                makeTransaction({
                    date: `${month}-${String(entry.day).padStart(2, "0")}`,
                    type: entry.type,
                    category: entry.category,
                    description: entry.description,
                    amountMinor: randomInt(random, entry.min, entry.max)
                })
            );
        }

        // A dividend lands at the start of every quarter.
        if ((Number(month.slice(5, 7)) - 1) % 3 === 0 && lastDay >= 5) {
            transactions.push(
                makeTransaction({
                    date: `${month}-05`,
                    type: "income",
                    category: "Investments",
                    description: "Index fund dividend",
                    amountMinor: randomInt(random, 8_000, 19_000)
                })
            );
        }

        for (const entry of VARIABLE) {
            const count = randomInt(random, entry.count[0], entry.count[1]);
            for (let index = 0; index < count; index += 1) {
                const day = randomInt(random, 1, lastDay);
                transactions.push(
                    makeTransaction({
                        date: `${month}-${String(day).padStart(2, "0")}`,
                        type: entry.type,
                        category: entry.category,
                        description: randomItem(random, entry.merchants),
                        amountMinor: randomInt(random, entry.min, entry.max)
                    })
                );
            }
        }
    }

    // Newest first, matching the order the reducer keeps for freshly added rows.
    return transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Limits chosen against what the generator actually spends, so the demo shows a
 * realistic mix: mostly on track, one category regularly close to the line, and one
 * that occasionally goes over.
 */
export function generateBudgets() {
    return [
        { category: "Groceries", limitMinor: 60_000 },
        { category: "Dining", limitMinor: 30_000 },
        { category: "Transport", limitMinor: 35_000 },
        { category: "Entertainment", limitMinor: 12_000 },
        { category: "Shopping", limitMinor: 25_000 }
    ].map((budget) => ({ id: createId("budget"), ...budget }));
}

/** A complete persistable state for a first run (or for "Reset to demo data"). */
export function createDemoData(options = {}) {
    return {
        transactions: generateTransactions(options),
        budgets: generateBudgets(),
        settings: { ...DEFAULT_SETTINGS }
    };
}

/** An empty but valid dataset, for "Start from scratch". */
export function createEmptyData() {
    return { transactions: [], budgets: [], settings: { ...DEFAULT_SETTINGS } };
}
