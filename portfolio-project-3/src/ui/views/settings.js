/**
 * Settings: appearance, regional formatting, and the data itself.
 *
 * Everything destructive routes through a confirmation dialog, and every export is
 * generated in the browser — the data never leaves the machine it was entered on.
 */

import { h, mount } from "../../core/dom.js";
import { downloadTextFile, transactionsToCSV } from "../../domain/csv.js";
import { SCHEMA_VERSION, measureStorage } from "../../core/persistence.js";
import { openModal, updateSettings } from "../../state/actions.js";
import { persistableState } from "../../state/reducer.js";
import { selectBudgets, selectSettings, selectTransactions } from "../../state/selectors.js";
import { formatDate } from "../../utils/format.js";
import { latestDate } from "../../domain/analytics.js";
import { card, segmented, select } from "../components.js";
import { icon } from "../icons.js";
import { toastInfo } from "../toast.js";

const CURRENCIES = [
    { value: "USD", label: "US dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "Pound sterling (GBP)" },
    { value: "AZN", label: "Azerbaijani manat (AZN)" },
    { value: "TRY", label: "Turkish lira (TRY)" },
    { value: "JPY", label: "Japanese yen (JPY)" }
];

const LOCALES = [
    { value: "en-US", label: "English (United States)" },
    { value: "en-GB", label: "English (United Kingdom)" },
    { value: "de-DE", label: "German (Germany)" },
    { value: "fr-FR", label: "French (France)" },
    { value: "tr-TR", label: "Turkish (Türkiye)" },
    { value: "az-AZ", label: "Azerbaijani (Azerbaijan)" }
];

const SHORTCUTS = [
    ["N", "New transaction"],
    ["/", "Focus the search box"],
    ["Esc", "Close the open dialog"],
    ["G then D / T / B", "Go to Dashboard, Transactions, Budgets"]
];

function settingRow({ label, hint, control }) {
    return h(
        "div",
        { class: "setting-row" },
        h("div", null, h("p", { class: "setting-row__label" }, label), hint ? h("p", { class: "setting-row__hint" }, hint) : null),
        control
    );
}

export function createSettingsView({ store, storage, persistent }) {
    const grid = h("div", { class: "settings-grid" });
    const node = h("div", { class: "view" }, grid);

    function update(state) {
        const settings = selectSettings(state);
        const transactions = selectTransactions(state);
        const budgets = selectBudgets(state);
        const bytes = measureStorage(storage);

        const appearance = card({
            title: "Appearance",
            subtitle: "Charts and UI follow the same palette",
            children: [
                settingRow({
                    label: "Theme",
                    hint: "System follows your operating system setting.",
                    control: segmented({
                        label: "Theme",
                        value: settings.theme,
                        options: [
                            { value: "system", label: "System", icon: "monitor" },
                            { value: "light", label: "Light", icon: "sun" },
                            { value: "dark", label: "Dark", icon: "moon" }
                        ],
                        onSelect: (theme) => store.dispatch(updateSettings({ theme }))
                    })
                })
            ]
        });

        const regional = card({
            title: "Regional formatting",
            subtitle: "Applies to every amount and date in the app",
            children: [
                settingRow({
                    label: "Currency",
                    hint: "Amounts are stored as integer minor units and formatted on display.",
                    control: select({
                        value: settings.currency,
                        "aria-label": "Currency",
                        class: "input",
                        style: { width: "auto" },
                        options: CURRENCIES,
                        onChange: (event) => store.dispatch(updateSettings({ currency: event.currentTarget.value }))
                    })
                }),
                settingRow({
                    label: "Locale",
                    hint: "Decides separators, date order and month names.",
                    control: select({
                        value: settings.locale,
                        "aria-label": "Locale",
                        class: "input",
                        style: { width: "auto" },
                        options: LOCALES,
                        onChange: (event) => store.dispatch(updateSettings({ locale: event.currentTarget.value }))
                    })
                })
            ]
        });

        const data = card({
            title: "Your data",
            subtitle: `${transactions.length} transactions · ${budgets.length} budgets`,
            children: [
                settingRow({
                    label: "Export",
                    hint: "CSV for spreadsheets, JSON for a complete backup including budgets and settings.",
                    control: h(
                        "div",
                        { class: "btn-row" },
                        h(
                            "button",
                            {
                                type: "button",
                                class: "btn btn--sm",
                                disabled: transactions.length === 0,
                                onClick: () => {
                                    downloadTextFile("fintrack-transactions.csv", transactionsToCSV(transactions));
                                    toastInfo("CSV exported");
                                }
                            },
                            icon("download", { size: 14 }),
                            "CSV"
                        ),
                        h(
                            "button",
                            {
                                type: "button",
                                class: "btn btn--sm",
                                onClick: () => {
                                    const snapshot = {
                                        version: SCHEMA_VERSION,
                                        savedAt: new Date().toISOString(),
                                        data: persistableState(state)
                                    };
                                    downloadTextFile(
                                        "fintrack-backup.json",
                                        JSON.stringify(snapshot, null, 2),
                                        "application/json"
                                    );
                                    toastInfo("Backup exported");
                                }
                            },
                            icon("download", { size: 14 }),
                            "JSON"
                        )
                    )
                }),
                settingRow({
                    label: "Reset to demo data",
                    hint: "Replaces everything with the seeded six-month sample.",
                    control: h(
                        "button",
                        {
                            type: "button",
                            class: "btn btn--sm",
                            onClick: () =>
                                store.dispatch(
                                    openModal("confirm", {
                                        intent: "reset-demo",
                                        title: "Reset to demo data?",
                                        description:
                                            "Your current transactions and budgets are replaced by the sample dataset. Export a backup first if you want to keep them.",
                                        confirmLabel: "Reset"
                                    })
                                )
                        },
                        icon("refresh", { size: 14 }),
                        "Reset"
                    )
                }),
                settingRow({
                    label: "Delete everything",
                    hint: "Clears local storage and starts from an empty ledger.",
                    control: h(
                        "button",
                        {
                            type: "button",
                            class: "btn btn--sm btn--danger",
                            onClick: () =>
                                store.dispatch(
                                    openModal("confirm", {
                                        intent: "clear-all",
                                        title: "Delete all data?",
                                        description:
                                            "Every transaction, budget and preference stored in this browser is removed. This cannot be undone.",
                                        confirmLabel: "Delete everything"
                                    })
                                )
                        },
                        icon("trash", { size: 14 }),
                        "Delete"
                    )
                })
            ]
        });

        const storageCard = card({
            title: "Storage",
            subtitle: persistent ? "Saved in this browser's localStorage" : "In-memory only — this browser blocks storage",
            children: [
                settingRow({
                    label: "Schema version",
                    hint: "Older snapshots are migrated forward automatically on load.",
                    control: h("span", { class: "badge" }, `v${SCHEMA_VERSION}`)
                }),
                settingRow({
                    label: "Space used",
                    hint: "localStorage gives a site roughly 5 MB.",
                    control: h("span", { class: "badge tabular" }, `${(bytes / 1024).toFixed(1)} KB`)
                }),
                settingRow({
                    label: "Newest transaction",
                    hint: "",
                    control: h(
                        "span",
                        { class: "badge tabular" },
                        transactions.length > 0 ? formatDate(latestDate(transactions), { locale: settings.locale }) : "—"
                    )
                })
            ]
        });

        const shortcuts = card({
            title: "Keyboard shortcuts",
            children: [
                h(
                    "div",
                    null,
                    ...SHORTCUTS.map(([keys, description]) =>
                        settingRow({ label: description, control: h("span", { class: "badge" }, keys) })
                    )
                )
            ]
        });

        const about = card({
            title: "About this build",
            subtitle: "Vanilla JavaScript, zero dependencies",
            children: [
                h(
                    "p",
                    { class: "setting-row__hint", style: { maxWidth: "none" } },
                    "FinTrack is built from ES modules with no framework and no build step: a reducer-based store with " +
                        "middleware, a hash router, versioned localStorage with migrations, and charts drawn on a canvas. " +
                        "Money is stored as integer minor units, and the analytics, query, CSV and validation layers are " +
                        "pure functions covered by unit tests."
                )
            ]
        });

        mount(grid, appearance, regional, data, storageCard, shortcuts, about);
    }

    return {
        node,
        title: "Settings",
        subtitle: "Appearance, formatting and data management",
        update,
        destroy() {}
    };
}
