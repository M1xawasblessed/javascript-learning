/**
 * Small presentational building blocks shared by the views.
 *
 * Every one is a pure function returning a DOM node — no state, no store access. The
 * views compose them; these never reach outwards.
 */

import { h } from "../core/dom.js";
import { formatPercent } from "../utils/format.js";
import { icon } from "./icons.js";

/** A titled card. `actions` sits opposite the title. */
export function card({ title, subtitle, actions, className = "", children = [] }) {
    return h(
        "section",
        { class: ["card", className] },
        title || actions
            ? h(
                  "header",
                  { class: "card__header" },
                  h(
                      "div",
                      null,
                      title ? h("h2", { class: "card__title" }, title) : null,
                      subtitle ? h("p", { class: "card__subtitle" }, subtitle) : null
                  ),
                  actions ?? null
              )
            : null,
        ...[children].flat()
    );
}

/**
 * A stat tile: label, hero number, and an optional change note.
 *
 * The delta always carries an arrow icon and the words "vs last month" — colour is a
 * reinforcement, never the only way to tell up from down.
 */
export function statTile({ label, value, delta = null, deltaLabel = "vs last month", hint = "", invertDelta = false }) {
    let deltaNode = null;

    if (delta === null || delta === undefined) {
        deltaNode = hint ? h("span", { class: "delta delta--flat" }, hint) : null;
    } else if (delta === 0) {
        deltaNode = h("span", { class: "delta delta--flat" }, icon("check", { size: 14 }), "no change");
    } else {
        const rising = delta > 0;
        // For spending, "up" is the bad direction — hence `invertDelta`.
        const good = invertDelta ? !rising : rising;
        deltaNode = h(
            "span",
            { class: ["delta", good ? "delta--up" : "delta--down"] },
            icon(rising ? "arrowUp" : "arrowDown", { size: 14 }),
            formatPercent(Math.abs(delta), { digits: 1 })
        );
    }

    return h(
        "article",
        { class: "card stat" },
        h("h3", { class: "stat__label" }, label),
        h("p", { class: "stat__value" }, value),
        h(
            "p",
            { class: "stat__meta" },
            deltaNode,
            deltaNode && delta !== null && delta !== undefined ? ` ${deltaLabel}` : null,
            deltaNode === null && hint ? hint : null
        )
    );
}

const STATUS_ICON = { good: "check", warning: "alert", critical: "alert" };

/** Status is icon + label + colour, in that order of importance. */
export function statusPill(status, label) {
    return h(
        "span",
        { class: ["status", `status--${status}`] },
        h("span", { class: "status__icon" }, icon(STATUS_ICON[status] ?? "info", { size: 14 })),
        label
    );
}

export function progressBar(ratio, status = "good") {
    const width = Math.min(Math.max(ratio, 0), 1) * 100;
    return h(
        "div",
        { class: "progress" },
        h("div", {
            class: ["progress__bar", status !== "good" ? `progress__bar--${status}` : ""],
            style: { width: `${width}%` }
        })
    );
}

export function emptyState({ title, description, action = null, iconName = "inbox" }) {
    return h(
        "div",
        { class: "empty" },
        h("div", { class: "empty__icon" }, icon(iconName, { size: 22 })),
        h("p", { class: "empty__title" }, title),
        description ? h("p", null, description) : null,
        action
    );
}

/** A labelled form control with inline error and hint text wired up for screen readers. */
export function field({ id, label, control, error = "", hint = "" }) {
    const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");

    control.id = id;
    control.classList.add("field__control");
    if (describedBy) control.setAttribute("aria-describedby", describedBy);
    if (error) control.setAttribute("aria-invalid", "true");

    return h(
        "div",
        { class: "field" },
        h("label", { class: "field__label", for: id }, label),
        control,
        hint ? h("p", { class: "field__hint", id: `${id}-hint` }, hint) : null,
        error
            ? h("p", { class: "field__error", id: `${id}-error` }, icon("alert", { size: 13 }), error)
            : null
    );
}

export function select({ value, options, onChange, ...rest }) {
    const node = h(
        "select",
        { onChange, ...rest },
        ...options.map((option) =>
            h(
                "option",
                {
                    value: option.value,
                    selected: String(option.value) === String(value)
                },
                option.label
            )
        )
    );
    node.value = String(value);
    return node;
}

export function textInput({ value = "", onInput, ...rest }) {
    return h("input", { type: "text", value, onInput, ...rest });
}

/** A two-state control group used for theme and type switches. */
export function segmented({ value, options, onSelect, label }) {
    return h(
        "div",
        { class: "segmented", role: "group", "aria-label": label },
        ...options.map((option) =>
            h(
                "button",
                {
                    type: "button",
                    class: "segmented__option",
                    "aria-pressed": String(option.value === value),
                    onClick: () => onSelect(option.value)
                },
                option.icon ? icon(option.icon, { size: 14 }) : null,
                option.label
            )
        )
    );
}

export function badge({ label, color = null, className = "" }) {
    return h(
        "span",
        { class: ["badge", className] },
        color ? h("span", { class: "badge__dot", style: { background: color } }) : null,
        label
    );
}

/**
 * A chart figure: heading, canvas mount point, legend and a `<details>` data table.
 *
 * The table is not decoration — it is the accessible equivalent of the marks, and it
 * is what makes a low-contrast slice colour acceptable in light mode.
 */
export function chartFigure({ title, subtitle, mount, legend = null, table = null, className = "" }) {
    return h(
        "figure",
        { class: ["chart", className] },
        h(
            "figcaption",
            { class: "chart__head" },
            h(
                "div",
                null,
                h("h3", { class: "chart__title" }, title),
                subtitle ? h("p", { class: "chart__subtitle" }, subtitle) : null
            )
        ),
        mount,
        legend,
        table
            ? h(
                  "details",
                  { class: "chart__data" },
                  h("summary", null, "Show data table"),
                  table
              )
            : null
    );
}

/** Legend rows: swatch + label (+ optional value and share). */
export function chartLegend(items, { stack = false } = {}) {
    return h(
        "ul",
        { class: ["legend", stack ? "legend--stack" : ""] },
        ...items.map((item) =>
            h(
                "li",
                { class: "legend__item" },
                h("span", { class: "legend__swatch", style: { background: item.color } }),
                h("span", { class: "legend__label" }, item.label),
                item.value ? h("span", { class: "legend__value" }, item.value) : null,
                item.share ? h("span", { class: "legend__share" }, item.share) : null
            )
        )
    );
}

/** The data table that backs a chart. */
export function dataTable(headers, rows) {
    return h(
        "table",
        null,
        h("thead", null, h("tr", null, ...headers.map((header) => h("th", { scope: "col" }, header)))),
        h(
            "tbody",
            null,
            ...rows.map((row) =>
                h(
                    "tr",
                    null,
                    ...row.map((cell, index) =>
                        index === 0 ? h("th", { scope: "row" }, cell) : h("td", null, cell)
                    )
                )
            )
        )
    );
}

/** A container the chart factories mount their canvas into. */
export function chartMount() {
    return h("div", { class: "chart__canvas-wrap" });
}

export function iconButton({ iconName, label, onClick, className = "", ...rest }) {
    return h(
        "button",
        {
            type: "button",
            class: ["btn", "btn--ghost", "btn--icon", className],
            "aria-label": label,
            title: label,
            onClick,
            ...rest
        },
        icon(iconName)
    );
}
