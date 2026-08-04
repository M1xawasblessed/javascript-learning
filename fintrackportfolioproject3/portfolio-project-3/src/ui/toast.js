/**
 * Toasts.
 *
 * The region is an `aria-live="polite"` landmark declared in the HTML, so a screen
 * reader announces "Transaction saved" without the focus being yanked anywhere.
 */

import { h } from "../core/dom.js";
import { icon } from "./icons.js";

const ICONS = { success: "check", error: "alert", info: "info" };
const DEFAULT_DURATION = 3600;

let region = null;

function getRegion() {
    if (region && document.contains(region)) return region;

    region = document.getElementById("toast-region");
    if (!region) {
        region = h("div", { id: "toast-region", class: "toast-region", role: "status", "aria-live": "polite" });
        document.body.append(region);
    }
    return region;
}

/** Show a toast. Returns a function that dismisses it early. */
export function showToast({ title, detail = "", variant = "info", duration = DEFAULT_DURATION }) {
    const node = h(
        "div",
        { class: ["toast", `toast--${variant}`] },
        icon(ICONS[variant] ?? "info", { size: 18 }),
        h(
            "div",
            { class: "toast__text" },
            h("p", { class: "toast__title" }, title),
            detail ? h("p", { class: "toast__detail" }, detail) : null
        )
    );

    getRegion().append(node);

    const timer = setTimeout(() => node.remove(), duration);
    return () => {
        clearTimeout(timer);
        node.remove();
    };
}

export const toastSuccess = (title, detail) => showToast({ title, detail, variant: "success" });
export const toastError = (title, detail) => showToast({ title, detail, variant: "error", duration: 5200 });
export const toastInfo = (title, detail) => showToast({ title, detail, variant: "info" });
