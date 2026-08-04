/**
 * Dialog shell.
 *
 * A dialog is only accessible if it behaves like one: labelled by its own heading,
 * marked `aria-modal`, dismissable with Escape and by clicking the backdrop, with Tab
 * kept inside it and focus returned to the opener on close. `trapFocus` (core/dom.js)
 * handles the last two.
 */

import { h } from "../core/dom.js";
import { icon } from "./icons.js";

let sequence = 0;

/**
 * Build a modal.
 * Returns the backdrop element; mount it and call `trapFocus` on `.modal` inside it.
 */
export function dialog({ title, description = "", body, footer = null, onDismiss }) {
    sequence += 1;
    const titleId = `modal-title-${sequence}`;
    const descriptionId = description ? `modal-desc-${sequence}` : null;

    const panel = h(
        "div",
        {
            class: "modal",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": titleId,
            ...(descriptionId ? { "aria-describedby": descriptionId } : {})
        },
        h(
            "header",
            { class: "modal__header" },
            h(
                "div",
                null,
                h("h2", { class: "modal__title", id: titleId }, title),
                description ? h("p", { class: "modal__description", id: descriptionId }, description) : null
            ),
            h(
                "button",
                {
                    type: "button",
                    class: "btn btn--ghost btn--icon",
                    "aria-label": "Close dialog",
                    onClick: onDismiss
                },
                icon("close")
            )
        ),
        h("div", { class: "modal__body" }, body),
        footer ? h("div", { class: "modal__footer" }, footer) : null
    );

    const backdrop = h(
        "div",
        {
            class: "modal-backdrop",
            onClick: (event) => {
                // Only a click on the backdrop itself dismisses — not one that started inside.
                if (event.target === event.currentTarget) onDismiss();
            },
            onKeydown: (event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    onDismiss();
                }
            }
        },
        panel
    );

    return backdrop;
}

/** Cancel + confirm buttons, with the destructive action styled as such. */
export function dialogActions({ confirmLabel, onConfirm, cancelLabel = "Cancel", onCancel, danger = false, formId = null }) {
    return [
        h("button", { type: "button", class: "btn", onClick: onCancel }, cancelLabel),
        h(
            "button",
            {
                type: formId ? "submit" : "button",
                class: ["btn", danger ? "btn--danger" : "btn--primary"],
                ...(formId ? { form: formId } : {}),
                ...(onConfirm ? { onClick: onConfirm } : {})
            },
            confirmLabel
        )
    ];
}
