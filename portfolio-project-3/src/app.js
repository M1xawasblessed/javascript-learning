/**
 * Application wiring.
 *
 * This is the only module that knows about all the others: it builds the store,
 * restores (and migrates) saved data, starts the router, and keeps three things in
 * sync with state — the current view, the open dialog, and the theme.
 *
 * Rendering strategy: a view is created once per navigation and then updated. Updates
 * re-render the view's DOM wholesale, which is fast enough at this scale and removes a
 * whole class of "the UI disagrees with the state" bugs. `preserveFocus` puts the
 * caret back afterwards, so a debounced search box survives its own re-render.
 */

import { h, mount, preserveFocus, trapFocus } from "./core/dom.js";
import {
    createPersistMiddleware,
    loadState,
    resolveStorage,
    STORAGE_KEY
} from "./core/persistence.js";
import { createRouter } from "./core/router.js";
import { createStore } from "./core/store.js";
import {
    addTransaction,
    closeModal,
    importTransactions,
    openModal,
    removeBudget,
    removeTransaction,
    replaceData,
    setBudget,
    updateSettings,
    updateTransaction
} from "./state/actions.js";
import { persistableState, rootReducer } from "./state/reducer.js";
import { selectModal, selectTheme, selectUsedCategories } from "./state/selectors.js";
import { createDemoData, createEmptyData } from "./state/seed.js";
import { THEME_CHANGE_EVENT } from "./ui/charts/base.js";
import { budgetDialog, confirmDialog, importDialog, transactionDialog } from "./ui/dialogs.js";
import { icon } from "./ui/icons.js";
import { toastError, toastInfo, toastSuccess } from "./ui/toast.js";
import { createBudgetsView } from "./ui/views/budgets.js";
import { createDashboardView } from "./ui/views/dashboard.js";
import { createSettingsView } from "./ui/views/settings.js";
import { createTransactionsView } from "./ui/views/transactions.js";

const ROUTES = [
    { path: "/", name: "dashboard", label: "Dashboard", icon: "dashboard", create: createDashboardView },
    { path: "/transactions", name: "transactions", label: "Transactions", icon: "list", create: createTransactionsView },
    { path: "/budgets", name: "budgets", label: "Budgets", icon: "target", create: createBudgetsView },
    { path: "/settings", name: "settings", label: "Settings", icon: "settings", create: createSettingsView }
];

const THEME_CYCLE = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: "monitor", light: "sun", dark: "moon" };
const SHORTCUT_ROUTES = { d: "/", t: "/transactions", b: "/budgets", s: "/settings" };

export function startApp(root = document) {
    const elements = {
        nav: root.querySelector("#nav"),
        title: root.querySelector("#view-title"),
        subtitle: root.querySelector("#view-subtitle"),
        actions: root.querySelector("#topbar-actions"),
        content: root.querySelector("#main-content"),
        modalRoot: root.querySelector("#modal-root")
    };

    // ---- Store ---------------------------------------------------------------
    const { storage, persistent } = resolveStorage();
    const restored = loadState(storage, STORAGE_KEY);
    const preloaded = restored.ok
        ? { ...restored.data, ui: { modal: null } }
        : { ...createDemoData(), ui: { modal: null } };

    const persist = createPersistMiddleware({
        storage,
        key: STORAGE_KEY,
        select: persistableState,
        onError: () => toastError("Could not save", "This browser's storage is full or blocked.")
    });

    const store = createStore(rootReducer, preloaded, [persist]);
    const router = createRouter({ routes: ROUTES, fallback: "/" });
    const context = { store, router, storage, persistent };

    // ---- Theme ---------------------------------------------------------------
    store.watch(
        selectTheme,
        (theme) => {
            if (theme === "system") delete document.documentElement.dataset.theme;
            else document.documentElement.dataset.theme = theme;
            // Canvas charts can't observe CSS, so tell them the palette moved.
            document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
            renderTopbarActions();
        },
        { immediate: true }
    );

    // ---- Navigation ----------------------------------------------------------
    function renderNav(activeName) {
        mount(
            elements.nav,
            ...ROUTES.map((route) =>
                h(
                    "a",
                    {
                        class: "nav__link",
                        href: `#${route.path}`,
                        ...(route.name === activeName ? { "aria-current": "page" } : {})
                    },
                    icon(route.icon, { size: 17 }),
                    route.label
                )
            )
        );
    }

    function renderTopbarActions() {
        const theme = selectTheme(store.getState());
        const next = THEME_CYCLE[theme];

        mount(
            elements.actions,
            h(
                "button",
                {
                    type: "button",
                    class: "btn btn--primary",
                    onClick: () => store.dispatch(openModal("transaction"))
                },
                icon("plus"),
                "Add transaction"
            ),
            h(
                "button",
                {
                    type: "button",
                    class: "btn btn--ghost btn--icon",
                    "aria-label": `Theme: ${theme}. Switch to ${next}.`,
                    title: `Theme: ${theme}`,
                    onClick: () => store.dispatch(updateSettings({ theme: next }))
                },
                icon(THEME_ICON[theme])
            )
        );
    }

    // ---- View lifecycle ------------------------------------------------------
    let view = null;
    let viewName = null;

    function renderView(state, location) {
        if (!location) return;

        if (location.route.name !== viewName) {
            view?.destroy();
            view = location.route.create(context);
            viewName = location.route.name;

            mount(elements.content, view.node);
            elements.title.textContent = view.title;
            elements.subtitle.textContent = view.subtitle ?? "";
            renderNav(viewName);
            // Send focus to the heading so a keyboard user lands in the new section.
            elements.title.focus({ preventScroll: true });
        }

        view.update(state, location);
    }

    // ---- Dialogs -------------------------------------------------------------
    let openDialogNode = null;
    let releaseFocusTrap = null;
    let renderedModal = null;

    function dismiss() {
        store.dispatch(closeModal());
    }

    function buildDialog(modal, state) {
        const props = modal.props ?? {};

        switch (modal.name) {
            case "transaction": {
                const transaction = props.id ? state.transactions.find((entry) => entry.id === props.id) : null;
                return transactionDialog({
                    transaction,
                    usedCategories: selectUsedCategories(state),
                    onDismiss: dismiss,
                    onSubmit: (value) => {
                        if (transaction) {
                            store.dispatch(updateTransaction(transaction.id, value));
                            toastSuccess("Transaction updated");
                        } else {
                            store.dispatch(addTransaction(value));
                            toastSuccess("Transaction added", value.description);
                        }
                    }
                });
            }

            case "budget": {
                const budget = props.id ? state.budgets.find((entry) => entry.id === props.id) : null;
                return budgetDialog({
                    budget,
                    categories: props.categories ?? [],
                    onDismiss: dismiss,
                    onSubmit: (value) => {
                        store.dispatch(setBudget(value));
                        toastSuccess("Budget saved", `${value.category} is now capped monthly.`);
                    }
                });
            }

            case "import":
                return importDialog({
                    items: props.items ?? [],
                    errors: props.errors ?? [],
                    onDismiss: dismiss,
                    onConfirm: (mode) => {
                        store.dispatch(importTransactions(props.items ?? [], mode));
                        store.dispatch(closeModal());
                        toastSuccess(
                            `Imported ${props.items.length} transaction${props.items.length === 1 ? "" : "s"}`,
                            mode === "replace" ? "Previous transactions were replaced." : "Added to your existing data."
                        );
                    }
                });

            case "confirm":
                return confirmDialog({
                    title: props.title ?? "Are you sure?",
                    description: props.description ?? "",
                    confirmLabel: props.confirmLabel ?? "Confirm",
                    onDismiss: dismiss,
                    onConfirm: () => runIntent(props)
                });

            default:
                return null;
        }
    }

    function runIntent(props) {
        switch (props.intent) {
            case "delete-transaction":
                store.dispatch(removeTransaction(props.id));
                toastInfo("Transaction deleted");
                break;
            case "delete-budget":
                store.dispatch(removeBudget(props.id));
                toastInfo("Budget removed");
                break;
            case "reset-demo":
                store.dispatch(replaceData(createDemoData()));
                toastSuccess("Demo data restored");
                break;
            case "clear-all":
                store.dispatch(replaceData(createEmptyData()));
                toastInfo("All data deleted");
                break;
            default:
                store.dispatch(closeModal());
        }
    }

    function syncDialog(state) {
        const modal = selectModal(state);
        if (modal === renderedModal) return;
        renderedModal = modal;

        releaseFocusTrap?.();
        releaseFocusTrap = null;
        openDialogNode?.remove();
        openDialogNode = null;

        if (!modal) return;

        const node = buildDialog(modal, state);
        if (!node) return;

        elements.modalRoot.append(node);
        openDialogNode = node;
        releaseFocusTrap = trapFocus(node.querySelector(".modal"));
    }

    // ---- Keyboard shortcuts --------------------------------------------------
    let pendingGoTo = 0;

    function onKeydown(event) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const target = event.target;
        const isTyping =
            target instanceof HTMLElement &&
            (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

        if (isTyping || selectModal(store.getState())) return;

        // "g" then a letter jumps between sections, the way GitHub and Gmail do it.
        if (Date.now() - pendingGoTo < 900 && SHORTCUT_ROUTES[event.key]) {
            pendingGoTo = 0;
            router.navigate(SHORTCUT_ROUTES[event.key]);
            return;
        }

        if (event.key === "g") {
            pendingGoTo = Date.now();
            return;
        }

        if (event.key === "n") {
            event.preventDefault();
            store.dispatch(openModal("transaction"));
        } else if (event.key === "/") {
            event.preventDefault();
            if (router.current().route.name !== "transactions") router.navigate("/transactions");
            requestAnimationFrame(() => document.getElementById("txn-search")?.focus());
        }
    }

    // ---- Start ---------------------------------------------------------------
    renderTopbarActions();

    router.subscribe((location) => {
        preserveFocus(() => renderView(store.getState(), location));
    });

    store.subscribe((state) => {
        preserveFocus(() => renderView(state, router.current()));
        syncDialog(state);
    });

    document.addEventListener("keydown", onKeydown);
    globalThis.addEventListener("beforeunload", () => persist.flush());

    router.start();
    syncDialog(store.getState());

    if (restored.migrated) {
        toastInfo("Saved data upgraded", "Your ledger was migrated to the current format.");
    }
    if (!persistent) {
        toastError("Changes will not be saved", "This browser blocks localStorage for this page.");
    }

    return { store, router, context };
}
